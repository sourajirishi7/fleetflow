const { errorResponse } = require("../utils/response");

/**
 * 404 Route Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  if (req.originalUrl.startsWith("/api/")) {
    return errorResponse(res, `API route not found: ${req.method} ${req.originalUrl}`, 404);
  }
  // For web routes, if not found, send index.html or 404
  return res.status(404).send("Page not found");
};

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return errorResponse(res, "Validation error", 400, messages);
  }

  // Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const val = err.keyValue ? err.keyValue[field] : "";
    return errorResponse(res, `Duplicate value '${val}' for field '${field}'. Must be unique.`, 409);
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    return errorResponse(res, `Resource not found with id: ${err.value}`, 404);
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, "Invalid authentication token", 401);
  }
  if (err.name === "TokenExpiredError") {
    return errorResponse(res, "Authentication token has expired. Please log in again.", 401);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  return errorResponse(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === "development" ? err.stack : undefined
  );
};

module.exports = {
  notFoundHandler,
  errorHandler
};
