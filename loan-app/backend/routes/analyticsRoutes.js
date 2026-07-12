const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

/**
 * @route GET /api/analytics/stats
 * @desc Get analytics stats for the dashboard
 * @access Private/Admin
 */
router.get(
  "/stats",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  analyticsController.getAnalyticsStats
);

router.get(
  "/export-data",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  analyticsController.exportAllData
);

router.get(
  "/trend-stats",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN", "EMPLOYEE"),
  analyticsController.getTrendStats
);

module.exports = router;
