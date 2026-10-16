const express = require("express");
const rateLimit = require("express-rate-limit");
const { registerAdmin, login, logout, getMe, updateProfile } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Rate limiter for login: max 15 requests per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: "Too many login attempts from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/register-admin", loginLimiter, registerAdmin);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);
router.put("/profile", requireAuth, updateProfile);

module.exports = router;
