const mongoose = require("mongoose");

const maintenanceRecordSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, "Maintenance ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    vehicleId: {
      type: String,
      required: [true, "Vehicle ID is required"],
      trim: true,
      index: true
    },
    type: {
      type: String,
      required: [true, "Service type is required"],
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
    date: {
      type: String,
      required: [true, "Scheduled date is required"],
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

maintenanceRecordSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const MaintenanceRecord = mongoose.model("MaintenanceRecord", maintenanceRecordSchema);

module.exports = MaintenanceRecord;
