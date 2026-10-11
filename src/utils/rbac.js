const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");

/**
 * Resolve verified employee context based on authenticated server session within their organization.
 * Traces schema relationships: User -> Driver (by userId, driverId, phone) -> Vehicle
 * 
 * @param {Object} user - The authenticated Mongoose User document (req.user)
 * @returns {Promise<Object>} Access context object:
 *   - isEmployee: boolean
 *   - driver: Driver document or null
 *   - driverId: string or null (e.g. "D001")
 *   - assignedVehicleIds: Array of string IDs (e.g. ["FL-101"])
 */
async function getEmployeeAccessContext(user) {
  if (!user || user.role === "ADMIN") {
    return {
      isEmployee: false,
      driver: null,
      driverId: null,
      assignedVehicleIds: []
    };
  }

  const orgId = user.organizationId;
  let driver = null;

  // 1. Direct relationship lookup by Driver.userId
  if (user._id) {
    driver = await Driver.findOne({ userId: user._id, organizationId: orgId });
  }

  // 2. Lookup by user.driverId within organization
  if (!driver && user.driverId) {
    driver = await Driver.findOne({ id: user.driverId.toUpperCase(), organizationId: orgId });
  }

  // 3. Fallback lookup by verified phone or name within organization
  if (!driver && user.phone) {
    driver = await Driver.findOne({ phone: user.phone, organizationId: orgId });
  }
  if (!driver && (user.fullName || user.name)) {
    driver = await Driver.findOne({
      $or: [{ fullName: user.fullName || user.name }, { name: user.name || user.fullName }],
      organizationId: orgId
    });
  }

  // If driver found and user.driverId was missing, backfill reference safely
  if (driver && !user.driverId) {
    user.driverId = driver.id;
    await user.save().catch(() => {});
  }

  const driverId = driver ? driver.id : null;
  const assignedVehicleIds = [];

  if (driver) {
    if (driver.vehicleId) {
      assignedVehicleIds.push(driver.vehicleId.toUpperCase());
    }

    // Find any vehicles directly assigned to this driver within organization
    const vehiclesAssigned = await Vehicle.find({ driverId: driver.id, organizationId: orgId }, "id");
    vehiclesAssigned.forEach((v) => {
      const vid = v.id.toUpperCase();
      if (!assignedVehicleIds.includes(vid)) {
        assignedVehicleIds.push(vid);
      }
    });
  }

  return {
    isEmployee: true,
    driver,
    driverId,
    assignedVehicleIds
  };
}

module.exports = {
  getEmployeeAccessContext
};
