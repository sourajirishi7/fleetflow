const User = require("../models/User");
const Driver = require("../models/Driver");
const Activity = require("../models/Activity");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * @desc    Get all users in authenticated organization
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
const getUsers = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const users = await User.find({ organizationId: orgId }).sort({ createdAt: -1 });
    return successResponse(res, users, "Users retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single user by ID within organization
 * @route   GET /api/users/:id
 * @access  Private (Admin or Self)
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Organization data isolation check
    if (user.organizationId && req.user.organizationId && user.organizationId.toString() !== req.user.organizationId.toString()) {
      return errorResponse(res, "Access denied. User belongs to another organization.", 403);
    }

    // Role check: Employee can only view themselves
    if (req.user.role === "EMPLOYEE" && req.user._id.toString() !== user._id.toString()) {
      return errorResponse(res, "Access denied.", 403);
    }

    return successResponse(res, user, "User retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new employee user in authenticated organization
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
const createUser = async (req, res, next) => {
  try {
    const { username, email, password, name, fullName, phone, driverId, grantLogin } = req.body;
    const effectiveName = (name || fullName || "").trim();

    // If grantLogin is explicitly disabled, reject user account creation
    if (grantLogin === false || grantLogin === "false") {
      return errorResponse(res, "Employee login access is disabled. Cannot create user account without login access.", 400);
    }

    if (!username || !email || !password || !effectiveName) {
      return errorResponse(res, "Username, email, password, and name are required", 400);
    }

    if (password.length < 6) {
      return errorResponse(res, "Password must be at least 6 characters long", 400);
    }

    // Obtain organizationId strictly from authenticated admin session
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return errorResponse(res, "Admin is not associated with an organization", 400);
    }

    // Check duplicate username globally/in-org
    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      return errorResponse(res, "Username is already taken", 409);
    }

    // Check duplicate email
    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return errorResponse(res, "Email is already registered", 409);
    }

    // Validate driver linking if provided (links to existing driver without duplicate creation)
    let linkedDriver = null;
    if (driverId && driverId.trim()) {
      const dId = driverId.trim().toUpperCase();
      linkedDriver = await Driver.findOne({ id: dId, organizationId });
      if (!linkedDriver) {
        return errorResponse(res, `Driver profile '${dId}' not found in your organization`, 404);
      }
      // Check if driver is already linked to another user account
      const existingLinkedUser = await User.findOne({ driverId: dId, organizationId });
      if (existingLinkedUser) {
        return errorResponse(res, `Driver '${dId}' is already linked to user account '${existingLinkedUser.username}'`, 409);
      }
    }

    // Force role to EMPLOYEE on backend (prevent role escalation)
    const newUser = await User.create({
      organizationId,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      fullName: effectiveName,
      name: effectiveName,
      role: "EMPLOYEE",
      phone: phone ? phone.trim() : "",
      driverId: linkedDriver ? linkedDriver.id : "",
      isActive: true,
      status: "Active",
      createdBy: req.user._id
    });

    // Synchronize two-way link in existing Driver model with compensation rollback
    if (linkedDriver) {
      try {
        linkedDriver.userId = newUser._id;
        await linkedDriver.save();
      } catch (linkErr) {
        await User.findByIdAndDelete(newUser._id);
        throw linkErr;
      }
    }

    // Log Activity
    await Activity.create({
      organizationId,
      icon: "👤",
      text: `Employee account '${newUser.username}' was created by Admin`,
      time: "Just now",
      status: "Info"
    }).catch(() => {});

    return successResponse(res, newUser.toJSON(), "Employee user created successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user within organization
 * @route   PUT /api/users/:id
 * @access  Private (Admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, fullName, phone, role, status, isActive, driverId } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Organization data isolation
    if (user.organizationId && req.user.organizationId && user.organizationId.toString() !== req.user.organizationId.toString()) {
      return errorResponse(res, "Access denied to cross-organization user", 403);
    }

    const effectiveName = (name || fullName);
    if (effectiveName) {
      user.name = effectiveName.trim();
      user.fullName = effectiveName.trim();
    }
    if (phone !== undefined) user.phone = phone.trim();
    if (role && ["ADMIN", "EMPLOYEE"].includes(role)) user.role = role;
    if (status && ["Active", "Inactive"].includes(status)) {
      user.status = status;
      user.isActive = status === "Active";
    }
    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
      user.status = user.isActive ? "Active" : "Inactive";
    }
    if (driverId !== undefined) user.driverId = driverId.trim();

    await user.save();

    return successResponse(res, user.toJSON(), "User updated successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Change user status (Active / Inactive) within organization
 * @route   PATCH /api/users/:id/status
 * @access  Private (Admin only)
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { status, isActive } = req.body;
    let targetStatus = status;
    if (!targetStatus && isActive !== undefined) {
      targetStatus = isActive ? "Active" : "Inactive";
    }

    if (!targetStatus || !["Active", "Inactive"].includes(targetStatus)) {
      return errorResponse(res, "Status must be either 'Active' or 'Inactive'", 400);
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === req.params.id && targetStatus === "Inactive") {
      return errorResponse(res, "Administrators cannot deactivate their own account", 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Organization boundary
    if (user.organizationId && req.user.organizationId && user.organizationId.toString() !== req.user.organizationId.toString()) {
      return errorResponse(res, "Access denied to cross-organization user", 403);
    }

    user.status = targetStatus;
    user.isActive = targetStatus === "Active";
    await user.save();

    return successResponse(res, user.toJSON(), `User account status changed to ${targetStatus}`);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete user within organization
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return errorResponse(res, "Administrators cannot delete their own account", 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Organization boundary
    if (user.organizationId && req.user.organizationId && user.organizationId.toString() !== req.user.organizationId.toString()) {
      return errorResponse(res, "Access denied to cross-organization user", 403);
    }

    await User.findByIdAndDelete(req.params.id);

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
