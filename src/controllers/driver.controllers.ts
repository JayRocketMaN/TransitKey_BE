import { Request, Response } from "express";
import { DriverService, DriverInput } from "../services/driver.services.js";
import { ParkService } from "../services/park.services.js"; 

/**
 * Add a new driver to the operator's company (Creates Auth + Profile + Code)
 */
export const addDriver = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      full_name,             
      email, 
      phone, 
      phone_number, 
      license, 
      license_number,
      license_type,
      bus_plate_number,
      bus_type,
      vehicle_class,
      years_of_experience 
    } = req.body;

    const phoneValue = phone ?? phone_number;
    if (!phoneValue) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Capture the name variation accurately matching NOT NULL rules
    const driverFullName = full_name ?? name;
    if (!driverFullName || !email) {
      return res.status(400).json({ error: "Driver name and email are required to create their account." });
    }

    // Strict validation check for mixed-case and type Enums
    const validBusTypes = ['BRT(Bus Rapid Transit)', 'Danfo', 'Luxury Coach', 'Mini Bus', 'Shuttle'];
    if (bus_type && !validBusTypes.includes(bus_type)) {
      return res.status(400).json({ 
        error: `Invalid bus_type. Must be one of: ${validBusTypes.join(', ')}` 
      });
    }

    const validLicenseTypes = ['Commercial Driver License', 'Heavy Duty License', 'Public Transport License'];
    if (license_type && !validLicenseTypes.includes(license_type)) {
      return res.status(400).json({ 
        error: `Invalid license_type. Must be one of: ${validLicenseTypes.join(', ')}` 
      });
    }

    const operatorId = req.user?.id; 
    if (!operatorId) {
      return res.status(401).json({ error: "Unauthorized: No operator found" });
    }

    //Verify driver uniqueness metrics
    const { data: driverExist } = await DriverService.findDriverByPhone(phoneValue);
    if (driverExist) {
      return res.status(400).json({ error: "A driver with this phone number already exists." });
    }

    //Fetch company ownership contexts
    const { data: parkData } = await DriverService.getParkByOperatorId(operatorId);
    if (!parkData) {
      return res.status(404).json({ error: "No park found for this operator. Please register your park first." });
    }

    console.log(`Onboarding driver [${email}] under company: ${parkData.id}`);

    // Structuring the operator context explicitly so ParkService receives 'company_id' correctly
    const operatorContext = {
      id: operatorId,
      company_id: parkData.id
    };

    // EXECUTION HANDSHAKE: Call ParkService method to generate user row + profile row + 6-digit code atomically
    const activationCode = await ParkService.createDriverWithProfile(
      operatorContext, 
      {
        email,
        full_name: driverFullName,
        phone_number: phoneValue,
        bus_plate_number,
        bus_type,
        license_number: license || license_number,
        license_type,
        vehicle_class,
        years_of_experience
      }
    );

    //Return the code back directly to Postman
    return res.status(201).json({
      message: "Driver added successfully and authentication staging account generated.",
      activation_code: activationCode
    });

  } catch (error: any) {
    console.error("Controller Driver Insertion Crash:", error.message);
    
    // Explicit clean messaging for check constraint failures (like invalid emails)
    if (error.message?.includes('chk_valid_email')) {
      return res.status(400).json({ error: "Invalid email format. Please check the structure of your email address." });
    }
    
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

/**
 * List all drivers belonging to the operator's company
 */
export const getDriver = async (req: Request, res: Response) => {
  try {
    const operatorId = req.user?.id;
    if (!operatorId) return res.status(401).json({ error: "Unauthorized" });

    const { data: park, error: parkError } = await DriverService.getParkByOperatorId(operatorId);
    if (parkError || !park) return res.status(404).json({ error: "Company not found" });

    const { data: drivers, error: driversError } = await DriverService.getDriversByPark(park.id);
    if (driversError) return res.status(500).json({ error: driversError.message });

    return res.status(200).json({ drivers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Edit driver details
 */
export const editDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const operatorId = req.user?.id;

    if (!operatorId) return res.status(401).json({ error: "Unauthorized" });

    //Fetch operator's park
    const { data: park } = await DriverService.getParkByOperatorId(operatorId);
    if (!park) return res.status(404).json({ error: "Company not found" });

    //Fetch existing driver FIRST to verify ownership before making any changes
    const { data: existingDriver, error: fetchError } = await DriverService.getDriverById(id as string);
    if (fetchError || !existingDriver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Strict ownership verification check
    if (existingDriver.park_id !== park.id) {
      return res.status(403).json({ error: "Forbidden: Access Denied" });
    }

    //Extract and normalize allowed update parameters from req.body
    const { name, full_name, phone, phone_number, bus_type, email, license_number, status } = req.body;
    
    const updateData: any = {};

    // Handle names flexibly
    if (full_name) updateData.full_name = full_name;
    else if (name) updateData.full_name = name;

    // Handle phones flexibly
    if (phone_number) updateData.phone_number = phone_number;
    else if (phone) updateData.phone_number = phone;

    // Map other common mutable driver fields explicitly
    if (email) updateData.email = email;
    if (license_number) updateData.license_number = license_number;
    if (status) updateData.status = status;

    //Validate Enum parameters cleanly
    const validBusTypes = ['BRT(Bus Rapid Transit)', 'Danfo', 'Luxury Coach', 'Mini Bus', 'Shuttle'];
    if (bus_type) {
      if (!validBusTypes.includes(bus_type)) {
        return res.status(400).json({ error: `Invalid bus_type string value.` });
      }
      updateData.bus_type = bus_type;
    }

    // Prevent executing an empty update query
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid update fields provided." });
    }

    //Execute the update securely
    const { data: updatedDriver, error: updateError } = await DriverService.updateDriver(id as string, updateData);

    if (updateError) {
      if (updateError.message?.includes('chk_valid_email')) {
        return res.status(400).json({ error: "Invalid email format update request." });
      }
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      message: "Driver updated successfully",
      data: updatedDriver
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get a single driver profile by ID
 */
export const getDriverById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const operatorId = req.user?.id;

    if (!operatorId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch the company/park ID belonging to this admin operator
    const { data: park } = await DriverService.getParkByOperatorId(operatorId);
    if (!park) return res.status(404).json({ error: "Company context not found." });

    // Fetch the specific driver row
    const { data: driver, error: driverError } = await DriverService.getDriverById(id as string);
    
    if (driverError) return res.status(500).json({ error: driverError.message });
    if (!driver) return res.status(404).json({ error: "Driver profile not found." });

    // Security Matrix: Verify the driver belongs to this admin's fleet
    if (driver.park_id !== park.id) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to view this driver." });
    }

    return res.status(200).json({ driver });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
