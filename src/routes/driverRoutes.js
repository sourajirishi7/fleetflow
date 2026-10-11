const express = require("express");
const {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  reassignDriver,
  deleteDriver
} = require("../controllers/driverController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(getDrivers)
  .post(requireAdmin, createDriver);

router.route("/:id")
  .get(getDriverById)
  .put(requireAdmin, updateDriver)
  .delete(requireAdmin, deleteDriver);

router.patch("/:id/assign", requireAdmin, reassignDriver);

module.exports = router;
