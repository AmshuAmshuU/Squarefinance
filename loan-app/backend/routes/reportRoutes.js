const express = require("express");
const router = express.Router();
const { sendDailyConsolidatedReport, sendDailyAnalyticsPdf } = require("../controllers/reportController");

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
 * @route POST /api/reports/send-daily-analytics-pdf
 * @desc Logs into the app with a real account via a hidden browser,
 *       captures the Analytics page (All Time view) as a PDF, and emails
 *       it to a single recipient. Independent of send-daily-summary above
 *       — meant to be triggered by its own separate scheduled job.
 * @access Cron secret only
 */
router.post("/send-daily-analytics-pdf", sendDailyAnalyticsPdf);

module.exports = router;
