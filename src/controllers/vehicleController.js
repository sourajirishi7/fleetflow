const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");
const { getEmployeeAccessContext } = require("../utils/rbac");

/**
 * Generate next Vehicle ID within organization (e.g. FL-109)
 */
const getNextVehicleId = async (organizationId) => {
  const vehicles = await Vehicle.find({ organizationId }, "id");
  const nums = vehicles.map((v) => {
    const raw = String(v.id).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 100;
  return "FL-" + (max + 1);
};

/**
 * @desc    Get vehicles (Admin: all org fleet, Employee: assigned vehicles only)
 * @route   GET /api/vehicles
 * @access  Private
 */
const getVehicles = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { status, search } = req.query;
    let query = { organizationId: orgId };

    // Role-based access restriction
    if (req.user.role === "EMPLOYEE") {
      const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      if (!assignedVehicleIds || assignedVehicleIds.length === 0) {
        return successResponse(res, [], "No vehicles assigned to this employee");
      }
      query.id = { $in: assignedVehicleIds };
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      const searchConditions = [
        { id: regex },
        { make: regex },
        { model: regex },
        { plate: regex },
        { registrationNumber: regex }
      ];

      if (query.id) {
        query.$and = [
          { organizationId: orgId },
          { id: query.id },
          { $or: searchConditions }
        ];
        delete query.id;
        delete query.organizationId;
      } else {
        query.$and = [
          { organizationId: orgId },
          { $or: searchConditions }
        ];
        delete query.organizationId;
      }
    }

    const vehicles = await Vehicle.find(query).sort({ id: 1 });
    return successResponse(res, vehicles, "Vehicles retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single vehicle by ID within organization
 * @route   GET /api/vehicles/:id
 * @access  Private
 */
const getVehicleById = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const vehicleId = req.params.id.toUpperCase();

    // Check employee authorization
    if (req.user.role === "EMPLOYEE") {
      const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      if (!assignedVehicleIds || !assignedVehicleIds.includes(vehicleId)) {
        return errorResponse(res, "Access denied to this vehicle record", 403);
      }
    }

    const vehicle = await Vehicle.findOne({ id: vehicleId, organizationId: orgId });

    if (!vehicle) {
      return errorResponse(res, "Vehicle not found", 404);
    }

    // Also fetch recent trips for this vehicle within organization
    let tripQuery = { vehicleId, organizationId: orgId };
    if (req.user.role === "EMPLOYEE") {
      const { driverId } = await getEmployeeAccessContext(req.user);
      if (driverId) tripQuery.driverId = driverId;
    }

    const recentTrips = await Trip.find(tripQuery).sort({ createdAt: -1 }).limit(5);

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
 * @desc    Create new vehicle in organization
 * @route   POST /api/vehicles
 * @access  Private (Admin only)
 */
const createVehicle = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    let { id, make, model, plate, registrationNumber, year, odometer, fuelType, status, driverId } = req.body;
    const effectivePlate = (plate || registrationNumber || "").trim().toUpperCase();

    if (!make || !model || !effectivePlate || !year) {
      return errorResponse(res, "Make, model, license plate, and manufacturing year are required", 400);
    }

    if (!id) {
      id = await getNextVehicleId(orgId);
    } else {
      id = id.trim().toUpperCase();
    }

    // Check duplicate ID in organization
    const existingId = await Vehicle.findOne({ id, organizationId: orgId });
    if (existingId) {
      return errorResponse(res, `Vehicle ID '${id}' already exists in your organization`, 409);
    }

    // Check duplicate plate in organization
    const existingPlate = await Vehicle.findOne({
      $or: [{ plate: effectivePlate }, { registrationNumber: effectivePlate }],
      organizationId: orgId
    });
    if (existingPlate) {
      return errorResponse(res, `License plate '${effectivePlate}' is already registered in your organization`, 409);
    }

    // Validate assigned driver if provided
    let assignedDriver = null;
    if (driverId) {
      const dId = driverId.trim().toUpperCase();
      assignedDriver = await Driver.findOne({ id: dId, organizationId: orgId });
      if (!assignedDriver) {
        return errorResponse(res, `Driver '${dId}' not found in your organization`, 404);
      }
    }

    const newVehicle = await Vehicle.create({
      organizationId: orgId,
      id,
      registrationNumber: effectivePlate,
      plate: effectivePlate,
      make: make.trim(),
      model: model.trim(),
      year: Number(year),
      odometer: odometer !== undefined ? Number(odometer) : 0,
      fuelType: fuelType || "Diesel",
      status: status || "Active",
      driverId: driverId ? driverId.trim().toUpperCase() : "",
      driverRef: assignedDriver ? assignedDriver._id : null
    });

    // If driver assigned, sync driver's vehicleId
    if (assignedDriver) {
      if (assignedDriver.vehicleId && assignedDriver.vehicleId !== id) {
        await Vehicle.findOneAndUpdate({ id: assignedDriver.vehicleId, organizationId: orgId }, { driverId: "", driverRef: null });
      }
      assignedDriver.vehicleId = id;
      assignedDriver.vehicleRef = newVehicle._id;
      await assignedDriver.save();
    }

    // Log Activity
    await Activity.create({
      organizationId: orgId,
      icon: "🚛",
      text: `Vehicle ${newVehicle.id} (${newVehicle.make} ${newVehicle.model}) was added to the fleet`,
      time: "Just now",
      status: "Info"
    });

    return successResponse(res, newVehicle, "Vehicle created successfully", 201);
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
    const orgId = req.user.organizationId;
    const vehicleId = req.params.id.toUpperCase();
    const vehicle = await Vehicle.findOne({ id: vehicleId, organizationId: orgId });

    if (!vehicle) {
      return errorResponse(res, "Vehicle not found", 404);
    }

    const { make, model, plate, registrationNumber, year, odometer, fuelType, status, driverId, lastService, nextService } = req.body;

    const effectivePlate = plate || registrationNumber;
    if (effectivePlate) {
      const trimmedPlate = effectivePlate.trim().toUpperCase();
      const duplicatePlate = await Vehicle.findOne({
        $or: [{ plate: trimmedPlate }, { registrationNumber: trimmedPlate }],
        organizationId: orgId,
        id: { $ne: vehicleId }
      });
      if (duplicatePlate) {
        return errorResponse(res, `License plate '${trimmedPlate}' is already registered to another vehicle in your organization`, 409);
      }
      vehicle.plate = trimmedPlate;
      vehicle.registrationNumber = trimmedPlate;
    }

    if (make) vehicle.make = make.trim();
    if (model) vehicle.model = model.trim();
    if (year) vehicle.year = Number(year);
    if (odometer !== undefined) vehicle.odometer = Number(odometer);
    if (fuelType) vehicle.fuelType = fuelType;
    if (status) vehicle.status = status;
    if (lastService) vehicle.lastService = lastService;
    if (nextService) vehicle.nextService = nextService;

    if (driverId !== undefined) {
      const oldDriverId = vehicle.driverId;
      const newDriverId = driverId ? driverId.trim().toUpperCase() : "";

      if (newDriverId && newDriverId !== oldDriverId) {
        const driver = await Driver.findOne({ id: newDriverId, organizationId: orgId });
        if (!driver) {
          return errorResponse(res, `Driver '${newDriverId}' not found in your organization`, 404);
        }
        if (driver.vehicleId && driver.vehicleId !== vehicleId) {
          await Vehicle.findOneAndUpdate({ id: driver.vehicleId, organizationId: orgId }, { driverId: "", driverRef: null });
        }
        driver.vehicleId = vehicleId;
        driver.vehicleRef = vehicle._id;
        await driver.save();
        vehicle.driverId = newDriverId;
        vehicle.driverRef = driver._id;
      } else if (!newDriverId && oldDriverId) {
        await Driver.findOneAndUpdate({ id: oldDriverId, organizationId: orgId }, { vehicleId: "", vehicleRef: null });
        vehicle.driverId = "";
        vehicle.driverRef = null;
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
    const orgId = req.user.organizationId;
    const vehicleId = req.params.id.toUpperCase();
    const vehicle = await Vehicle.findOne({ id: vehicleId, organizationId: orgId });

    if (!vehicle) {
      return errorResponse(res, "Vehicle not found", 404);
    }

    // Unassign driver
    if (vehicle.driverId) {
      await Driver.findOneAndUpdate({ id: vehicle.driverId, organizationId: orgId }, { vehicleId: "", vehicleRef: null });
    }

    await Vehicle.findOneAndDelete({ id: vehicleId, organizationId: orgId });

    return successResponse(res, null, "Vehicle deleted successfully");
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
