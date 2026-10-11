const mongoose = require("mongoose");

const fuelEntrySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true
    },
    id: {
      type: String,
      required: [true, "Fuel Entry ID is required"],
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
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    quantityLitres: {
      type: Number,
      min: [0.1, "Liters must be greater than zero"]
    },
    liters: {
      type: Number,
      min: [0.1, "Liters must be greater than zero"]
    },
    pricePerLitre: {
      type: Number,
      default: null
    },
    totalCost: {
      type: Number,
      min: [0, "Cost cannot be negative"]
    },
    cost: {
      type: Number,
      min: [0, "Cost cannot be negative"]
    },
    odometerKm: {
      type: Number,
      min: [0, "Odometer cannot be negative"]
    },
    odometer: {
      type: Number,
      min: [0, "Odometer cannot be negative"]
    },
    fuelDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"]
    },
    date: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"]
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
fuelEntrySchema.pre("validate", function (next) {
  if (this.liters !== undefined && this.quantityLitres === undefined) this.quantityLitres = this.liters;
  if (this.quantityLitres !== undefined && this.liters === undefined) this.liters = this.quantityLitres;
  if (this.cost !== undefined && this.totalCost === undefined) this.totalCost = this.cost;
  if (this.totalCost !== undefined && this.cost === undefined) this.cost = this.totalCost;
  if (this.odometer !== undefined && this.odometerKm === undefined) this.odometerKm = this.odometer;
  if (this.odometerKm !== undefined && this.odometer === undefined) this.odometer = this.odometerKm;
  if (this.date && !this.fuelDate) this.fuelDate = this.date;
  if (this.fuelDate && !this.date) this.date = this.fuelDate;

  // Calculate totalCost if pricePerLitre is provided and totalCost is not explicitly set
  if (this.quantityLitres && this.pricePerLitre && (!this.totalCost || this.totalCost === 0)) {
    this.totalCost = parseFloat((this.quantityLitres * this.pricePerLitre).toFixed(2));
    this.cost = this.totalCost;
  }
  next();
});

// Compound unique index per organization
fuelEntrySchema.index({ organizationId: 1, id: 1 }, { unique: true });

fuelEntrySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  if (obj.liters === undefined) obj.liters = obj.quantityLitres;
  if (obj.quantityLitres === undefined) obj.quantityLitres = obj.liters;
  if (obj.cost === undefined) obj.cost = obj.totalCost;
  if (obj.totalCost === undefined) obj.totalCost = obj.cost;
  if (obj.odometer === undefined) obj.odometer = obj.odometerKm;
  if (obj.odometerKm === undefined) obj.odometerKm = obj.odometer;
  if (!obj.date) obj.date = obj.fuelDate;
  if (!obj.fuelDate) obj.fuelDate = obj.date;
  return obj;
};

const FuelEntry = mongoose.model("FuelEntry", fuelEntrySchema);

module.exports = FuelEntry;
