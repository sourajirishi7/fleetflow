const MaintenanceRecord = require("../models/MaintenanceRecord");
const Vehicle = require("../models/Vehicle");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");
const { getEmployeeAccessContext } = require("../utils/rbac");

/**
 * Generate next Maintenance ID within organization (e.g., M11)
 */
const getNextMaintenanceId = async (organizationId) => {
  const records = await MaintenanceRecord.find({ organizationId }, "id");
  const nums = records.map((r) => {
    const raw = String(r.id).replace(/\D/g, "");
    return Number(raw) || 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return "M" + String(max + 1).padStart(2, "0");
};

/**
 * @desc    Get maintenance records (Admin: all org, Employee: assigned vehicle only)
 * @route   GET /api/maintenance
 * @access  Private
 */
const getMaintenanceRecords = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { vehicleId, status } = req.query;
    let query = { organizationId: orgId };

    // Role-based access restriction
    if (req.user.role === "EMPLOYEE") {
      const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      if (!assignedVehicleIds || assignedVehicleIds.length === 0) {
        return successResponse(res, [], "No maintenance records for assigned vehicle");
      }
      query.vehicleId = { $in: assignedVehicleIds };
    }

    if (vehicleId && vehicleId !== "all") {
      const targetVId = vehicleId.trim().toUpperCase();
      if (req.user.role === "EMPLOYEE") {
        const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
        if (!assignedVehicleIds.includes(targetVId)) {
          return errorResponse(res, "Access denied to maintenance records for this vehicle", 403);
        }
      }
      query.vehicleId = targetVId;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    const records = await MaintenanceRecord.find(query).sort({ date: 1, createdAt: -1 });

    // Dynamic overdue status recalculation
    const today = new Date().toISOString().split("T")[0];
    const updatedRecords = records.map((r) => {
      const obj = r.toJSON();
      if (obj.status !== "Completed" && (obj.date || obj.serviceDate) < today) {
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
 * @desc    Schedule new maintenance service (Admin: any, Employee: assigned vehicle only)
 * @route   POST /api/maintenance
 * @access  Private
 */
const createMaintenanceRecord = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    let { id, vehicleId, type, maintenanceType, date, serviceDate, cost, priority, notes, description } = req.body;

    const effectiveType = type || maintenanceType;
    const effectiveDate = date || serviceDate;
    const effectiveDesc = notes || description;

    if (!vehicleId || !effectiveType || !effectiveDate) {
      return errorResponse(res, "Vehicle, service type, and scheduled date are required", 400);
    }

    const vId = vehicleId.trim().toUpperCase();

    // Verify employee authorization
    if (req.user.role === "EMPLOYEE") {
      const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      if (!assignedVehicleIds || !assignedVehicleIds.includes(vId)) {
        return errorResponse(res, "You are only authorized to schedule service for your assigned vehicle", 403);
      }
    }

    const vehicle = await Vehicle.findOne({ id: vId, organizationId: orgId });
    if (!vehicle) {
      return errorResponse(res, `Vehicle '${vId}' not found in your organization`, 404);
    }

    if (!id) {
      id = await getNextMaintenanceId(orgId);
    } else {
      id = id.trim().toUpperCase();
    }

    // Check duplicate ID in organization
    const existing = await MaintenanceRecord.findOne({ id, organizationId: orgId });
    if (existing) {
      return errorResponse(res, `Maintenance ID '${id}' already exists in your organization`, 409);
    }

    const today = new Date().toISOString().split("T")[0];
    const initialStatus = effectiveDate < today ? "Overdue" : "Upcoming";

    const newRecord = await MaintenanceRecord.create({
      organizationId: orgId,
      id,
      vehicleId: vId,
      vehicleRef: vehicle._id,
      reportedBy: req.user._id,
      maintenanceType: effectiveType,
      type: effectiveType,
      serviceDate: effectiveDate,
      date: effectiveDate,
      cost: cost !== undefined ? Number(cost) : 0,
      priority: priority || "Medium",
      status: initialStatus,
      description: effectiveDesc ? effectiveDesc.trim() : "",
      notes: effectiveDesc ? effectiveDesc.trim() : ""
    });

    // Log Activity
    await Activity.create({
      organizationId: orgId,
      icon: "🔧",
      text: `Maintenance scheduled for ${vId}: ${effectiveType} (${effectiveDate})`,
      time: "Just now",
      status: initialStatus === "Overdue" ? "Alert" : "Info"
    });

    return successResponse(res, newRecord, "Maintenance record created successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update maintenance record status
 * @route   PATCH /api/maintenance/:id/status
 * @access  Private
 */
const updateMaintenanceStatus = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const recordId = req.params.id.toUpperCase();
    const { status } = req.body;

    const validStatuses = ["Upcoming", "Overdue", "Completed"];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(
        res,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400
      );
    }

    const record = await MaintenanceRecord.findOne({ id: recordId, organizationId: orgId });
    if (!record) {
      return errorResponse(res, "Maintenance record not found", 404);
    }

    // Role check for Employee
    if (req.user.role === "EMPLOYEE") {
      const { assignedVehicleIds } = await getEmployeeAccessContext(req.user);
      if (!assignedVehicleIds || !assignedVehicleIds.includes(record.vehicleId)) {
        return errorResponse(res, "Access denied to update this maintenance record", 403);
      }
    }

    record.status = status;
    await record.save();

    // Log Activity
    const icon = status === "Completed" ? "✅" : status === "Overdue" ? "⚠️" : "🔧";
    await Activity.create({
      organizationId: orgId,
      icon,
      text: `Maintenance ${record.id} for ${record.vehicleId} marked as ${status}`,
      time: "Just now",
      status: status === "Completed" ? "On-Time" : status === "Overdue" ? "Warning" : "Info"
    });

    return successResponse(res, record, `Maintenance record marked as ${status}`);
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
    const orgId = req.user.organizationId;
    const recordId = req.params.id.toUpperCase();
    const record = await MaintenanceRecord.findOne({ id: recordId, organizationId: orgId });

    if (!record) {
      return errorResponse(res, "Maintenance record not found", 404);
    }

    await MaintenanceRecord.findOneAndDelete({ id: recordId, organizationId: orgId });

    return successResponse(res, null, "Maintenance record deleted successfully");
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
