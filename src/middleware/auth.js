const { verifyToken, COOKIE_NAME } = require("../utils/jwt");
const { errorResponse } = require("../utils/response");
const User = require("../models/User");

/**
 * Authentication Middleware: ensures user is logged in and active
 */
const requireAuth = async (req, res, next) => {
  let token = null;

  // 1. Try reading from cookie
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }
  // 2. Try reading from Authorization Bearer header
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return errorResponse(res, "Authentication required. Please log in.", 401);
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return errorResponse(res, "Account no longer exists.", 401);
    }

    if (user.status !== "Active") {
      return errorResponse(res, "This account is deactivated. Please contact an administrator.", 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return errorResponse(res, "Session has expired. Please log in again.", 401);
    }
    return errorResponse(res, "Invalid authentication token. Please log in again.", 401);
  }
};

/**
 * Role-based Authorization Middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Authentication required.", 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Requires one of the following roles: ${roles.join(", ")}.`,
        403
      );
    }

    next();
  };
};

const requireAdmin = requireRole("ADMIN");

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin
};
