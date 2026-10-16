const jwt = require("jsonwebtoken");

const COOKIE_NAME = "fleetflow_token";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable must be set in production");
    }
    // Development fallback only — never use in production
    return "default_development_secret_fleetflow_2026";
  }
  return process.env.JWT_SECRET;
};

/**
 * Generate a JWT token for a user
 */
const generateToken = (user) => {
  const payload = {
    id: user._id,
    username: user.username,
    role: user.role
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
};

/**
 * Verify a JWT token
 */
const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

/**
 * Attach HTTP-only cookie and send response
 */
const sendTokenResponse = (res, user, statusCode = 200, message = "Authentication successful") => {
  const token = generateToken(user);

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true" || isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  };

  res.cookie(COOKIE_NAME, token, cookieOptions);

  // Only expose raw token in non-production environments (API testing convenience)
  const responseBody = {
    success: true,
    message,
    ...(isProduction ? {} : { token }), // omit token from body in production
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      phone: user.phone,
      driverId: user.driverId
    }
  };

  return res.status(statusCode).json(responseBody);
};

/**
 * Clear the authentication cookie
 */
const clearTokenCookie = (res) => {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "lax"
  });
};

module.exports = {
  COOKIE_NAME,
  generateToken,
  verifyToken,
  sendTokenResponse,
  clearTokenCookie
};
