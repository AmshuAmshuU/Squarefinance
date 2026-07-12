const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { isAuthenticated } = require("../middlewares/auth");

router.use(isAuthenticated);

router.get("/", notificationController.getNotifications);
router.put("/mark-all-read", notificationController.markAllAsRead);
router.put("/:id/read", notificationController.markAsRead);
router.post("/delete", notificationController.deleteNotifications);
router.delete("/clear-all", notificationController.clearAllNotifications);

module.exports = router;
