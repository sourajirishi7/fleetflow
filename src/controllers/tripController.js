const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Generate next Trip ID (e.g., R-211)
 */
const getNextTripId = async () => {
  const trips = await Trip.find({}, "id");
  const nums = trips.map((t) => {
    const raw = String(t.id).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 200;
  return "R-" + String(max + 1);
};

/**
 * @desc    Get trips (role-aware: Admin sees all, Employee sees assigned)
 * @route   GET /api/trips
 * @access  Private
 */
const getTrips = async (req, res, next) => {
  try {
    const { status, vehicleId, search } = req.query;
    let query = {};

    // Role-based scoping: If employee has driverId, filter by driverId
    if (req.user.role === "EMPLOYEE" && req.user.driverId) {
      query.driverId = req.user.driverId;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (vehicleId && vehicleId !== "all") {
      query.vehicleId = vehicleId;
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { id: regex },
        { start: regex },
        { end: regex },
        { vehicleId: regex },
        { driverId: regex }
      ];
    }

    const trips = await Trip.find(query).sort({ id: 1 });
    return successResponse(res, trips, "Trips retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single trip by ID
 * @route   GET /api/trips/:id
 * @access  Private
 */
const getTripById = async (req, res, next) => {
  try {
    const tripId = req.params.id.toUpperCase();
    const trip = await Trip.findOne({ id: tripId });

    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    // If employee, check permission
    if (req.user.role === "EMPLOYEE" && req.user.driverId && trip.driverId !== req.user.driverId) {
      return errorResponse(res, "Access denied to this trip record", 403);
    }

    return successResponse(res, trip, "Trip retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new trip
 * @route   POST /api/trips
 * @access  Private (Admin only)
 */
const createTrip = async (req, res, next) => {
  try {
    let { id, vehicleId, driverId, start, end, distance, duration, status } = req.body;

    if (!vehicleId || !start || !end || distance === undefined || !duration) {
      return errorResponse(res, "Vehicle ID, start, end, distance, and duration are required", 400);
    }

    if (!id) {
      id = await getNextTripId();
    } else {
      id = id.trim().toUpperCase();
    }

    // Check duplicate ID
    const existing = await Trip.findOne({ id });
    if (existing) {
      return errorResponse(res, `Trip ID '${id}' already exists`, 409);
    }

    const vId = vehicleId.trim().toUpperCase();
    const vehicle = await Vehicle.findOne({ id: vId });
    if (!vehicle) {
      return errorResponse(res, `Vehicle '${vId}' not found`, 404);
    }

    // Default driverId to vehicle's currently assigned driver if not specified
    const assignedDriverId = driverId ? driverId.trim().toUpperCase() : vehicle.driverId;

    const newTrip = await Trip.create({
      id,
      vehicleId: vId,
      driverId: assignedDriverId || "",
      start: start.trim(),
      end: end.trim(),
      distance: Number(distance),
      duration: duration.trim(),
      status: status || "On Time"
    });

    // Log activity
    await Activity.create({
      icon: "🚚",
      text: `Vehicle ${vId} scheduled for Route ${id} (${start} → ${end})`,
      time: "Just now",
      status: "Active"
    });

    return successResponse(res, newTrip, "Trip created successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update trip status (accessible by Admin or assigned Employee)
 * @route   PATCH /api/trips/:id/status
 * @access  Private
 */
const updateTripStatus = async (req, res, next) => {
  try {
    const tripId = req.params.id.toUpperCase();
    const { status } = req.body;

    const validStatuses = ["On Time", "Delayed", "Completed", "Cancelled", "Idle"];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, `Status must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const trip = await Trip.findOne({ id: tripId });
    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    // Check employee authorization
    if (req.user.role === "EMPLOYEE" && req.user.driverId && trip.driverId !== req.user.driverId) {
      return errorResponse(res, "You are not authorized to update this trip", 403);
    }

    trip.status = status;
    await trip.save();

    // Log Activity
    const icon = status === "Completed" ? "✅" : status === "Delayed" ? "⚠️" : "🚚";
    await Activity.create({
      icon,
      text: `Trip ${trip.id} status changed to ${status}`,
      time: "Just now",
      status: status === "Completed" ? "On-Time" : status === "Delayed" ? "Warning" : "Active"
    });

    return successResponse(res, trip, `Trip status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update trip details
 * @route   PUT /api/trips/:id
 * @access  Private (Admin only)
 */
const updateTrip = async (req, res, next) => {
  try {
    const tripId = req.params.id.toUpperCase();
    const trip = await Trip.findOne({ id: tripId });

    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    const { vehicleId, driverId, start, end, distance, duration, status } = req.body;

    if (vehicleId) trip.vehicleId = vehicleId.trim().toUpperCase();
    if (driverId !== undefined) trip.driverId = driverId.trim().toUpperCase();
    if (start) trip.start = start.trim();
    if (end) trip.end = end.trim();
    if (distance !== undefined) trip.distance = Number(distance);
    if (duration) trip.duration = duration.trim();
    if (status) trip.status = status;

    await trip.save();

    return successResponse(res, trip, "Trip updated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete trip
 * @route   DELETE /api/trips/:id
 * @access  Private (Admin only)
 */
const deleteTrip = async (req, res, next) => {
  try {
    const tripId = req.params.id.toUpperCase();
    const trip = await Trip.findOneAndDelete({ id: tripId });

    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    return successResponse(res, null, `Trip ${tripId} deleted successfully`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTrips,
  getTripById,
  createTrip,
  updateTripStatus,
  updateTrip,
  deleteTrip
};
