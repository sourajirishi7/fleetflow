const express = require("express");
const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle
} = require("../controllers/vehicleController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.route("/")
  .get(getVehicles)
  .post(requireAdmin, createVehicle);

router.route("/:id")
  .get(getVehicleById)
  .put(requireAdmin, updateVehicle)
  .delete(requireAdmin, deleteVehicle);

module.exports = router;
