const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");
const MaintenanceRecord = require("../models/MaintenanceRecord");
const FuelEntry = require("../models/FuelEntry");
const Activity = require("../models/Activity");
const { successResponse } = require("../utils/response");
const { getEmployeeAccessContext } = require("../utils/rbac");

/**
 * @desc    Get live dashboard statistics and KPI metrics (Organization & Role-scoped)
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7);

    // ==========================================
    // EMPLOYEE ROLE SCOPING: ONLY ASSIGNED DATA
    // ==========================================
    if (req.user.role === "EMPLOYEE") {
      const { driver, driverId, assignedVehicleIds } = await getEmployeeAccessContext(req.user);

      const hasVehicles = assignedVehicleIds && assignedVehicleIds.length > 0;
      const assignedVehicles = hasVehicles ? await Vehicle.find({ id: { $in: assignedVehicleIds }, organizationId: orgId }) : [];

      const activeVehicles = assignedVehicles.filter((v) => v.status === "Active").length;
      const idleVehicles = assignedVehicles.filter((v) => v.status === "Idle" || v.status === "Offline").length;
      const inShopVehicles = assignedVehicles.filter((v) => v.status === "In Shop").length;

      // Scoped trip query within organization
      const tripConditions = [];
      if (driverId) tripConditions.push({ driverId, organizationId: orgId });
      if (hasVehicles) tripConditions.push({ vehicleId: { $in: assignedVehicleIds }, organizationId: orgId });

      const tripQuery = tripConditions.length > 0 ? { $or: tripConditions } : { _id: null };

      const [activeTrips, completedTrips] = await Promise.all([
        Trip.countDocuments({ ...tripQuery, status: { $in: ["On Time", "Delayed"] } }),
        Trip.countDocuments({ ...tripQuery, status: "Completed" })
      ]);

      // Scoped maintenance for assigned vehicles
      const overdueMaintenance = hasVehicles
        ? await MaintenanceRecord.countDocuments({
            organizationId: orgId,
            vehicleId: { $in: assignedVehicleIds },
            status: { $ne: "Completed" },
            date: { $lt: today }
          })
        : 0;

      // Scoped fuel spend for assigned vehicles
      let fuelEntries = hasVehicles
        ? await FuelEntry.find({ organizationId: orgId, vehicleId: { $in: assignedVehicleIds }, date: { $regex: `^${currentMonth}` } }, "cost")
        : [];

      let monthlyFuelSpend = fuelEntries.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
      if (monthlyFuelSpend === 0 && hasVehicles) {
        const allEmpEntries = await FuelEntry.find({ organizationId: orgId, vehicleId: { $in: assignedVehicleIds } }, "cost");
        monthlyFuelSpend = allEmpEntries.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
      }

      const totalV = assignedVehicles.length || 1;
      const onRoutePct = Math.round((activeVehicles / totalV) * 100);
      const idlePct = Math.round((idleVehicles / totalV) * 100);
      const inShopPct = Math.max(0, 100 - onRoutePct - idlePct);

      return successResponse(res, {
        isEmployee: true,
        totalVehicles: assignedVehicles.length,
        activeVehicles,
        idleVehicles,
        inShopVehicles,
        totalDrivers: driver ? 1 : 0,
        activeDrivers: driver && driver.status === "Active" ? 1 : 0,
        activeTrips,
        inTransitTrips: activeTrips,
        completedTrips,
        overdueMaintenance,
        monthlyFuelSpend,
        assignedVehicle: assignedVehicles[0] ? assignedVehicles[0].id : null,
        statusBreakdown: {
          onRoutePct,
          idlePct,
          inShopPct
        }
      }, "Employee scoped statistics retrieved");
    }

    // ==========================================
    // ADMIN ROLE: ORGANIZATION-SCOPED METRICS
    // ==========================================
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
      Vehicle.countDocuments({ organizationId: orgId }),
      Vehicle.countDocuments({ organizationId: orgId, status: "Active" }),
      Vehicle.countDocuments({ organizationId: orgId, status: { $in: ["Idle", "Offline"] } }),
      Vehicle.countDocuments({ organizationId: orgId, status: "In Shop" }),
      Driver.countDocuments({ organizationId: orgId }),
      Driver.countDocuments({ organizationId: orgId, status: "Active" }),
      Trip.countDocuments({ organizationId: orgId, status: { $in: ["On Time", "Delayed"] } }),
      Trip.countDocuments({ organizationId: orgId, status: "Completed" }),
      MaintenanceRecord.countDocuments({
        organizationId: orgId,
        status: { $ne: "Completed" },
        date: { $lt: today }
      }),
      FuelEntry.find({ organizationId: orgId, date: { $regex: `^${currentMonth}` } }, "cost")
    ]);

    let monthlyFuelSpend = fuelEntries.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
    if (monthlyFuelSpend === 0) {
      const allEntries = await FuelEntry.find({ organizationId: orgId }, "cost");
      monthlyFuelSpend = allEntries.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
    }

    const fleetTotal = totalVehicles || 0;
    const onRoutePct = fleetTotal > 0 ? Math.round((activeVehicles / fleetTotal) * 100) : 0;
    const idlePct = fleetTotal > 0 ? Math.round((idleVehicles / fleetTotal) * 100) : 0;
    const inShopPct = fleetTotal > 0 ? Math.max(0, 100 - onRoutePct - idlePct) : 0;

    return successResponse(res, {
      isEmployee: false,
      totalVehicles,
      activeVehicles,
      idleVehicles,
      inShopVehicles,
      totalDrivers,
      activeDrivers,
      activeTrips,
      inTransitTrips: activeTrips,
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
 * @desc    Get live recent activity feed (Organization & Role-scoped)
 * @route   GET /api/dashboard/activities
 * @access  Private
 */
const getActivities = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    let query = { organizationId: orgId };

    if (req.user.role === "EMPLOYEE") {
      const { driver, driverId, assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      const identifiers = [];
      if (driverId) identifiers.push(driverId);
      if (driver && driver.name) identifiers.push(driver.name);
      if (assignedVehicleIds && assignedVehicleIds.length > 0) {
        identifiers.push(...assignedVehicleIds);
      }

      if (identifiers.length === 0) {
        return successResponse(res, [], "No activities for this employee");
      }

      const regexPattern = identifiers.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      query.text = { $regex: regexPattern, $options: "i" };
    }

    const activities = await Activity.find(query).sort({ createdAt: -1 }).limit(15);
    return successResponse(res, activities, "Recent activities retrieved");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getActivities
};
