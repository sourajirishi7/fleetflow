const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, "Vehicle ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    make: {
      type: String,
      required: [true, "Vehicle make is required"],
      trim: true
    },
    model: {
      type: String,
      required: [true, "Vehicle model is required"],
      trim: true
    },
    plate: {
      type: String,
      required: [true, "License plate is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    year: {
      type: Number,
      required: [true, "Manufacturing year is required"],
      min: [1980, "Year must be 1980 or later"],
      max: [2030, "Year cannot be far in the future"]
    },
    odometer: {
      type: Number,
      required: [true, "Odometer reading is required"],
      min: [0, "Odometer cannot be negative"],
      default: 0
    },
    fuelType: {
      type: String,
      enum: {
        values: ["Diesel", "Petrol", "CNG", "Electric"],
        message: "Fuel type must be Diesel, Petrol, CNG, or Electric"
      },
      default: "Diesel"
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Idle", "In Shop", "Offline"],
        message: "Status must be Active, Idle, In Shop, or Offline"
      },
      default: "Active"
    },
    driverId: {
      type: String,
      trim: true,
      default: ""
    },
    lastService: {
      type: String,
      default: () => new Date().toISOString().split("T")[0]
    },
    nextService: {
      type: String,
      default: () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return d.toISOString().split("T")[0];
      }
    }
  },
  {
    timestamps: true
  }
);

vehicleSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

module.exports = Vehicle;
