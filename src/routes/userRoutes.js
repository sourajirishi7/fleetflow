const express = require("express");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser
} = require("../controllers/userController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// All user management routes require valid authentication and ADMIN privileges
router.use(requireAuth);
router.use(requireAdmin);

router.route("/")
  .get(getUsers)
  .post(createUser);

router.route("/:id")
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

router.patch("/:id/status", toggleUserStatus);

module.exports = router;
