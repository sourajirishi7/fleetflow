const FuelEntry = require("../models/FuelEntry");
const Vehicle = require("../models/Vehicle");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");
const { getEmployeeAccessContext } = require("../utils/rbac");

/**
 * Generate next Fuel Entry ID within organization (e.g., F12)
 */
const getNextFuelId = async (organizationId) => {
  const entries = await FuelEntry.find({ organizationId }, "id");
  const nums = entries.map((e) => {
    const raw = String(e.id).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return "F" + String(max + 1).padStart(2, "0");
};

/**
 * @desc    Get fuel entries (Admin: all org fuel, Employee: assigned vehicle only)
 * @route   GET /api/fuel
 * @access  Private
 */
const getFuelEntries = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { vehicleId, date, search } = req.query;
    let query = { organizationId: orgId };

    // Role-based access restriction
    if (req.user.role === "EMPLOYEE") {
      const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      if (!assignedVehicleIds || assignedVehicleIds.length === 0) {
        return successResponse(res, [], "No fuel records for assigned vehicle");
      }
      query.vehicleId = { $in: assignedVehicleIds };
    }

    if (vehicleId && vehicleId !== "all") {
      const targetVId = vehicleId.trim().toUpperCase();
      if (req.user.role === "EMPLOYEE") {
        const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
        if (!assignedVehicleIds.includes(targetVId)) {
          return errorResponse(res, "Access denied to fuel records for this vehicle", 403);
        }
      }
      query.vehicleId = targetVId;
    }

    if (date) {
      query.$or = [{ date }, { fuelDate: date }];
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      const searchConditions = [
        { vehicleId: regex },
        { date: regex },
        { fuelDate: regex },
        { id: regex }
      ];

      if (query.vehicleId) {
        query.$and = [
          { organizationId: orgId },
          { vehicleId: query.vehicleId },
          { $or: searchConditions }
        ];
        delete query.vehicleId;
        delete query.organizationId;
      } else {
        query.$and = [
          { organizationId: orgId },
          { $or: searchConditions }
        ];
        delete query.organizationId;
      }
    }

    const entries = await FuelEntry.find(query).sort({ date: -1, createdAt: -1 });
    return successResponse(res, entries, "Fuel entries retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new fuel entry (Admin: any in org, Employee: assigned vehicle only)
 * @route   POST /api/fuel
 * @access  Private
 */
const createFuelEntry = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    let { id, vehicleId, date, fuelDate, liters, quantityLitres, cost, totalCost, pricePerLitre, odometer, odometerKm, notes } = req.body;

    const effectiveDate = date || fuelDate;
    const effectiveLiters = liters !== undefined ? liters : quantityLitres;
    let effectiveCost = cost !== undefined ? cost : totalCost;
    const effectiveOdo = odometer !== undefined ? odometer : odometerKm;

    if (!vehicleId || !effectiveDate || effectiveLiters === undefined || effectiveOdo === undefined) {
      return errorResponse(res, "Vehicle, date, liters, and odometer reading are required", 400);
    }

    const vId = vehicleId.trim().toUpperCase();

    // Verify employee authorization to log fuel for this vehicle
    if (req.user.role === "EMPLOYEE") {
      const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      if (!assignedVehicleIds || !assignedVehicleIds.includes(vId)) {
        return errorResponse(res, "You are only authorized to log fuel for your assigned vehicle", 403);
      }
    }

    // Verify vehicle belongs to organization
    const vehicle = await Vehicle.findOne({ id: vId, organizationId: orgId });
    if (!vehicle) {
      return errorResponse(res, `Vehicle '${vId}' not found in your organization`, 404);
    }

    // Validate odometer reading against vehicle's current odometer
    const odoNum = Number(effectiveOdo);
    if (odoNum < vehicle.odometer) {
      return errorResponse(
        res,
        `Odometer reading (${odoNum} km) cannot be less than the current vehicle odometer (${vehicle.odometer} km)`,
        400
      );
    }

    // Validate/calculate totalCost on server
    const litNum = Number(effectiveLiters);
    if (litNum <= 0) {
      return errorResponse(res, "Fuel quantity in liters must be greater than zero", 400);
    }

    if (pricePerLitre && (!effectiveCost || Number(effectiveCost) === 0)) {
      effectiveCost = parseFloat((litNum * Number(pricePerLitre)).toFixed(2));
    } else if (effectiveCost === undefined) {
      return errorResponse(res, "Fuel cost is required", 400);
    }

    if (!id) {
      id = await getNextFuelId(orgId);
    } else {
      id = id.trim().toUpperCase();
    }

    // Check duplicate ID in organization
    const existing = await FuelEntry.findOne({ id, organizationId: orgId });
    if (existing) {
      return errorResponse(res, `Fuel entry ID '${id}' already exists in your organization`, 409);
    }

    const newEntry = await FuelEntry.create({
      organizationId: orgId,
      id,
      vehicleId: vId,
      vehicleRef: vehicle._id,
      submittedBy: req.user._id,
      date: effectiveDate,
      fuelDate: effectiveDate,
      liters: litNum,
      quantityLitres: litNum,
      pricePerLitre: pricePerLitre ? Number(pricePerLitre) : null,
      cost: Number(effectiveCost),
      totalCost: Number(effectiveCost),
      odometer: odoNum,
      odometerKm: odoNum,
      notes: notes ? notes.trim() : ""
    });

    // Update vehicle's odometer reading
    vehicle.odometer = odoNum;
    await vehicle.save();

    // Log Activity
    await Activity.create({
      organizationId: orgId,
      icon: "⛽",
      text: `Fuel logged for ${vId}: ${litNum}L (₹${Number(effectiveCost).toLocaleString()})`,
      time: "Just now",
      status: "Info"
    });

    return successResponse(res, newEntry, "Fuel entry created successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get 7-day fuel consumption and cost trends within organization
 * @route   GET /api/fuel/weekly-summary
 * @access  Private
 */
const getWeeklySummary = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    let vehicleFilter = { organizationId: orgId };

    if (req.user.role === "EMPLOYEE") {
      const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      vehicleFilter.vehicleId = { $in: assignedVehicleIds || [] };
    }

    const entries = await FuelEntry.find(vehicleFilter).sort({ date: -1 }).limit(30);

    const dayTotals = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = days[d.getDay()];
      dayTotals[dateStr] = { day: dayName, date: dateStr, liters: 0, cost: 0 };
    }

    entries.forEach((e) => {
      const entryDate = e.date || e.fuelDate;
      if (dayTotals[entryDate]) {
        dayTotals[entryDate].liters += e.liters || e.quantityLitres || 0;
        dayTotals[entryDate].cost += e.cost || e.totalCost || 0;
      }
    });

    const summary = Object.values(dayTotals);
    return successResponse(res, summary, "Weekly summary retrieved");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete fuel entry
 * @route   DELETE /api/fuel/:id
 * @access  Private (Admin only)
 */
const deleteFuelEntry = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const entryId = req.params.id.toUpperCase();
    const entry = await FuelEntry.findOne({ id: entryId, organizationId: orgId });

    if (!entry) {
      return errorResponse(res, "Fuel entry not found", 404);
    }

    await FuelEntry.findOneAndDelete({ id: entryId, organizationId: orgId });
    return successResponse(res, null, "Fuel entry deleted successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFuelEntries,
  createFuelEntry,
  getWeeklySummary,
  getWeeklyFuelSummary: getWeeklySummary,
  deleteFuelEntry
};
