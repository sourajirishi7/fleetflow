const FuelEntry = require("../models/FuelEntry");
const Vehicle = require("../models/Vehicle");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Generate next Fuel Entry ID (e.g., F12)
 */
const getNextFuelId = async () => {
  const entries = await FuelEntry.find({}, "id");
  const nums = entries.map((e) => {
    const raw = String(e.id).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return "F" + String(max + 1).padStart(2, "0");
};

/**
 * @desc    Get all fuel entries with filters
 * @route   GET /api/fuel
 * @access  Private
 */
const getFuelEntries = async (req, res, next) => {
  try {
    const { vehicleId, date, search } = req.query;
    let query = {};

    if (vehicleId && vehicleId !== "all") {
      query.vehicleId = vehicleId;
    }

    if (date) {
      query.date = date;
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { vehicleId: regex },
        { date: regex },
        { id: regex }
      ];
    }

    const entries = await FuelEntry.find(query).sort({ date: -1, createdAt: -1 });
    return successResponse(res, entries, "Fuel entries retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new fuel entry
 * @route   POST /api/fuel
 * @access  Private (Admin only)
 */
const createFuelEntry = async (req, res, next) => {
  try {
    let { id, vehicleId, date, liters, cost, odometer } = req.body;

    if (!vehicleId || !date || liters === undefined || cost === undefined || odometer === undefined) {
      return errorResponse(res, "Vehicle, date, liters, cost, and odometer are required", 400);
    }

    const vId = vehicleId.trim().toUpperCase();
    const vehicle = await Vehicle.findOne({ id: vId });
    if (!vehicle) {
      return errorResponse(res, `Vehicle '${vId}' not found`, 404);
    }

    const numOdo = Number(odometer);
    if (vehicle.odometer && numOdo < vehicle.odometer) {
      return errorResponse(
        res,
        `Odometer reading (${numOdo}) cannot be lower than the current reading (${vehicle.odometer} km)`,
        400
      );
    }

    if (!id) {
      id = await getNextFuelId();
    } else {
      id = id.trim().toUpperCase();
    }

    const newEntry = await FuelEntry.create({
      id,
      vehicleId: vId,
      date,
      liters: Number(liters),
      cost: Number(cost),
      odometer: numOdo
    });

    // Update vehicle's current odometer reading
    if (numOdo > vehicle.odometer) {
      vehicle.odometer = numOdo;
      await vehicle.save();
    }

    // Log activity
    await Activity.create({
      icon: "⛽",
      text: `Fuel entry added for ${vId} (${liters} L, ₹${cost})`,
      time: "Just now",
      status: "Info"
    });

    return successResponse(res, newEntry, "Fuel entry added successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get fuel summary for the last 7 days
 * @route   GET /api/fuel/weekly-summary
 * @access  Private
 */
const getWeeklyFuelSummary = async (req, res, next) => {
  try {
    // Generate dates for the last 7 days
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = days[d.getDay()];
      last7Days.push({ date: dateStr, day: dayName, liters: 0 });
    }

    // Aggregate from fuel entries
    const startDate = last7Days[0].date;
    const entries = await FuelEntry.find({ date: { $gte: startDate } });

    entries.forEach((entry) => {
      const match = last7Days.find((d) => d.date === entry.date);
      if (match) {
        match.liters += entry.liters;
      }
    });

    // If database is new or has no recent entries in current week, supply sensible defaults or calculated entries
    const hasData = last7Days.some((d) => d.liters > 0);
    let result = last7Days.map((d) => ({ day: d.day, liters: Math.round(d.liters) }));

    if (!hasData) {
      // Look at any existing entries
      const allEntries = await FuelEntry.find().limit(20);
      if (allEntries.length > 0) {
        // Group by day name
        const dayMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        allEntries.forEach((e) => {
          const d = new Date(e.date);
          const name = days[d.getDay()];
          if (dayMap[name] !== undefined) dayMap[name] += e.liters;
        });
        result = Object.keys(dayMap).map((name) => ({ day: name, liters: Math.round(dayMap[name]) }));
      }
    }

    return successResponse(res, result, "Weekly fuel summary retrieved");
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
    const entryId = req.params.id.toUpperCase();
    const entry = await FuelEntry.findOneAndDelete({ id: entryId });

    if (!entry) {
      return errorResponse(res, "Fuel entry not found", 404);
    }

    return successResponse(res, null, `Fuel entry ${entryId} deleted successfully`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFuelEntries,
  createFuelEntry,
  getWeeklyFuelSummary,
  deleteFuelEntry
};
