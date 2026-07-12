const express = require("express");
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
} = require("../controllers/usercontroller");
const { isAuthenticated } = require("../middlewares/auth");
const authorizeRoles = require("../middlewares/role");

const router = express.Router();

router.use(isAuthenticated);
router.use(authorizeRoles("SUPER_ADMIN"));

router.route("/").post(createEmployee).get(getEmployees);

router
  .route("/:id")
  .get(getEmployeeById)
  .put(updateEmployee)
  .delete(deleteEmployee);

router.patch("/:id/status", toggleEmployeeStatus);

module.exports = router;
