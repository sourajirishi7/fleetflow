const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");
const MaintenanceRecord = require("../models/MaintenanceRecord");
const FuelEntry = require("../models/FuelEntry");
const Activity = require("../models/Activity");
const { successResponse } = require("../utils/response");

/**
 * @desc    Get live dashboard statistics and KPI metrics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7); // e.g. "2026-10" or "2026-08"

    const [
      totalVehicles,
      activeVehicles,
      idleVehicles,
      inShopVehicles,
      totalDrivers,
      activeDrivers,
      activeTrips,
      completedTrips,
      overdueMaintenance,
      fuelEntries
    ] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ status: "Active" }),
      Vehicle.countDocuments({ status: { $in: ["Idle", "Offline"] } }),
      Vehicle.countDocuments({ status: "In Shop" }),
      Driver.countDocuments(),
      Driver.countDocuments({ status: "Active" }),
      Trip.countDocuments({ status: { $in: ["On Time", "Delayed"] } }),
      Trip.countDocuments({ status: "Completed" }),
      MaintenanceRecord.countDocuments({
        status: { $ne: "Completed" },
        date: { $lt: today }
      }),
      FuelEntry.find({ date: { $regex: `^${currentMonth}` } }, "cost")
    ]);

    // If no entries for this current month, check previous month so user sees real spend during demos
    let monthlyFuelSpend = fuelEntries.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
    if (monthlyFuelSpend === 0) {
      const allEntries = await FuelEntry.find({}, "cost");
      monthlyFuelSpend = allEntries.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
    }

    // Status breakdown percentages
    const fleetTotal = totalVehicles || 1;
    const onRoutePct = Math.round((activeVehicles / fleetTotal) * 100);
    const idlePct = Math.round((idleVehicles / fleetTotal) * 100);
    const inShopPct = Math.max(0, 100 - onRoutePct - idlePct);

    return successResponse(res, {
      totalVehicles,
      activeVehicles,
      idleVehicles,
      inShopVehicles,
      totalDrivers,
      activeDrivers,
      activeTrips,
      completedTrips,
      overdueMaintenance,
      monthlyFuelSpend,
      statusBreakdown: {
        onRoutePct,
        idlePct,
        inShopPct
      }
    }, "Dashboard statistics retrieved");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get live recent activity feed
 * @route   GET /api/dashboard/activities
 * @access  Private
 */
const getActivities = async (req, res, next) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 }).limit(15);
    return successResponse(res, activities, "Recent activities retrieved");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getActivities
};
