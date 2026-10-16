const User = require("../models/User");
const Organization = require("../models/Organization");
const { sendTokenResponse, clearTokenCookie, verifyToken, COOKIE_NAME } = require("../utils/jwt");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * @desc    Register a new Organization and Administrator account
 * @route   POST /api/auth/register-admin
 * @access  Protected / Authorized Setup
 */
const registerAdmin = async (req, res, next) => {
  let createdOrg = null;
  try {
    const organizationName = req.body.organizationName || req.body.orgName;
    const name = req.body.name || req.body.adminFullName || req.body.fullName;
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!organizationName || !name || !username || !email || !password) {
      return errorResponse(res, "Organization name, full name, username, email, and password are required", 400);
    }

    if (password.length < 6) {
      return errorResponse(res, "Password must be at least 6 characters long", 400);
    }

    // 1. Resolve caller session (cookie or Bearer token) if not already set on req.user
    let caller = req.user;
    if (!caller) {
      const token = req.cookies?.[COOKIE_NAME] ||
        (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null);
      if (token) {
        try {
          const decoded = verifyToken(token);
          caller = await User.findById(decoded.id);
        } catch {}
      }
    }

    // 2. Explicitly prevent employees from creating organizations or admins
    if (caller && caller.role === "EMPLOYEE") {
      return errorResponse(res, "Access denied. Employees cannot create organizations or administrator accounts.", 403);
    }

    // 3. Extract setup authorization key from headers or request body
    const submittedKey =
      req.headers["x-setup-key"] ||
      req.headers["x-initial-setup-key"] ||
      req.body.setupKey ||
      req.body.setupSecret;

    // Load server-side secret key from INITIAL_SETUP_KEY
    const configuredKey = process.env.INITIAL_SETUP_KEY || process.env.ADMIN_SETUP_SECRET;
    const hasValidKey = Boolean(
      configuredKey &&
      submittedKey &&
      typeof submittedKey === "string" &&
      submittedKey.trim() === configuredKey.trim()
    );

    const isCallerAdmin = caller && caller.role === "ADMIN";
    const totalAdmins = await User.countDocuments({ role: "ADMIN" });
    const isPublicRegistrationAllowed = process.env.ALLOW_PUBLIC_REGISTRATION === "true";

    // 4. Authorization check:
    // Only an authenticated ADMIN, a caller providing the valid server-side INITIAL_SETUP_KEY,
    // or an environment explicitly permitting public registration may register
    if (!isCallerAdmin && !hasValidKey && !isPublicRegistrationAllowed) {
      if (totalAdmins > 0) {
        return errorResponse(
          res,
          "Public organization registration is disabled. Creating an organization requires an authorized administrator session or a valid setup key.",
          403
        );
      } else {
        return errorResponse(
          res,
          "Initial system setup required. Please use the server-side administrator setup process or provide a valid INITIAL_SETUP_KEY.",
          403
        );
      }
    }

    // Check duplicate username or email
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ username: trimmedUsername }, { email: trimmedEmail }]
    });

    if (existingUser) {
      const field = existingUser.username === trimmedUsername ? "Username" : "Email";
      return errorResponse(res, `${field} is already taken`, 409);
    }

    // Step 1: Create Organization document
    createdOrg = await Organization.create({
      name: organizationName.trim(),
      code: organizationName.trim().slice(0, 6).toUpperCase().replace(/\s+/g, "")
    });

    // Step 2: Create Admin User document
    const newAdmin = await User.create({
      organizationId: createdOrg._id,
      fullName: name.trim(),
      name: name.trim(),
      username: trimmedUsername,
      email: trimmedEmail,
      password,
      role: "ADMIN",
      isActive: true,
      status: "Active"
    });

    // Step 3: Link creator back to Organization
    createdOrg.createdBy = newAdmin._id;
    await createdOrg.save();

    return sendTokenResponse(
      res,
      newAdmin,
      201,
      `Organization '${createdOrg.name}' and Administrator '${newAdmin.username}' created successfully`
    );
  } catch (err) {
    // Compensation rollback if user creation failed after org creation
    if (createdOrg && createdOrg._id) {
      await Organization.findByIdAndDelete(createdOrg._id).catch(() => {});
    }
    next(err);
  }
};

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
    if (!user.isActive || user.status === "Inactive") {
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
 * @desc    Get current authenticated user info with organization context
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("organizationId", "name code");
    const userObj = user.toJSON();
    if (user.organizationId) {
      userObj.organization = {
        id: user.organizationId._id,
        name: user.organizationId.name,
        code: user.organizationId.code
      };
    }
    return successResponse(res, userObj, "Current user retrieved");
  } catch (err) {
    next(err);
  }
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

    if (name) {
      user.name = name.trim();
      user.fullName = name.trim();
    }
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
  registerAdmin,
  login,
  logout,
  getMe,
  updateProfile
};
