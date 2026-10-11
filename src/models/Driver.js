const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, "Driver ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true
    },
    license: {
      type: String,
      required: [true, "License number is required"],
      unique: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"]
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Off-Duty"],
        message: "Status must be Active or Off-Duty"
      },
      default: "Active"
    },
    safety: {
      type: Number,
      required: [true, "Safety score is required"],
      min: [70, "Safety score must be between 70 and 100"],
      max: [100, "Safety score must be between 70 and 100"],
      default: 90
    },
    vehicleId: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

driverSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Driver = mongoose.model("Driver", driverSchema);

module.exports = Driver;
