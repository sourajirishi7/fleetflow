const express = require("express");
const { getDashboardStats, getActivities } = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/stats", getDashboardStats);
router.get("/activities", getActivities);

module.exports = router;
