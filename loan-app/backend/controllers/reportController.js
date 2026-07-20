const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const { getConsolidatedReportData } = require("./analyticsController");
const { buildConsolidatedReportWorkbook } = require("../utils/excelReportBuilder");
const { sendReportEmail } = require("../utils/emailService");

// Triggered by an external scheduler (not a logged-in user), so it's
// protected by a shared secret instead of the normal JWT auth middleware.
const sendDailyConsolidatedReport = asyncHandler(async (req, res, next) => {
  const providedSecret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || providedSecret !== process.env.CRON_SECRET) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const recipients = (process.env.REPORT_RECIPIENTS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return next(new ErrorHandler("No REPORT_RECIPIENTS configured", 500));
  }

  const data = await getConsolidatedReportData();
  const buffer = await buildConsolidatedReportWorkbook(data);

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const fileName = `Consolidated_Report_${new Date().toISOString().split("T")[0]}.xlsx`;

  const summaryCounts = {
    monthly: data.monthlyLoans.length,
    weekly: data.weeklyLoans.length,
    daily: data.dailyLoans.length,
    interest: data.interestLoans.length,
    expenses: data.expenses.length,
  };

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333;">
      <h2 style="color: #2563eb;">Square Finance — Daily Consolidated Report</h2>
      <p>Attached is the full loan registry snapshot for <strong>${today}</strong>.</p>
      <ul>
        <li>Monthly Loans: ${summaryCounts.monthly}</li>
        <li>Weekly Loans: ${summaryCounts.weekly}</li>
        <li>Daily Loans: ${summaryCounts.daily}</li>
        <li>Interest Loans: ${summaryCounts.interest}</li>
        <li>Expense Records: ${summaryCounts.expenses}</li>
      </ul>
      <p style="font-size: 12px; color: #9ca3af;">This report was generated and sent automatically.</p>
    </div>
  `;

  await sendReportEmail(
    recipients,
    `Square Finance — Daily Report (${today})`,
    htmlBody,
    buffer,
    fileName
  );

  sendResponse(res, 200, "success", `Report sent to ${recipients.length} recipient(s)`, null, {
    recipients,
    ...summaryCounts,
  });
});

module.exports = { sendDailyConsolidatedReport };
