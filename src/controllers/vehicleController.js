const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * @desc    Get all vehicles (with optional search and status filter)
 * @route   GET /api/vehicles
 * @access  Private
 */
const getVehicles = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { id: regex },
        { make: regex },
        { model: regex },
        { plate: regex }
      ];
    }

    const vehicles = await Vehicle.find(query).sort({ id: 1 });
    return successResponse(res, vehicles, "Vehicles retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single vehicle by ID (e.g., 'FL-101') + recent trips
 * @route   GET /api/vehicles/:id
 * @access  Private
 */
const getVehicleById = async (req, res, next) => {
  try {
    const vehicleId = req.params.id.toUpperCase();
    const vehicle = await Vehicle.findOne({ id: vehicleId });

    if (!vehicle) {
      return errorResponse(res, "Vehicle not found", 404);
    }

    // Also fetch recent trips for this vehicle
    const recentTrips = await Trip.find({ vehicleId }).sort({ createdAt: -1 }).limit(5);

    return successResponse(
      res,
      {
        ...vehicle.toJSON(),
        recentTrips
      },
      "Vehicle details retrieved"
    );
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new vehicle
 * @route   POST /api/vehicles
 * @access  Private (Admin only)
 */
const createVehicle = async (req, res, next) => {
  try {
    let { id, make, model, plate, year, odometer, fuelType, status, driverId } = req.body;

    if (!id || !make || !model || !plate || !year) {
      return errorResponse(res, "ID, make, model, license plate, and year are required", 400);
    }

    id = id.trim().toUpperCase();
    plate = plate.trim().toUpperCase();

    // Check duplicate ID
    const existingId = await Vehicle.findOne({ id });
    if (existingId) {
      return errorResponse(res, `Vehicle ID '${id}' already exists`, 409);
    }

    // Check duplicate Plate
    const existingPlate = await Vehicle.findOne({ plate });
    if (existingPlate) {
      return errorResponse(res, `License plate '${plate}' is already registered`, 409);
    }

    const newVehicle = await Vehicle.create({
      id,
      make: make.trim(),
      model: model.trim(),
      plate,
      year: Number(year),
      odometer: Number(odometer) || 0,
      fuelType: fuelType || "Diesel",
      status: status || "Active",
      driverId: driverId ? driverId.trim().toUpperCase() : ""
    });

    // If assigned to a driver, update driver's vehicleId
    if (driverId) {
      const driver = await Driver.findOne({ id: driverId.trim().toUpperCase() });
      if (driver) {
        // If driver had another vehicle, clear that vehicle's driverId
        if (driver.vehicleId && driver.vehicleId !== id) {
          await Vehicle.findOneAndUpdate({ id: driver.vehicleId }, { driverId: "" });
        }
        driver.vehicleId = id;
        await driver.save();
      }
    }

    // Log Activity
    await Activity.create({
      icon: "🚚",
      text: `Vehicle ${id} (${make} ${model}) added to the fleet`,
      time: "Just now",
      status: "Info"
    });

    return successResponse(res, newVehicle, "Vehicle added successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update vehicle
 * @route   PUT /api/vehicles/:id
 * @access  Private (Admin only)
 */
const updateVehicle = async (req, res, next) => {
  try {
    const vehicleId = req.params.id.toUpperCase();
    const vehicle = await Vehicle.findOne({ id: vehicleId });

    if (!vehicle) {
      return errorResponse(res, "Vehicle not found", 404);
    }

    const { make, model, plate, year, odometer, fuelType, status, driverId } = req.body;

    if (make) vehicle.make = make.trim();
    if (model) vehicle.model = model.trim();
    if (plate) {
      const trimmedPlate = plate.trim().toUpperCase();
      const duplicatePlate = await Vehicle.findOne({ plate: trimmedPlate, id: { $ne: vehicleId } });
      if (duplicatePlate) {
        return errorResponse(res, `License plate '${trimmedPlate}' is already used by another vehicle`, 409);
      }
      vehicle.plate = trimmedPlate;
    }
    if (year !== undefined) vehicle.year = Number(year);
    if (odometer !== undefined) vehicle.odometer = Number(odometer);
    if (fuelType) vehicle.fuelType = fuelType;
    if (status) vehicle.status = status;

    const oldDriverId = vehicle.driverId;
    const newDriverId = driverId !== undefined ? driverId.trim().toUpperCase() : oldDriverId;

    if (newDriverId !== oldDriverId) {
      vehicle.driverId = newDriverId;

      // Unassign old driver
      if (oldDriverId) {
        await Driver.findOneAndUpdate({ id: oldDriverId }, { vehicleId: "" });
      }
      // Assign new driver
      if (newDriverId) {
        const driver = await Driver.findOne({ id: newDriverId });
        if (driver) {
          if (driver.vehicleId && driver.vehicleId !== vehicleId) {
            await Vehicle.findOneAndUpdate({ id: driver.vehicleId }, { driverId: "" });
          }
          driver.vehicleId = vehicleId;
          await driver.save();
        }
      }
    }

    await vehicle.save();

    return successResponse(res, vehicle, "Vehicle updated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete vehicle
 * @route   DELETE /api/vehicles/:id
 * @access  Private (Admin only)
 */
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicleId = req.params.id.toUpperCase();
    const vehicle = await Vehicle.findOneAndDelete({ id: vehicleId });

    if (!vehicle) {
      return errorResponse(res, "Vehicle not found", 404);
    }

    // Unassign driver if any
    if (vehicle.driverId) {
      await Driver.findOneAndUpdate({ id: vehicle.driverId }, { vehicleId: "" });
    }

    // Log Activity
    await Activity.create({
      icon: "🗑️",
      text: `Vehicle ${vehicleId} was removed from the fleet`,
      time: "Just now",
      status: "Warning"
    });

    return successResponse(res, null, `Vehicle ${vehicleId} deleted successfully`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
};
