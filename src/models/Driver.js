const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true
    },
    id: {
      type: String,
      required: [true, "Driver ID is required"],
      trim: true,
      uppercase: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    fullName: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      trim: true,
      uppercase: true
    },
    license: {
      type: String,
      trim: true,
      uppercase: true
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"]
    },
    shiftStatus: {
      type: String,
      enum: {
        values: ["Active", "Off-Duty"],
        message: "Shift status must be Active or Off-Duty"
      },
      default: "Active"
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Off-Duty"],
        message: "Status must be Active or Off-Duty"
      },
      default: "Active"
    },
    safetyScore: {
      type: Number,
      required: [true, "Safety score is required"],
      min: [0, "Safety score must be between 0 and 100"],
      max: [100, "Safety score must be between 0 and 100"],
      default: 90
    },
    safety: {
      type: Number,
      default: 90
    },
    vehicleId: {
      type: String,
      trim: true,
      default: ""
    },
    vehicleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Sync aliases
driverSchema.pre("validate", function (next) {
  if (this.fullName && !this.name) this.name = this.fullName;
  if (this.name && !this.fullName) this.fullName = this.name;
  if (this.licenseNumber && !this.license) this.license = this.licenseNumber;
  if (this.license && !this.licenseNumber) this.licenseNumber = this.license;
  if (this.shiftStatus && !this.status) this.status = this.shiftStatus;
  if (this.status && !this.shiftStatus) this.shiftStatus = this.status;
  if (this.safetyScore !== undefined && this.safety === undefined) this.safety = this.safetyScore;
  if (this.safety !== undefined && this.safetyScore === undefined) this.safetyScore = this.safety;
  next();
});

// Compound unique indexes per organization
driverSchema.index({ organizationId: 1, id: 1 }, { unique: true });
driverSchema.index({ organizationId: 1, licenseNumber: 1 }, { unique: true });

driverSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  if (!obj.name) obj.name = obj.fullName;
  if (!obj.fullName) obj.fullName = obj.name;
  if (!obj.license) obj.license = obj.licenseNumber;
  if (!obj.licenseNumber) obj.licenseNumber = obj.license;
  if (!obj.status) obj.status = obj.shiftStatus;
  if (!obj.shiftStatus) obj.shiftStatus = obj.status;
  if (obj.safety === undefined) obj.safety = obj.safetyScore;
  if (obj.safetyScore === undefined) obj.safetyScore = obj.safety;
  return obj;
};

const Driver = mongoose.model("Driver", driverSchema);

module.exports = Driver;
