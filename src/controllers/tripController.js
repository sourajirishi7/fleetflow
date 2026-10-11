const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");
const { getEmployeeAccessContext } = require("../utils/rbac");

/**
 * Generate next Trip ID within organization (e.g., R-211)
 */
const getNextTripId = async (organizationId) => {
  const trips = await Trip.find({ organizationId }, "id");
  const nums = trips.map((t) => {
    const raw = String(t.id).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 200;
  return "R-" + String(max + 1);
};

/**
 * @desc    Get trips (role-aware: Admin sees all org trips, Employee sees assigned only)
 * @route   GET /api/trips
 * @access  Private
 */
const getTrips = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { status, vehicleId, search } = req.query;
    let query = { organizationId: orgId };

    // Role-based scoping for Employee
    if (req.user.role === "EMPLOYEE") {
      const { driverId, assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      if (!driverId && (!assignedVehicleIds || assignedVehicleIds.length === 0)) {
        return successResponse(res, [], "No trips assigned to this employee");
      }
      const employeeConditions = [];
      if (driverId) employeeConditions.push({ driverId });
      if (assignedVehicleIds && assignedVehicleIds.length > 0) {
        employeeConditions.push({ vehicleId: { $in: assignedVehicleIds } });
      }
      query.$or = employeeConditions;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (vehicleId && vehicleId !== "all") {
      // If employee, verify they have access to requested vehicleId
      if (req.user.role === "EMPLOYEE") {
        const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
        if (!assignedVehicleIds.includes(vehicleId.toUpperCase())) {
          return errorResponse(res, "Access denied to trips for this vehicle", 403);
        }
      }
      query.vehicleId = vehicleId;
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      const searchConditions = [
        { id: regex },
        { start: regex },
        { startDestination: regex },
        { end: regex },
        { endDestination: regex },
        { vehicleId: regex },
        { driverId: regex }
      ];

      if (query.$or) {
        query.$and = [
          { organizationId: orgId },
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
        delete query.organizationId;
      } else {
        query.$and = [
          { organizationId: orgId },
          { $or: searchConditions }
        ];
        delete query.organizationId;
      }
    }

    const trips = await Trip.find(query).sort({ id: 1 });
    return successResponse(res, trips, "Trips retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single trip by ID within organization
 * @route   GET /api/trips/:id
 * @access  Private
 */
const getTripById = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const tripId = req.params.id.toUpperCase();
    const trip = await Trip.findOne({ id: tripId, organizationId: orgId });

    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    // Role-based verification
    if (req.user.role === "EMPLOYEE") {
      const { driverId, assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      const isAssigned = (driverId && trip.driverId === driverId) ||
                         (assignedVehicleIds && assignedVehicleIds.includes(trip.vehicleId));
      if (!isAssigned) {
        return errorResponse(res, "Access denied to this trip record", 403);
      }
    }

    return successResponse(res, trip, "Trip retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new trip in organization
 * @route   POST /api/trips
 * @access  Private (Admin only)
 */
const createTrip = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    let { id, routeCode, vehicleId, driverId, start, startDestination, end, endDestination, distance, distanceKm, duration, status } = req.body;

    const effectiveStart = (start || startDestination || "").trim();
    const effectiveEnd = (end || endDestination || "").trim();
    const effectiveDistance = distance !== undefined ? distance : distanceKm;

    if (!vehicleId || !effectiveStart || !effectiveEnd || effectiveDistance === undefined || !duration) {
      return errorResponse(res, "Vehicle ID, start, end, distance, and duration are required", 400);
    }

    if (!id && !routeCode) {
      id = await getNextTripId(orgId);
    } else {
      id = (id || routeCode).trim().toUpperCase();
    }

    // Check duplicate ID in organization
    const existing = await Trip.findOne({
      $or: [{ id }, { routeCode: id }],
      organizationId: orgId
    });
    if (existing) {
      return errorResponse(res, `Trip ID '${id}' already exists in your organization`, 409);
    }

    const vId = vehicleId.trim().toUpperCase();
    const vehicle = await Vehicle.findOne({ id: vId, organizationId: orgId });
    if (!vehicle) {
      return errorResponse(res, `Vehicle '${vId}' not found in your organization`, 404);
    }

    // Default driverId to vehicle's currently assigned driver if not specified
    const assignedDriverId = driverId ? driverId.trim().toUpperCase() : vehicle.driverId;
    let driverRef = null;
    if (assignedDriverId) {
      const driverDoc = await Driver.findOne({ id: assignedDriverId, organizationId: orgId });
      if (driverDoc) driverRef = driverDoc._id;
    }

    const newTrip = await Trip.create({
      organizationId: orgId,
      id,
      routeCode: id,
      vehicleId: vId,
      vehicleRef: vehicle._id,
      driverId: assignedDriverId || "",
      driverRef,
      startDestination: effectiveStart,
      start: effectiveStart,
      endDestination: effectiveEnd,
      end: effectiveEnd,
      distanceKm: Number(effectiveDistance),
      distance: Number(effectiveDistance),
      duration: duration.trim(),
      status: status || "On Time"
    });

    // Log activity
    await Activity.create({
      organizationId: orgId,
      icon: "🚚",
      text: `Vehicle ${vId} scheduled for Route ${id} (${effectiveStart} → ${effectiveEnd})`,
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
    const orgId = req.user.organizationId;
    const tripId = req.params.id.toUpperCase();
    const { status } = req.body;

    const validStatuses = ["On Time", "Delayed", "Completed", "Cancelled", "Idle"];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(
        res,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400
      );
    }

    const trip = await Trip.findOne({ id: tripId, organizationId: orgId });
    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    // Check employee authorization
    if (req.user.role === "EMPLOYEE") {
      const { driverId, assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      const isAssigned = (driverId && trip.driverId === driverId) ||
                         (assignedVehicleIds && assignedVehicleIds.includes(trip.vehicleId));
      if (!isAssigned) {
        return errorResponse(res, "You are not authorized to update this trip", 403);
      }
    }

    trip.status = status;
    await trip.save();

    // Log Activity
    const icon = status === "Completed" ? "✅" : status === "Delayed" ? "⚠️" : "🚚";
    await Activity.create({
      organizationId: orgId,
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
    const orgId = req.user.organizationId;
    const tripId = req.params.id.toUpperCase();
    const trip = await Trip.findOne({ id: tripId, organizationId: orgId });

    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    const { vehicleId, driverId, start, end, distance, duration, status } = req.body;

    if (vehicleId) {
      const vId = vehicleId.trim().toUpperCase();
      const vehicle = await Vehicle.findOne({ id: vId, organizationId: orgId });
      if (!vehicle) {
        return errorResponse(res, `Vehicle '${vId}' not found in your organization`, 404);
      }
      trip.vehicleId = vId;
      trip.vehicleRef = vehicle._id;
    }

    if (driverId !== undefined) {
      const dId = driverId.trim().toUpperCase();
      if (dId) {
        const driver = await Driver.findOne({ id: dId, organizationId: orgId });
        if (!driver) {
          return errorResponse(res, `Driver '${dId}' not found in your organization`, 404);
        }
        trip.driverId = dId;
        trip.driverRef = driver._id;
      } else {
        trip.driverId = "";
        trip.driverRef = null;
      }
    }

    if (start) {
      trip.start = start.trim();
      trip.startDestination = start.trim();
    }
    if (end) {
      trip.end = end.trim();
      trip.endDestination = end.trim();
    }
    if (distance !== undefined) {
      trip.distance = Number(distance);
      trip.distanceKm = Number(distance);
    }
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
    const orgId = req.user.organizationId;
    const tripId = req.params.id.toUpperCase();
    const trip = await Trip.findOne({ id: tripId, organizationId: orgId });

    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    await Trip.findOneAndDelete({ id: tripId, organizationId: orgId });

    return successResponse(res, null, "Trip deleted successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Regional Transit Corridors Coordinate Dictionary (Andhra Pradesh, Telangana & Major Hubs)
 */
const CITY_COORDINATES = {
  hyderabad: { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
  secunderabad: { name: "Secunderabad", lat: 17.4399, lng: 78.4983 },
  vijayawada: { name: "Vijayawada", lat: 16.5062, lng: 80.6480 },
  guntur: { name: "Guntur", lat: 16.3067, lng: 80.4365 },
  warangal: { name: "Warangal", lat: 17.9689, lng: 79.5941 },
  visakhapatnam: { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
  khammam: { name: "Khammam", lat: 17.2473, lng: 80.1514 },
  karimnagar: { name: "Karimnagar", lat: 18.4386, lng: 79.1288 },
  nizamabad: { name: "Nizamabad", lat: 18.6725, lng: 78.0941 },
  bengaluru: { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  bangalore: { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  nagpur: { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  mumbai: { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
  pune: { name: "Pune", lat: 18.5204, lng: 73.8567 },
  chennai: { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  delhi: { name: "Delhi", lat: 28.6139, lng: 77.2090 },
  "new delhi": { name: "New Delhi", lat: 28.6139, lng: 77.2090 },
  kolkata: { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  tirupati: { name: "Tirupati", lat: 13.6288, lng: 79.4192 },
  kurnool: { name: "Kurnool", lat: 15.8281, lng: 78.0373 },
  rajahmundry: { name: "Rajahmundry", lat: 17.0005, lng: 81.8040 },
  nellore: { name: "Nellore", lat: 14.4426, lng: 79.9865 },
  kadapa: { name: "Kadapa", lat: 14.4673, lng: 78.8242 },
  anantapur: { name: "Anantapur", lat: 14.6819, lng: 77.6006 }
};

const routeCache = new Map();

/**
 * Validate geographic latitude and longitude values
 */
function isValidLatLng(lat, lng) {
  return typeof lat === "number" && typeof lng === "number" &&
         Number.isFinite(lat) && Number.isFinite(lng) &&
         lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
         !(lat === 0 && lng === 0);
}

/**
 * Resolve location string or object to valid geographic coordinates
 */
function geocodeLocation(locationInput, explicitCoords) {
  // 1. Check explicit coordinates if provided
  if (explicitCoords && typeof explicitCoords === "object") {
    const lat = Number(explicitCoords.lat);
    const lng = Number(explicitCoords.lng);
    if (isValidLatLng(lat, lng)) {
      const name = (typeof locationInput === "string" && locationInput.trim())
        ? locationInput.trim()
        : (locationInput && locationInput.name) || "Waypoint";
      return { name, lat, lng };
    }
  }

  // 2. Check if locationInput itself has coordinates
  if (locationInput && typeof locationInput === "object") {
    const lat = Number(locationInput.lat);
    const lng = Number(locationInput.lng);
    if (isValidLatLng(lat, lng)) {
      const name = locationInput.name || locationInput.address || locationInput.city || "Waypoint";
      return { name, lat, lng };
    }
    locationInput = locationInput.name || locationInput.address || locationInput.city || "";
  }

  if (typeof locationInput !== "string" || !locationInput.trim()) {
    return null;
  }

  const clean = locationInput.trim().toLowerCase();

  // 3. Exact dictionary match
  if (CITY_COORDINATES[clean]) {
    return { ...CITY_COORDINATES[clean] };
  }

  // 4. Token / substring dictionary match
  for (const [key, coord] of Object.entries(CITY_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return { name: locationInput.trim(), lat: coord.lat, lng: coord.lng };
    }
  }

  // No arbitrary fake coordinates
  return null;
}

/**
 * Calculate or retrieve highway route for a trip
 */
async function resolveTripRoadRoute(trip, forceRefresh = false) {
  // Resolve origin and destination coordinates safely
  const origin = geocodeLocation(
    trip.start || trip.startDestination,
    trip.startCoordinates
  );
  const destination = geocodeLocation(
    trip.end || trip.endDestination,
    trip.endCoordinates
  );

  const startName = (origin && origin.name) || trip.start || trip.startDestination || "Origin";
  const endName = (destination && destination.name) || trip.end || trip.endDestination || "Destination";

  // When coordinates cannot be resolved, return safe response without drawing fake routes
  if (!origin || !destination || !isValidLatLng(origin.lat, origin.lng) || !isValidLatLng(destination.lat, destination.lng)) {
    return {
      available: false,
      tripId: trip.id,
      vehicleId: trip.vehicleId || "",
      driverId: trip.driverId || "",
      status: trip.status || "On Time",
      origin: origin || { name: startName, lat: null, lng: null },
      destination: destination || { name: endName, lat: null, lng: null },
      distanceKm: trip.distance || trip.distanceKm || 0,
      durationFormatted: trip.duration || "N/A",
      coordinates: [],
      isRoadRoute: false,
      message: "Route coordinates are unavailable for this trip."
    };
  }

  const cacheKey = `${trip.id}_${origin.lat}_${origin.lng}_${destination.lat}_${destination.lng}`.toLowerCase();
  if (forceRefresh) {
    routeCache.delete(cacheKey);
  } else if (routeCache.has(cacheKey)) {
    const cached = routeCache.get(cacheKey);
    return {
      available: true,
      tripId: trip.id,
      vehicleId: trip.vehicleId || "",
      driverId: trip.driverId || "",
      status: trip.status || "On Time",
      ...cached
    };
  }

  let coordinates = [];
  let calculatedDistanceKm = trip.distance || trip.distanceKm || 0;
  let formattedDuration = trip.duration || "N/A";
  let isRoadRoute = false;

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const osrmRes = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "FleetFlow-App/1.0" }
    });
    clearTimeout(timeout);

    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      if (osrmData.code === "Ok" && osrmData.routes && osrmData.routes.length > 0) {
        const bestRoute = osrmData.routes[0];
        coordinates = bestRoute.geometry.coordinates.map((c) => [c[1], c[0]]);
        calculatedDistanceKm = parseFloat((bestRoute.distance / 1000).toFixed(1));

        const totalMinutes = Math.round(bestRoute.duration / 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        formattedDuration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        isRoadRoute = true;
      }
    }
  } catch (err) {
    console.warn(`OSRM routing failed for trip ${trip.id}:`, err.message);
  }

  if (!coordinates.length) {
    coordinates = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng]
    ];
    isRoadRoute = false;
  }

  const cachedData = {
    origin: { name: origin.name, lat: origin.lat, lng: origin.lng },
    destination: { name: destination.name, lat: destination.lat, lng: destination.lng },
    distanceKm: calculatedDistanceKm,
    durationFormatted: formattedDuration,
    coordinates,
    isRoadRoute,
    cachedAt: new Date().toISOString(),
    vehicleGpsFeed: null
  };

  if (isRoadRoute) {
    routeCache.set(cacheKey, cachedData);
  }

  return {
    available: true,
    tripId: trip.id,
    vehicleId: trip.vehicleId || "",
    driverId: trip.driverId || "",
    status: trip.status || "On Time",
    ...cachedData
  };
}

/**
 * @desc    Get real road route geometry & coordinates for a trip
 * @route   GET /api/trips/:id/route
 * @access  Private (Admin or Assigned Employee)
 */
const getTripRoute = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const tripId = req.params.id.toUpperCase();
    const trip = await Trip.findOne({ id: tripId, organizationId: orgId });

    if (!trip) {
      return errorResponse(res, "Trip not found", 404);
    }

    // Verify employee authorization
    if (req.user.role === "EMPLOYEE") {
      const { driverId, assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      const isAssigned =
        (driverId && trip.driverId === driverId) ||
        (assignedVehicleIds && assignedVehicleIds.includes(trip.vehicleId));
      if (!isAssigned) {
        return errorResponse(res, "Access denied to this trip route", 403);
      }
    }

    const forceRefresh = req.query.retry === "true" || req.query.refresh === "true";
    const routeData = await resolveTripRoadRoute(trip, forceRefresh);
    return successResponse(res, routeData, "Route calculated successfully");
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
  deleteTrip,
  getTripRoute
};
