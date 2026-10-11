const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Generate next Driver ID (e.g., D009)
 */
const getNextDriverId = async () => {
  const drivers = await Driver.find({}, "id");
  const nums = drivers.map((d) => {
    const raw = String(d.id).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return "D" + String(max + 1).padStart(3, "0");
};

/**
 * @desc    Get all drivers with search & status filters
 * @route   GET /api/drivers
 * @access  Private
 */
const getDrivers = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: regex },
        { license: regex },
        { phone: regex },
        { id: regex }
      ];
    }

    const drivers = await Driver.find(query).sort({ id: 1 });
    return successResponse(res, drivers, "Drivers retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single driver by ID
 * @route   GET /api/drivers/:id
 * @access  Private
 */
const getDriverById = async (req, res, next) => {
  try {
    const driverId = req.params.id.toUpperCase();
    const driver = await Driver.findOne({ id: driverId });

    if (!driver) {
      return errorResponse(res, "Driver not found", 404);
    }

    return successResponse(res, driver, "Driver retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new driver
 * @route   POST /api/drivers
 * @access  Private (Admin only)
 */
const createDriver = async (req, res, next) => {
  try {
    let { id, name, license, phone, status, safety, vehicleId } = req.body;

    if (!name || !license || !phone) {
      return errorResponse(res, "Driver name, license, and phone are required", 400);
    }

    if (!id) {
      id = await getNextDriverId();
    } else {
      id = id.trim().toUpperCase();
    }

    // Check duplicate ID
    const existingId = await Driver.findOne({ id });
    if (existingId) {
      return errorResponse(res, `Driver ID '${id}' already exists`, 409);
    }

    // Check duplicate License
    const existingLicense = await Driver.findOne({ license: license.trim() });
    if (existingLicense) {
      return errorResponse(res, `License '${license}' is already registered`, 409);
    }

    const newDriver = await Driver.create({
      id,
      name: name.trim(),
      license: license.trim(),
      phone: phone.trim(),
      status: status || "Active",
      safety: safety !== undefined ? Number(safety) : 90,
      vehicleId: vehicleId ? vehicleId.trim().toUpperCase() : ""
    });

    // Link vehicle
    if (vehicleId) {
      const vId = vehicleId.trim().toUpperCase();
      const vehicle = await Vehicle.findOne({ id: vId });
      if (vehicle) {
        if (vehicle.driverId && vehicle.driverId !== id) {
          await Driver.findOneAndUpdate({ id: vehicle.driverId }, { vehicleId: "" });
        }
        vehicle.driverId = id;
        await vehicle.save();
      }
    }

    // Log Activity
    await Activity.create({
      icon: "👤",
      text: `Driver ${newDriver.name} was added to the fleet`,
      time: "Just now",
      status: "Info"
    });

    return successResponse(res, newDriver, "Driver created successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update driver
 * @route   PUT /api/drivers/:id
 * @access  Private (Admin only)
 */
const updateDriver = async (req, res, next) => {
  try {
    const driverId = req.params.id.toUpperCase();
    const driver = await Driver.findOne({ id: driverId });

    if (!driver) {
      return errorResponse(res, "Driver not found", 404);
    }

    const { name, license, phone, status, safety, vehicleId } = req.body;

    if (name) driver.name = name.trim();
    if (license) {
      const trimmedLicense = license.trim();
      const duplicateLicense = await Driver.findOne({ license: trimmedLicense, id: { $ne: driverId } });
      if (duplicateLicense) {
        return errorResponse(res, `License '${trimmedLicense}' is already registered by another driver`, 409);
      }
      driver.license = trimmedLicense;
    }
    if (phone) driver.phone = phone.trim();
    if (status) driver.status = status;
    if (safety !== undefined) driver.safety = Number(safety);

    if (vehicleId !== undefined) {
      const oldVehicleId = driver.vehicleId;
      const newVehicleId = vehicleId ? vehicleId.trim().toUpperCase() : "";

      if (newVehicleId !== oldVehicleId) {
        driver.vehicleId = newVehicleId;

        // Unlink old vehicle
        if (oldVehicleId) {
          await Vehicle.findOneAndUpdate({ id: oldVehicleId }, { driverId: "" });
        }
        // Link new vehicle
        if (newVehicleId) {
          const vehicle = await Vehicle.findOne({ id: newVehicleId });
          if (vehicle) {
            if (vehicle.driverId && vehicle.driverId !== driverId) {
              await Driver.findOneAndUpdate({ id: vehicle.driverId }, { vehicleId: "" });
            }
            vehicle.driverId = driverId;
            await vehicle.save();
          }
        }
      }
    }

    await driver.save();

    return successResponse(res, driver, "Driver updated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reassign driver to vehicle
 * @route   PATCH /api/drivers/:id/assign
 * @access  Private (Admin only)
 */
const reassignDriver = async (req, res, next) => {
  try {
    const driverId = req.params.id.toUpperCase();
    const driver = await Driver.findOne({ id: driverId });

    if (!driver) {
      return errorResponse(res, "Driver not found", 404);
    }

    const { vehicleId } = req.body;
    const targetVehicleId = vehicleId ? vehicleId.trim().toUpperCase() : "";
    const oldVehicleId = driver.vehicleId;

    if (targetVehicleId === oldVehicleId) {
      return successResponse(res, driver, "No change in vehicle assignment");
    }

    // 1. Unassign old vehicle if any
    if (oldVehicleId) {
      await Vehicle.findOneAndUpdate({ id: oldVehicleId }, { driverId: "" });
    }

    // 2. Assign to new vehicle if provided
    if (targetVehicleId) {
      const vehicle = await Vehicle.findOne({ id: targetVehicleId });
      if (!vehicle) {
        return errorResponse(res, `Target vehicle '${targetVehicleId}' not found`, 404);
      }

      // If that vehicle already had another driver, clear that driver's vehicleId
      if (vehicle.driverId && vehicle.driverId !== driverId) {
        await Driver.findOneAndUpdate({ id: vehicle.driverId }, { vehicleId: "" });
      }

      vehicle.driverId = driverId;
      await vehicle.save();
      driver.vehicleId = targetVehicleId;
    } else {
      driver.vehicleId = "";
    }

    await driver.save();

    // Log Activity
    await Activity.create({
      icon: "👤",
      text: `Driver ${driver.name} was assigned to ${targetVehicleId || "no vehicle"}`,
      time: "Just now",
      status: "Info"
    });

    return successResponse(res, driver, "Driver reassigned successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete driver
 * @route   DELETE /api/drivers/:id
 * @access  Private (Admin only)
 */
const deleteDriver = async (req, res, next) => {
  try {
    const driverId = req.params.id.toUpperCase();
    const driver = await Driver.findOneAndDelete({ id: driverId });

    if (!driver) {
      return errorResponse(res, "Driver not found", 404);
    }

    if (driver.vehicleId) {
      await Vehicle.findOneAndUpdate({ id: driver.vehicleId }, { driverId: "" });
    }

    await Activity.create({
      icon: "🗑️",
      text: `Driver ${driver.name} (${driverId}) was removed from the fleet`,
      time: "Just now",
      status: "Warning"
    });

    return successResponse(res, null, `Driver ${driverId} deleted successfully`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  reassignDriver,
  deleteDriver
};
