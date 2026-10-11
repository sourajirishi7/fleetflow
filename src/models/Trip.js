const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, "Trip/Route ID is required"],
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
    driverId: {
      type: String,
      trim: true,
      default: "",
      index: true
    },
    start: {
      type: String,
      required: [true, "Start destination is required"],
      trim: true
    },
    end: {
      type: String,
      required: [true, "End destination is required"],
      trim: true
    },
    distance: {
      type: Number,
      required: [true, "Distance in km is required"],
      min: [0, "Distance cannot be negative"]
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

tripSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Trip = mongoose.model("Trip", tripSchema);

module.exports = Trip;
