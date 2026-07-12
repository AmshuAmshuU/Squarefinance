const express = require("express");
const router = express.Router();
const {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} = require("../controllers/todoController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

router.use(isAuthenticated);

router
  .route("/")
  .get(getTodos)
  .post(authorizeRoles("SUPER_ADMIN", "ADMIN"), createTodo);

router
  .route("/:id")
  .patch(authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"), updateTodo)
  .delete(authorizeRoles("SUPER_ADMIN", "ADMIN"), deleteTodo);

module.exports = router;
