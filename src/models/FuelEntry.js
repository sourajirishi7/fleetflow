const mongoose = require("mongoose");

const fuelEntrySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, "Fuel Entry ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    date: {
      type: String,
      required: [true, "Date is required"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"]
    },
    vehicleId: {
      type: String,
      required: [true, "Vehicle ID is required"],
      trim: true,
      index: true
    },
    liters: {
      type: Number,
      required: [true, "Fuel volume in liters is required"],
      min: [0.1, "Liters must be greater than zero"]
    },
    cost: {
      type: Number,
      required: [true, "Fuel cost is required"],
      min: [0, "Cost cannot be negative"]
    },
    odometer: {
      type: Number,
      required: [true, "Odometer reading is required"],
      min: [0, "Odometer cannot be negative"]
    }
  },
  {
    timestamps: true
  }
);

fuelEntrySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const FuelEntry = mongoose.model("FuelEntry", fuelEntrySchema);

module.exports = FuelEntry;
