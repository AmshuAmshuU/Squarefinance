const express = require("express");
const router = express.Router();
const { sendDailyConsolidatedReport, getDataHealthReport } = require("../controllers/reportController");
const { isAuthenticated, authorizeRoles } = require("../middlewares/auth");

/**
 * @route POST /api/reports/send-daily-summary
 * @desc Builds the consolidated Excel report and emails it to configured
 *       recipients. Called once a day by an external scheduler (not a
 *       logged-in user), so it's protected by the x-cron-secret header
 *       instead of normal JWT auth.
 * @access Cron secret only
 */
router.post("/send-daily-summary", sendDailyConsolidatedReport);

/**
 * @route GET /api/reports/health-check
 * @desc On-demand version of the same data-health check the daily email
 *       runs, so Super Admin can check right now instead of waiting.
 * @access Super Admin only
 */
router.get("/health-check", isAuthenticated, authorizeRoles("SUPER_ADMIN"), getDataHealthReport);

module.exports = router;
