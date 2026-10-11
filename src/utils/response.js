/**
 * Standard API Response utilities
 */

const successResponse = (res, data = null, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, message = "An error occurred", statusCode = 500, errors = null) => {
  const payload = {
    success: false,
    message
  };
  if (errors) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  errorResponse
};
