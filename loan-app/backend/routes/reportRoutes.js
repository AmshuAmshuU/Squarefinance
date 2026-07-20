const express = require("express");
const router = express.Router();
const { sendDailyConsolidatedReport } = require("../controllers/reportController");

/**
 * @route POST /api/reports/send-daily-summary
 * @desc Builds the consolidated Excel report and emails it to configured
 *       recipients. Called once a day by an external scheduler (not a
 *       logged-in user), so it's protected by the x-cron-secret header
 *       instead of normal JWT auth.
 * @access Cron secret only
 */
router.post("/send-daily-summary", sendDailyConsolidatedReport);

module.exports = router;
