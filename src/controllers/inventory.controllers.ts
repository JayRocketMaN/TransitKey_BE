import { Request, Response } from "express";
import { VehicleService } from "../services/inventory.services.js";

// Global constant defining allowed vehicle lifecycle statuses to clear type validation leaks
const ALLOWED_VEHICLE_STATUSES = ["active", "inactive", "maintenance"];

export class VehicleController {
  /**
   * Registers a brand-new vehicle asset under the operator's park,
   * automatically computing a serialized sequential BUS-ID tag with strict input sanitation.
   */
  static async addVehicle(req: Request, res: Response) {
    try {
      const { plate_number, capacity, vehicle_model, status } = req.body;
      const operatorId = req.user?.id;
      const companyId = req.user?.company_id;

      if (!operatorId) return res.status(401).json({ message: "Unauthorized account session context." });
      if (!plate_number) return res.status(400).json({ error: "plate_number is a required field." });

      // Strict backend validation check for vehicle status values
      if (status) {
        const sanitizedStatus = String(status).toLowerCase().trim();
        if (!ALLOWED_VEHICLE_STATUSES.includes(sanitizedStatus)) {
          return res.status(400).json({
            success: false,
            error: `Validation Mismatch: '${status}' is not a recognized vehicle status type. Use one of: ${ALLOWED_VEHICLE_STATUSES.join(", ")}`
          });
        }
      }

      // Resolve Park ID context safely and enforce strict string narrowing to clear compilation error
      let parkId: string = companyId || "";
      
      if (!parkId) {
        const park = await VehicleService.getParkByOperator(operatorId);
        if (!park || !park.id) {
          return res.status(404).json({ message: "No registered park profile setup found for this operator account." });
        }
        parkId = park.id;
      }

      // Check Plate Duplication
      const duplicate = await VehicleService.checkDuplicatePlate(plate_number);
      if (duplicate) return res.status(409).json({ message: "This vehicle plate number is already registered in our system." });

      // Compute Serialized BUS ID
      const { count } = await VehicleService.getVehicleCountInPark(parkId);
      const computedBusId = `BUS-${(count || 0) + 1}`;

      // Insert into inventory system satisfying all expected VehicleInput properties
      const { data: newVehicle, error: insertError } = await VehicleService.createVehicle({
        park_id: parkId,
        park_operator_id: operatorId, 
        bus_id: computedBusId,         
        plate_number: plate_number.trim().toUpperCase(),
        capacity: capacity || 14,      
        vehicle_model: vehicle_model || "Standard Bus",
        status: status ? String(status).toLowerCase().trim() : "active"
      });

      if (insertError) return res.status(500).json({ error: insertError.message });

      return res.status(201).json({ 
        success: true,
        message: "Vehicle added successfully to park fleet inventory registry.",
        data: newVehicle
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  }

  /**
   * RESTORED: Fetches all registered vehicles belonging to the operator's park fleet
   */
  static async getOperatorVehicles(req: Request, res: Response) {
    try {
      const operatorId = req.user?.id;
      const companyId = req.user?.company_id;

      if (!operatorId) return res.status(401).json({ message: "Unauthorized account session context." });

      let parkId = companyId;
      if (!parkId) {
        const park = await VehicleService.getParkByOperator(operatorId);
        if (!park) return res.status(404).json({ message: "No registered company fleet context found." });
        parkId = park.id;
      }

      const { data: vehicles, error } = await VehicleService.getVehiclesByPark(parkId);
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ 
        success: true,
        count: vehicles?.length || 0, 
        vehicles: vehicles || [] 
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  }

  /**
   * RESTORED: Modifies an existing vehicle asset profile configuration parameters with enum guard protection.
   */
  static async updateVehicle(req: Request, res: Response) {
    try {
      const { vehicle_id, plate_number, capacity, vehicle_model, status } = req.body;
      const operatorId = req.user?.id;
      const companyId = req.user?.company_id;

      if (!operatorId || !vehicle_id) return res.status(400).json({ message: "Missing required vehicle_id execution parameter fields." });

      // Enforce strict check protection during resource state updates
      if (status) {
        const sanitizedStatus = String(status).toLowerCase().trim();
        if (!ALLOWED_VEHICLE_STATUSES.includes(sanitizedStatus)) {
          return res.status(400).json({
            success: false,
            error: `Validation Mismatch: '${status}' is not an applicable state field parameter. Use one of: ${ALLOWED_VEHICLE_STATUSES.join(", ")}`
          });
        }
      }

      let parkId = companyId;
      if (!parkId) {
        const park = await VehicleService.getParkByOperator(operatorId);
        if (!park) return res.status(404).json({ message: "No registered transport park context linked." });
        parkId = park.id;
      }

      if (plate_number) {
        const duplicate = await VehicleService.checkDuplicatePlate(plate_number, vehicle_id);
        if (duplicate) return res.status(409).json({ message: "Plate number in use by another active fleet vehicle." });
      }

      const updateData: any = {};
      if (plate_number) updateData.plate_number = plate_number.trim().toUpperCase();
      if (capacity) updateData.capacity = capacity;
      if (vehicle_model) updateData.vehicle_model = vehicle_model;
      if (status) updateData.status = String(status).toLowerCase().trim();

      const { data: updated, error } = await VehicleService.updateVehicle(vehicle_id, parkId, updateData);

      if (error) return res.status(500).json({ error: error.message });
      if (!updated) return res.status(404).json({ message: "Vehicle configuration profile update rejected or target item not found." });

      return res.status(200).json({ 
        success: true,
        message: "Vehicle asset inventory parameters modified successfully.",
        data: updated
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  }
}
