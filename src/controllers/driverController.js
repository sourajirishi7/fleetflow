const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");
const { getEmployeeAccessContext } = require("../utils/rbac");

/**
 * Generate next Driver ID within an organization (e.g., D009)
 */
const getNextDriverId = async (organizationId) => {
  const drivers = await Driver.find({ organizationId }, "id");
  const nums = drivers.map((d) => {
    const raw = String(d.id).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return "D" + String(max + 1).padStart(3, "0");
};

/**
 * @desc    Get all drivers with search & status filters for organization
 * @route   GET /api/drivers
 * @access  Private (Admin only)
 */
const getDrivers = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return errorResponse(res, "Access denied. The driver directory is restricted to administrators.", 403);
    }

    const orgId = req.user.organizationId;
    const { status, search } = req.query;
    let query = { organizationId: orgId };

    if (status && status !== "all") {
      query.$or = [{ status }, { shiftStatus: status }];
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$and = [
        { organizationId: orgId },
        {
          $or: [
            { name: regex },
            { fullName: regex },
            { license: regex },
            { licenseNumber: regex },
            { phone: regex },
            { id: regex }
          ]
        }
      ];
    }

    const drivers = await Driver.find(query).sort({ id: 1 });
    return successResponse(res, drivers, "Drivers retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single driver by ID within organization
 * @route   GET /api/drivers/:id
 * @access  Private
 */
const getDriverById = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const driverId = req.params.id.toUpperCase();

    // Enforce role-based access
    if (req.user.role === "EMPLOYEE") {
      const { driverId: employeeDriverId } = await getEmployeeAccessContext(req.user);
      if (!employeeDriverId || driverId !== employeeDriverId.toUpperCase()) {
        return errorResponse(res, "Access denied to this driver record", 403);
      }
    }

    const driver = await Driver.findOne({ id: driverId, organizationId: orgId });

    if (!driver) {
      return errorResponse(res, "Driver not found", 404);
    }

    // For employees, return only their necessary job fields
    if (req.user.role === "EMPLOYEE") {
      return successResponse(res, {
        id: driver.id,
        name: driver.name || driver.fullName,
        status: driver.status || driver.shiftStatus,
        safety: driver.safety !== undefined ? driver.safety : driver.safetyScore,
        vehicleId: driver.vehicleId
      }, "Driver profile retrieved");
    }

    return successResponse(res, driver, "Driver retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current employee's own driver profile
 * @route   GET /api/drivers/me
 * @access  Private
 */
const getMyDriverProfile = async (req, res, next) => {
  try {
    const { driver, driverId } = await getEmployeeAccessContext(req.user);

    if (!driver && !driverId) {
      return errorResponse(res, "No driver profile linked to your user account", 404);
    }

    const resolvedDriver = driver || await Driver.findOne({ id: driverId, organizationId: req.user.organizationId });
    if (!resolvedDriver) {
      return errorResponse(res, "Linked driver record not found", 404);
    }

    return successResponse(res, {
      id: resolvedDriver.id,
      name: resolvedDriver.name || resolvedDriver.fullName,
      status: resolvedDriver.status || resolvedDriver.shiftStatus,
      safety: resolvedDriver.safety !== undefined ? resolvedDriver.safety : resolvedDriver.safetyScore,
      vehicleId: resolvedDriver.vehicleId
    }, "Driver profile retrieved");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new driver in organization (with optional linked employee login)
 * @route   POST /api/drivers
 * @access  Private (Admin only)
 */
const createDriver = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    let {
      id,
      name,
      fullName,
      license,
      licenseNumber,
      phone,
      status,
      shiftStatus,
      safety,
      safetyScore,
      vehicleId,
      createLogin,
      username,
      email,
      password
    } = req.body;

    const effectiveName = (name || fullName || "").trim();
    const effectiveLicense = (license || licenseNumber || "").trim().toUpperCase();

    if (!effectiveName || !effectiveLicense || !phone) {
      return errorResponse(res, "Driver name, license, and phone are required", 400);
    }

    if (!id) {
      id = await getNextDriverId(orgId);
    } else {
      id = id.trim().toUpperCase();
    }

    // Check duplicate ID in organization
    const existingId = await Driver.findOne({ id, organizationId: orgId });
    if (existingId) {
      return errorResponse(res, `Driver ID '${id}' already exists in your organization`, 409);
    }

    // Check duplicate License in organization
    const existingLicense = await Driver.findOne({ licenseNumber: effectiveLicense, organizationId: orgId });
    if (existingLicense) {
      return errorResponse(res, `License '${effectiveLicense}' is already registered in your organization`, 409);
    }

    // Validate vehicle assignment if provided
    let assignedVehicle = null;
    if (vehicleId) {
      const vId = vehicleId.trim().toUpperCase();
      assignedVehicle = await Vehicle.findOne({ id: vId, organizationId: orgId });
      if (!assignedVehicle) {
        return errorResponse(res, `Vehicle '${vId}' does not exist in your organization`, 404);
      }
    }

    // Handle optional linked employee login creation
    let linkedUserId = null;
    const wantsLogin = createLogin === true || createLogin === "true" || Boolean(password);

    if (wantsLogin) {
      const loginUsername = (username || `driver_${id.toLowerCase()}`).trim();
      const loginEmail = (email || `${loginUsername}@fleetflow.local`).trim().toLowerCase();

      if (!password || password.length < 6) {
        return errorResponse(res, "A password of at least 6 characters is required to create a login account", 400);
      }

      // Check duplicate user credentials
      const userExists = await User.findOne({
        $or: [{ username: loginUsername }, { email: loginEmail }]
      });
      if (userExists) {
        return errorResponse(res, "A user account with that username or email already exists", 409);
      }

      const createdUser = await User.create({
        organizationId: orgId,
        username: loginUsername,
        email: loginEmail,
        password,
        fullName: effectiveName,
        name: effectiveName,
        role: "EMPLOYEE",
        phone: phone.trim(),
        driverId: id,
        isActive: true,
        status: "Active",
        createdBy: req.user._id
      });
      linkedUserId = createdUser._id;
    }

    const newDriver = await Driver.create({
      organizationId: orgId,
      id,
      userId: linkedUserId,
      fullName: effectiveName,
      name: effectiveName,
      licenseNumber: effectiveLicense,
      license: effectiveLicense,
      phone: phone.trim(),
      shiftStatus: shiftStatus || status || "Active",
      status: status || shiftStatus || "Active",
      safetyScore: safetyScore !== undefined ? Number(safetyScore) : safety !== undefined ? Number(safety) : 90,
      safety: safety !== undefined ? Number(safety) : safetyScore !== undefined ? Number(safetyScore) : 90,
      vehicleId: vehicleId ? vehicleId.trim().toUpperCase() : "",
      vehicleRef: assignedVehicle ? assignedVehicle._id : null
    });

    // Update vehicle assignment if vehicle provided
    if (assignedVehicle) {
      if (assignedVehicle.driverId && assignedVehicle.driverId !== id) {
        await Driver.findOneAndUpdate({ id: assignedVehicle.driverId, organizationId: orgId }, { vehicleId: "", vehicleRef: null });
      }
      assignedVehicle.driverId = id;
      assignedVehicle.driverRef = newDriver._id;
      await assignedVehicle.save();
    }

    // Log Activity
    await Activity.create({
      organizationId: orgId,
      icon: "👤",
      text: `Driver ${newDriver.name} was added to the fleet`,
      time: "Just now",
      status: "Info"
    });

    return successResponse(res, newDriver, "Driver created successfully", 201);
  } catch (err) {
    if (linkedUserId) {
      await User.findByIdAndDelete(linkedUserId).catch(() => {});
    }
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
    const orgId = req.user.organizationId;
    const driverId = req.params.id.toUpperCase();
    const driver = await Driver.findOne({ id: driverId, organizationId: orgId });

    if (!driver) {
      return errorResponse(res, "Driver not found", 404);
    }

    const { name, fullName, license, licenseNumber, phone, status, shiftStatus, safety, safetyScore, vehicleId } = req.body;

    const effectiveName = name || fullName;
    if (effectiveName) {
      driver.name = effectiveName.trim();
      driver.fullName = effectiveName.trim();
    }

    const effectiveLicense = license || licenseNumber;
    if (effectiveLicense) {
      const trimmedLicense = effectiveLicense.trim().toUpperCase();
      const duplicateLicense = await Driver.findOne({
        licenseNumber: trimmedLicense,
        organizationId: orgId,
        id: { $ne: driverId }
      });
      if (duplicateLicense) {
        return errorResponse(res, `License '${trimmedLicense}' is already registered by another driver in this organization`, 409);
      }
      driver.license = trimmedLicense;
      driver.licenseNumber = trimmedLicense;
    }

    if (phone) driver.phone = phone.trim();
    if (status || shiftStatus) {
      driver.status = status || shiftStatus;
      driver.shiftStatus = shiftStatus || status;
    }
    if (safety !== undefined || safetyScore !== undefined) {
      const score = Number(safety !== undefined ? safety : safetyScore);
      driver.safety = score;
      driver.safetyScore = score;
    }

    if (vehicleId !== undefined) {
      const oldVehicleId = driver.vehicleId;
      const newVehicleId = vehicleId ? vehicleId.trim().toUpperCase() : "";

      if (newVehicleId && newVehicleId !== oldVehicleId) {
        const vehicle = await Vehicle.findOne({ id: newVehicleId, organizationId: orgId });
        if (!vehicle) {
          return errorResponse(res, `Vehicle '${newVehicleId}' not found in organization`, 404);
        }
        if (vehicle.driverId && vehicle.driverId !== driverId) {
          await Driver.findOneAndUpdate({ id: vehicle.driverId, organizationId: orgId }, { vehicleId: "", vehicleRef: null });
        }
        vehicle.driverId = driverId;
        vehicle.driverRef = driver._id;
        await vehicle.save();
        driver.vehicleId = newVehicleId;
        driver.vehicleRef = vehicle._id;
      } else if (!newVehicleId && oldVehicleId) {
        await Vehicle.findOneAndUpdate({ id: oldVehicleId, organizationId: orgId }, { driverId: "", driverRef: null });
        driver.vehicleId = "";
        driver.vehicleRef = null;
      }
    }

    await driver.save();
    return successResponse(res, driver, "Driver updated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Assign vehicle to driver
 * @route   PATCH /api/drivers/:id/assign
 * @access  Private (Admin only)
 */
const assignVehicle = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const driverId = req.params.id.toUpperCase();
    const { vehicleId } = req.body;

    const driver = await Driver.findOne({ id: driverId, organizationId: orgId });
    if (!driver) {
      return errorResponse(res, "Driver not found", 404);
    }

    const oldVehicleId = driver.vehicleId;
    const newVehicleId = vehicleId ? vehicleId.trim().toUpperCase() : "";

    if (newVehicleId) {
      const targetVehicle = await Vehicle.findOne({ id: newVehicleId, organizationId: orgId });
      if (!targetVehicle) {
        return errorResponse(res, `Vehicle '${newVehicleId}' not found in your organization`, 404);
      }

      // If another driver currently had this vehicle, unassign them
      if (targetVehicle.driverId && targetVehicle.driverId !== driverId) {
        await Driver.findOneAndUpdate({ id: targetVehicle.driverId, organizationId: orgId }, { vehicleId: "", vehicleRef: null });
      }

      // Unassign driver's old vehicle
      if (oldVehicleId && oldVehicleId !== newVehicleId) {
        await Vehicle.findOneAndUpdate({ id: oldVehicleId, organizationId: orgId }, { driverId: "", driverRef: null });
      }

      targetVehicle.driverId = driverId;
      targetVehicle.driverRef = driver._id;
      await targetVehicle.save();

      driver.vehicleId = newVehicleId;
      driver.vehicleRef = targetVehicle._id;
    } else {
      // Unassign vehicle completely
      if (oldVehicleId) {
        await Vehicle.findOneAndUpdate({ id: oldVehicleId, organizationId: orgId }, { driverId: "", driverRef: null });
      }
      driver.vehicleId = "";
      driver.vehicleRef = null;
    }

    await driver.save();

    await Activity.create({
      organizationId: orgId,
      icon: "👤",
      text: newVehicleId
        ? `Driver ${driver.name} assigned to ${newVehicleId}`
        : `Driver ${driver.name} unassigned from vehicle`,
      time: "Just now",
      status: "Info"
    });

    return successResponse(res, driver, "Vehicle assigned successfully");
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
    const orgId = req.user.organizationId;
    const driverId = req.params.id.toUpperCase();
    const driver = await Driver.findOne({ id: driverId, organizationId: orgId });

    if (!driver) {
      return errorResponse(res, "Driver not found", 404);
    }

    // Unassign vehicle
    if (driver.vehicleId) {
      await Vehicle.findOneAndUpdate({ id: driver.vehicleId, organizationId: orgId }, { driverId: "", driverRef: null });
    }

    await Driver.findOneAndDelete({ id: driverId, organizationId: orgId });

    return successResponse(res, null, "Driver deleted successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDrivers,
  getDriverById,
  getMyDriverProfile,
  createDriver,
  updateDriver,
  assignVehicle,
  reassignDriver: assignVehicle,
  deleteDriver
};
