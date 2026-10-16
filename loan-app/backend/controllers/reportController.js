const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const { getConsolidatedReportData, getAnalyticsSnapshotExtras } = require("./analyticsController");
const { buildConsolidatedReportWorkbook } = require("../utils/excelReportBuilder");
const { sendReportEmail } = require("../utils/emailService");
const { runDataHealthCheck } = require("../utils/dataHealthCheck");
const { getTodayIST } = require("../utils/dateUtils");

// Builds the full consolidated report (registry sheets + the whole Analytics
// page in the "Analytics Summary" sheet). Shared by the nightly email and the
// Export button on the Analytics page, so both always produce the same file.
const buildConsolidatedReport = async () => {
  const data = await getConsolidatedReportData();
  // The rest of the Analytics page, for the Analytics Summary sheet. Never
  // allowed to stop the report: any failure inside is caught piece by piece,
  // and a failure of the whole thing just means the extra sections are left
  // out (and mentioned in the email).
  let analyticsExtras = null;
  try {
    analyticsExtras = await getAnalyticsSnapshotExtras();
  } catch (err) {
    console.error("Analytics snapshot extras failed entirely:", err.message);
  }
  const buffer = await buildConsolidatedReportWorkbook(data, analyticsExtras);
  return { data, analyticsExtras, buffer };
};

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

  const { data, analyticsExtras, buffer } = await buildConsolidatedReport();
  const health = await runDataHealthCheck();

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const fileName = `Consolidated_Report_${getTodayIST()}.xlsx`;

  const summaryCounts = {
    monthly: data.monthlyLoans.length,
    weekly: data.weeklyLoans.length,
    daily: data.dailyLoans.length,
    interest: data.interestLoans.length,
    expenses: data.expenses.length,
  };

  // Caps how many loan numbers get listed per category so the email stays
  // readable even if a large batch is ever found (e.g. long-untouched
  // historical data) - the count is always accurate, only the list truncates.
  const MAX_LISTED = 15;
  const formatIssueList = (label, items) => {
    if (items.length === 0) return "";
    const shown = items.slice(0, MAX_LISTED).map((l) => `${l.type} ${l.loanNumber} (${l.customerName})`).join(", ");
    const more = items.length > MAX_LISTED ? ` ...and ${items.length - MAX_LISTED} more` : "";
    return `<p style="font-size: 13px; margin: 4px 0;"><strong>${label} (${items.length}):</strong> ${shown}${more}</p>`;
  };

  const healthSection = health.totalIssues === 0
    ? `<p style="background: #ecfdf5; color: #065f46; padding: 10px 14px; border-radius: 6px; font-size: 13px;">✓ Data health check: no issues found.</p>`
    : `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
        <p style="color: #991b1b; font-weight: bold; margin: 0 0 8px 0;">⚠ Data health check: ${health.totalIssues} issue(s) found</p>
        ${formatIssueList("Loans fully paid but not closed", health.stuckLoans)}
        ${formatIssueList("EMI counters out of sync", health.emiCounterDrift)}
        ${formatIssueList("Corrupted overdue field", health.corruptedOverdue)}
        ${formatIssueList("Active loans with no EMI schedule", health.missingSchedule)}
        <p style="font-size: 12px; color: #7f1d1d; margin: 8px 0 0 0;">These are flagged for review only - nothing was changed automatically.</p>
      </div>
    `;

  const extrasProblem = !analyticsExtras
    ? "the extra Analytics sections"
    : analyticsExtras.errors.length
      ? analyticsExtras.errors.join(", ")
      : "";
  const extrasNote = extrasProblem
    ? `<p style="background: #fffbeb; color: #92400e; padding: 10px 14px; border-radius: 6px; font-size: 13px;">Note: part of the Analytics Summary sheet could not be built this time (${extrasProblem}). The loan registry is complete.</p>`
    : "";

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333;">
      <h2 style="color: #2563eb;">Square Finance — Daily Consolidated Report</h2>
      <p>Attached is the full loan registry snapshot for <strong>${today}</strong>.</p>
      ${healthSection}
      ${extrasNote}
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

  const sent = await sendReportEmail(
    recipients,
    `Square Finance — Daily Report (${today})`,
    htmlBody,
    buffer,
    fileName
  );

  sendResponse(res, 200, "success", `Report sent to ${sent.recipients.length} recipient(s)`, null, {
    recipients: sent.recipients,
    // "personal" = sent from the report's own Gmail account, "company" = from the company mailbox
    sentVia: sent.sentVia,
    ...summaryCounts,
  });
});

// The Export button on the Analytics page (Super Admin / Admin only): the very
// same file as the nightly email, returned as base64 inside the normal JSON
// response so the page's usual authenticated request helper can fetch it.
const exportConsolidatedExcel = asyncHandler(async (req, res, next) => {
  const { buffer } = await buildConsolidatedReport();
  sendResponse(res, 200, "success", "Report generated", null, {
    fileName: `Consolidated_Report_${getTodayIST()}.xlsx`,
    base64: Buffer.from(buffer).toString("base64"),
  });
});

// On-demand version of the same health check the daily email runs, so
// Super Admin can check right now instead of waiting for 11:59pm. Purely
// additive - the email path above is untouched and keeps running on its
// own schedule regardless of whether anyone opens this page.
const getDataHealthReport = asyncHandler(async (req, res, next) => {
  const health = await runDataHealthCheck();
  sendResponse(res, 200, "success", "Data health check complete", null, health);
});

module.exports = { sendDailyConsolidatedReport, exportConsolidatedExcel, getDataHealthReport };
