import { Request, Response } from "express";
import { VehicleService, VehicleInput } from "../services/inventory.services.js";

export class VehicleController {
  /**
   * Registers a brand-new vehicle asset under the operator's park,
   * automatically computing a serialized sequential BUS-ID tag.
   */
  static async addVehicle(req: Request, res: Response) {
    try {
      const { plate_number, capacity, vehicle_model }: VehicleInput = req.body;
      const operatorId = req.user?.id;

      if (!operatorId) return res.status(401).json({ message: "Unauthorized" });

      if (!plate_number) return res.status(400).json({ error: "plate_number is a required field." });

      //Get Park ID
      const { data: park, error: parkError } = await VehicleService.getParkByOperator(operatorId);
      if (parkError || !park) return res.status(404).json({ message: "No registered park found." });

      //Check Plate Duplication
      const { data: duplicate } = await VehicleService.checkDuplicatePlate(plate_number);
      if (duplicate) return res.status(409).json({ message: "Plate number already exists." });

      //Compute Serialized BUS ID
      const { count } = await VehicleService.getVehicleCountInPark(park.id);
      const busId = `BUS-${(count || 0) + 1}`;

      //Insert into inventory system
      const { error: insertError } = await VehicleService.createVehicle({
        park_id: park.id,
        park_operator_id: operatorId,
        bus_id: busId,
        plate_number: plate_number.trim().toUpperCase(), // Normalizes entry format
        capacity: capacity || 14,
        vehicle_model: vehicle_model || "Standard Bus",
        status: "active",
      });

      if (insertError) return res.status(500).json({ error: insertError.message });

      return res.status(201).json({ 
        message: "Vehicle added successfully",
        computed_bus_id: busId
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Fetches all registered vehicles belonging to the operator's park fleet
   */
  static async getOperatorVehicles(req: Request, res: Response) {
    try {
      const operatorId = req.user?.id;
      if (!operatorId) return res.status(401).json({ message: "Unauthorized" });

      const { data: vehicles, error } = await VehicleService.getVehiclesByOperator(operatorId);
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ count: vehicles.length, vehicles });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Modifies an existing vehicle asset profile configuration parameters
   */
  static async updateVehicle(req: Request, res: Response) {
    try {
      const { vehicle_id, plate_number, capacity, vehicle_model, status } = req.body;
      const operatorId = req.user?.id;

      if (!operatorId || !vehicle_id) return res.status(400).json({ message: "Missing required fields." });

      if (plate_number) {
        const { data: duplicate } = await VehicleService.checkDuplicatePlate(plate_number, vehicle_id);
        if (duplicate) return res.status(409).json({ message: "Plate number in use by another vehicle." });
      }

      const updateData: Partial<VehicleInput> = {};
      if (plate_number) updateData.plate_number = plate_number.trim().toUpperCase();
      if (capacity) updateData.capacity = capacity;
      if (vehicle_model) updateData.vehicle_model = vehicle_model;
      if (status) updateData.status = status;

      const { data: updated, error } = await VehicleService.updateVehicle(vehicle_id, operatorId, updateData);

      if (error) return res.status(500).json({ error: error.message });
      if (!updated) return res.status(404).json({ message: "Vehicle not found or unauthorized." });

      return res.status(200).json({ message: "Vehicle updated successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
