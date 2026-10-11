const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return successResponse(res, users, "Users retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin or Self)
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }
    return successResponse(res, user, "User retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new user (e.g. employee)
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
const createUser = async (req, res, next) => {
  try {
    const { username, email, password, name, role, phone, driverId } = req.body;

    if (!username || !email || !password || !name) {
      return errorResponse(res, "Username, email, password, and name are required", 400);
    }

    if (password.length < 6) {
      return errorResponse(res, "Password must be at least 6 characters long", 400);
    }

    // Check duplicate username
    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      return errorResponse(res, "Username is already taken", 409);
    }

    // Check duplicate email
    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return errorResponse(res, "Email is already registered", 409);
    }

    // Default to EMPLOYEE unless valid role specified by Admin
    const assignedRole = role === "ADMIN" ? "ADMIN" : "EMPLOYEE";

    const newUser = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
      role: assignedRole,
      phone: phone ? phone.trim() : "",
      driverId: driverId ? driverId.trim() : "",
      status: "Active"
    });

    return successResponse(res, newUser.toJSON(), "User created successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, phone, role, status, driverId } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (role && ["ADMIN", "EMPLOYEE"].includes(role)) user.role = role;
    if (status && ["Active", "Inactive"].includes(status)) user.status = status;
    if (driverId !== undefined) user.driverId = driverId.trim();

    await user.save();

    return successResponse(res, user.toJSON(), "User updated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Change user status (Active / Inactive)
 * @route   PATCH /api/users/:id/status
 * @access  Private (Admin only)
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !["Active", "Inactive"].includes(status)) {
      return errorResponse(res, "Status must be either 'Active' or 'Inactive'", 400);
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === req.params.id && status === "Inactive") {
      return errorResponse(res, "Administrators cannot deactivate their own account", 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    user.status = status;
    await user.save();

    return successResponse(res, user.toJSON(), `User account status changed to ${status}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return errorResponse(res, "Administrators cannot delete their own account", 400);
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, null, "User deleted successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser
};
