const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true
    },
    icon: {
      type: String,
      default: "🚚"
    },
    text: {
      type: String,
      required: [true, "Activity text is required"]
    },
    time: {
      type: String,
      default: "Just now"
    },
    status: {
      type: String,
      default: "Info"
    }
  },
  {
    timestamps: true
  }
);

activitySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Activity = mongoose.model("Activity", activitySchema);

module.exports = Activity;
