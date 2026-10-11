const express = require("express");
const {
  getTrips,
  getTripById,
  createTrip,
  updateTripStatus,
  updateTrip,
  deleteTrip
} = require("../controllers/tripController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(getTrips)
  .post(requireAdmin, createTrip);

router.route("/:id")
  .get(getTripById)
  .put(requireAdmin, updateTrip)
  .delete(requireAdmin, deleteTrip);

// Both Admin and assigned Employees can update trip status
router.patch("/:id/status", updateTripStatus);

module.exports = router;
