const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      index: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      index: true
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false // Excluded by default from query results for security
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true
    },
    name: {
      // Alias for backwards compatibility with existing frontend
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: {
        values: ["ADMIN", "EMPLOYEE"],
        message: "Role must be either ADMIN or EMPLOYEE"
      },
      default: "EMPLOYEE"
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive"],
        message: "Status must be either Active or Inactive"
      },
      default: "Active"
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    driverId: {
      type: String,
      trim: true,
      default: ""
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

// Pre-save synchronization between fullName/name and isActive/status
userSchema.pre("validate", function (next) {
  if (this.fullName && !this.name) {
    this.name = this.fullName;
  } else if (this.name && !this.fullName) {
    this.fullName = this.name;
  }
  if (this.isActive !== undefined && this.status === undefined) {
    this.status = this.isActive ? "Active" : "Inactive";
  } else if (this.status !== undefined && this.isActive === undefined) {
    this.isActive = this.status === "Active";
  }
  next();
});

// Hash password before saving if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Safe JSON serialization (strip password and passwordHash)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  // Ensure both name and fullName exist on output
  if (!obj.name) obj.name = obj.fullName;
  if (!obj.fullName) obj.fullName = obj.name;
  return obj;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
