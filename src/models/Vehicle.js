const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true
    },
    id: {
      type: String,
      required: [true, "Vehicle ID is required"],
      trim: true,
      uppercase: true
    },
    registrationNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    plate: {
      type: String,
      trim: true,
      uppercase: true
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
    year: {
      type: Number,
      required: [true, "Manufacturing year is required"],
      min: [1980, "Year must be 1980 or later"],
      max: [2035, "Year cannot be far in the future"]
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
    driverRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null
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

// Sync registrationNumber and plate
vehicleSchema.pre("validate", function (next) {
  if (this.plate && !this.registrationNumber) {
    this.registrationNumber = this.plate;
  } else if (this.registrationNumber && !this.plate) {
    this.plate = this.registrationNumber;
  }
  next();
});

// Compound unique indexes per organization
vehicleSchema.index({ organizationId: 1, id: 1 }, { unique: true });
vehicleSchema.index({ organizationId: 1, registrationNumber: 1 }, { unique: true });

vehicleSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  if (!obj.plate) obj.plate = obj.registrationNumber;
  if (!obj.registrationNumber) obj.registrationNumber = obj.plate;
  return obj;
};

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

module.exports = Vehicle;
