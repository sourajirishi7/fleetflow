const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      minlength: [2, "Organization name must be at least 2 characters"],
      maxlength: [100, "Organization name cannot exceed 100 characters"]
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

organizationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Organization = mongoose.model("Organization", organizationSchema);

module.exports = Organization;
