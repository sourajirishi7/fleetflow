const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true
    },
    routeCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    id: {
      type: String,
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
    driverId: {
      type: String,
      trim: true,
      default: "",
      index: true
    },
    driverRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null
    },
    startDestination: {
      type: String,
      trim: true
    },
    start: {
      type: String,
      trim: true
    },
    endDestination: {
      type: String,
      trim: true
    },
    end: {
      type: String,
      trim: true
    },
    startCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    },
    endCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    },
    startTime: {
      type: Date,
      default: null
    },
    endTime: {
      type: Date,
      default: null
    },
    distanceKm: {
      type: Number,
      min: [0, "Distance cannot be negative"]
    },
    distance: {
      type: Number,
      min: [0, "Distance cannot be negative"]
    },
    durationMinutes: {
      type: Number,
      default: null
    },
    duration: {
      type: String,
      required: [true, "Duration is required"],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ["On Time", "Delayed", "Completed", "Cancelled", "Idle"],
        message: "Status must be On Time, Delayed, Completed, Cancelled, or Idle"
      },
      default: "On Time"
    }
  },
  {
    timestamps: true
  }
);

// Sync aliases
tripSchema.pre("validate", function (next) {
  if (this.id && !this.routeCode) this.routeCode = this.id;
  if (this.routeCode && !this.id) this.id = this.routeCode;
  if (this.start && !this.startDestination) this.startDestination = this.start;
  if (this.startDestination && !this.start) this.start = this.startDestination;
  if (this.end && !this.endDestination) this.endDestination = this.end;
  if (this.endDestination && !this.end) this.end = this.endDestination;
  if (this.distance !== undefined && this.distanceKm === undefined) this.distanceKm = this.distance;
  if (this.distanceKm !== undefined && this.distance === undefined) this.distance = this.distanceKm;
  next();
});

// Compound unique index per organization
tripSchema.index({ organizationId: 1, routeCode: 1 }, { unique: true });

tripSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  if (!obj.id) obj.id = obj.routeCode;
  if (!obj.routeCode) obj.routeCode = obj.id;
  if (!obj.start) obj.start = obj.startDestination;
  if (!obj.startDestination) obj.startDestination = obj.start;
  if (!obj.end) obj.end = obj.endDestination;
  if (!obj.endDestination) obj.endDestination = obj.end;
  if (obj.distance === undefined) obj.distance = obj.distanceKm;
  if (obj.distanceKm === undefined) obj.distanceKm = obj.distance;
  return obj;
};

const Trip = mongoose.model("Trip", tripSchema);

module.exports = Trip;
