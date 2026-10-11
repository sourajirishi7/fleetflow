const MaintenanceRecord = require("../models/MaintenanceRecord");
const Vehicle = require("../models/Vehicle");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * Generate next Maintenance ID (e.g., M11)
 */
const getNextMaintenanceId = async () => {
  const records = await MaintenanceRecord.find({}, "id");
  const nums = records.map((r) => {
    const raw = String(r.id).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return "M" + String(max + 1).padStart(2, "0");
};

/**
 * @desc    Get all maintenance records
 * @route   GET /api/maintenance
 * @access  Private
 */
const getMaintenanceRecords = async (req, res, next) => {
  try {
    const { vehicleId, status } = req.query;
    let query = {};

    if (vehicleId && vehicleId !== "all") {
      query.vehicleId = vehicleId;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const records = await MaintenanceRecord.find(query).sort({ date: 1, createdAt: -1 });

    // Dynamic overdue status recalculation
    const today = new Date().toISOString().split("T")[0];
    const updatedRecords = records.map((r) => {
      const obj = r.toJSON();
      if (obj.status !== "Completed" && obj.date < today) {
        obj.status = "Overdue";
      }
      return obj;
    });

    return successResponse(res, updatedRecords, "Maintenance records retrieved");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Schedule new maintenance service
 * @route   POST /api/maintenance
 * @access  Private (Admin only)
 */
const createMaintenanceRecord = async (req, res, next) => {
  try {
    let { id, vehicleId, type, date, cost, priority, notes } = req.body;

    if (!vehicleId || !type || !date) {
      return errorResponse(res, "Vehicle, service type, and scheduled date are required", 400);
    }

    const vId = vehicleId.trim().toUpperCase();
    const vehicle = await Vehicle.findOne({ id: vId });
    if (!vehicle) {
      return errorResponse(res, `Vehicle '${vId}' not found`, 404);
    }

    if (!id) {
      id = await getNextMaintenanceId();
    } else {
      id = id.trim().toUpperCase();
    }

    const today = new Date().toISOString().split("T")[0];
    const status = date < today ? "Overdue" : "Upcoming";

    const newTicket = await MaintenanceRecord.create({
      id,
      vehicleId: vId,
      type,
      date,
      cost: Number(cost) || 0,
      priority: priority || "Medium",
      status,
      notes: notes ? notes.trim() : ""
    });

    // Update vehicle's next service or status if high priority
    if (priority === "High" && vehicle.status === "Active") {
      vehicle.status = "In Shop";
      await vehicle.save();
    }

    // Log Activity
    await Activity.create({
      icon: "🔧",
      text: `Maintenance scheduled for ${vId} (${type})`,
      time: "Just now",
      status: "Warning"
    });

    return successResponse(res, newTicket, "Maintenance scheduled successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update maintenance record status
 * @route   PATCH /api/maintenance/:id/status
 * @access  Private (Admin only)
 */
const updateMaintenanceStatus = async (req, res, next) => {
  try {
    const recordId = req.params.id.toUpperCase();
    const { status } = req.body;

    if (!["Overdue", "Upcoming", "Completed"].includes(status)) {
      return errorResponse(res, "Status must be Overdue, Upcoming, or Completed", 400);
    }

    const record = await MaintenanceRecord.findOne({ id: recordId });
    if (!record) {
      return errorResponse(res, "Maintenance record not found", 404);
    }

    record.status = status;
    await record.save();

    // If marked Completed, update vehicle's last service date and status if was In Shop
    if (status === "Completed") {
      const today = new Date().toISOString().split("T")[0];
      const vehicle = await Vehicle.findOne({ id: record.vehicleId });
      if (vehicle) {
        vehicle.lastService = today;
        if (vehicle.status === "In Shop") {
          vehicle.status = "Active";
        }
        await vehicle.save();
      }
    }

    return successResponse(res, record, `Maintenance ticket marked as ${status}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete maintenance record
 * @route   DELETE /api/maintenance/:id
 * @access  Private (Admin only)
 */
const deleteMaintenanceRecord = async (req, res, next) => {
  try {
    const recordId = req.params.id.toUpperCase();
    const record = await MaintenanceRecord.findOneAndDelete({ id: recordId });

    if (!record) {
      return errorResponse(res, "Maintenance record not found", 404);
    }

    return successResponse(res, null, `Maintenance record ${recordId} deleted successfully`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceStatus,
  deleteMaintenanceRecord
};
