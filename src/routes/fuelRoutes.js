const express = require("express");
const {
  getFuelEntries,
  createFuelEntry,
  getWeeklyFuelSummary,
  deleteFuelEntry
} = require("../controllers/fuelController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/weekly-summary", getWeeklyFuelSummary);

router.route("/")
  .get(getFuelEntries)
  .post(requireAdmin, createFuelEntry);

router.route("/:id")
  .delete(requireAdmin, deleteFuelEntry);

module.exports = router;
