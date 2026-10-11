const express = require("express");
const {
  getMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceStatus,
  deleteMaintenanceRecord
} = require("../controllers/maintenanceController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(getMaintenanceRecords)
  .post(createMaintenanceRecord);


router.route("/:id")
  .delete(requireAdmin, deleteMaintenanceRecord);

router.patch("/:id/status", requireAdmin, updateMaintenanceStatus);

module.exports = router;
