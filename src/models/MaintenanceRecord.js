const mongoose = require("mongoose");

const maintenanceRecordSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true
    },
    id: {
      type: String,
      required: [true, "Maintenance ID is required"],
      trim: true,
      uppercase: true
    },
    vehicleId: {
      type: String,
      required: [true, "Vehicle ID is required"],
      trim: true,
      index: true
    },
    vehicleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    maintenanceType: {
      type: String,
      enum: {
        values: [
          "Oil Change",
          "Brake Inspection",
          "Tire Rotation",
          "Engine Service",
          "Battery Replacement",
          "AC Service",
          "General Inspection"
        ],
        message: "Invalid maintenance type"
      }
    },
    type: {
      type: String
    },
    serviceDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"]
    },
    date: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"]
    },
    cost: {
      type: Number,
      required: [true, "Cost is required"],
      min: [0, "Cost cannot be negative"]
    },
    priority: {
      type: String,
      enum: {
        values: ["Low", "Medium", "High"],
        message: "Priority must be Low, Medium, or High"
      },
      default: "Medium"
    },
    status: {
      type: String,
      enum: {
        values: ["Overdue", "Upcoming", "Completed"],
        message: "Status must be Overdue, Upcoming, or Completed"
      },
      default: "Upcoming"
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Sync aliases
maintenanceRecordSchema.pre("validate", function (next) {
  if (this.type && !this.maintenanceType) this.maintenanceType = this.type;
  if (this.maintenanceType && !this.type) this.type = this.maintenanceType;
  if (this.date && !this.serviceDate) this.serviceDate = this.date;
  if (this.serviceDate && !this.date) this.date = this.serviceDate;
  if (this.notes && !this.description) this.description = this.notes;
  if (this.description && !this.notes) this.notes = this.description;
  next();
});

// Compound unique index per organization
maintenanceRecordSchema.index({ organizationId: 1, id: 1 }, { unique: true });

maintenanceRecordSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  if (!obj.type) obj.type = obj.maintenanceType;
  if (!obj.maintenanceType) obj.maintenanceType = obj.type;
  if (!obj.date) obj.date = obj.serviceDate;
  if (!obj.serviceDate) obj.serviceDate = obj.date;
  if (!obj.notes) obj.notes = obj.description;
  if (!obj.description) obj.description = obj.notes;
  return obj;
};

const MaintenanceRecord = mongoose.model("MaintenanceRecord", maintenanceRecordSchema);

module.exports = MaintenanceRecord;
