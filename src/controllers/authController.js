const User = require("../models/User");
const { sendTokenResponse, clearTokenCookie } = require("../utils/jwt");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * @desc    Login user & issue JWT cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, "Please provide username/email and password", 400);
    }

    const trimmedIdentifier = username.trim().toLowerCase();

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: username.trim() },
        { email: trimmedIdentifier }
      ]
    }).select("+password");

    if (!user) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    // Check account status
    if (user.status !== "Active") {
      return errorResponse(res, "This account is deactivated. Please contact an administrator.", 403);
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    return sendTokenResponse(res, user, 200, "Login successful");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Logout user & clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res) => {
  clearTokenCookie(res);
  return successResponse(res, null, "Logged out successfully");
};

/**
 * @desc    Get current authenticated user info
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  return successResponse(res, req.user, "Current user retrieved");
};

/**
 * @desc    Update profile for currently authenticated user
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    if (newPassword) {
      if (!currentPassword) {
        return errorResponse(res, "Current password is required to set a new password", 400);
      }
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return errorResponse(res, "Current password does not match", 400);
      }
      if (newPassword.length < 6) {
        return errorResponse(res, "New password must be at least 6 characters", 400);
      }
      user.password = newPassword;
    }

    await user.save();

    return successResponse(res, user.toJSON(), "Profile updated successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  logout,
  getMe,
  updateProfile
};
