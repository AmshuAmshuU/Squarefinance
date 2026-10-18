const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const { getConsolidatedReportData, getAnalyticsSnapshotExtras } = require("./analyticsController");
const { buildConsolidatedReportWorkbook } = require("../utils/excelReportBuilder");
const { sendReportEmail, MAX_REPORT_REQUEST_BYTES } = require("../utils/emailService");
const { buildDatabaseBackup } = require("../utils/databaseBackup");
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

// The Excel goes out every night; the database backup file is attached only on
// every Nth day (default 3) to keep Karthik's Gmail space going for years.
// Stateless on purpose: the day number (India time) divided by N decides it, so
// there is nothing to store and a re-run on the same night behaves the same.
// The cron call can force it with ?backup=yes or skip it with ?backup=no.
const BACKUP_EVERY_DAYS = Math.max(1, Number(process.env.BACKUP_EVERY_DAYS) || 3);
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istDayNumber = (date) => Math.floor((date.getTime() + IST_OFFSET_MS) / 86400000);
const isBackupDay = (date) => istDayNumber(date) % BACKUP_EVERY_DAYS === 0;
const nextBackupLabel = (date) => {
  let k = 1;
  while ((istDayNumber(date) + k) % BACKUP_EVERY_DAYS !== 0) k += 1;
  return new Date(date.getTime() + k * 86400000).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
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

  const startedAt = new Date();
  const { data, analyticsExtras, buffer } = await buildConsolidatedReport();
  const health = await runDataHealthCheck();

  // Database backup (every Nth day). Built after the Excel, one collection at a
  // time, and never allowed to stop the Excel email: any problem just becomes a
  // note in the email.
  const forced = req.query?.backup;
  const wantBackup = forced === "yes" || (forced !== "no" && isBackupDay(startedAt));
  let backup = null;
  let backupProblem = "";
  if (wantBackup) {
    try {
      const built = await buildDatabaseBackup();
      backup = {
        buffer: built.buffer,
        filename: `SquareFinance_database_backup_${getTodayIST()}.json.gz`,
        contentType: "application/gzip",
        totalDocs: built.totalDocs,
        collectionCount: built.collectionCount,
      };
    } catch (err) {
      console.error("Database backup for the email failed:", err.message);
      backupProblem = "the backup could not be built (" + err.message + ")";
    }
  }

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

  const noteBox = (bg, fg, text) =>
    `<p style="background: ${bg}; color: ${fg}; padding: 10px 14px; border-radius: 6px; font-size: 13px;">${text}</p>`;
  const nextBackup = nextBackupLabel(startedAt);

  // The email text for the database-backup part, for each situation
  const backupSectionFor = (attached, problem) => {
    if (attached) {
      const kb = Math.round(attached.buffer.length / 1024);
      return noteBox("#ecfdf5", "#065f46", `✓ <strong>Database backup attached</strong> (${attached.filename}, ${kb} KB, ${attached.totalDocs} records in ${attached.collectionCount} collections). Next backup email: ${nextBackup}. Complete copy of the database (nothing left out). To restore it, ask Claude.`);
    }
    if (problem) {
      return noteBox("#fffbeb", "#92400e", `Note: the database backup could not be attached this time — ${problem}. The Excel report is complete. Tell Claude if this repeats.`);
    }
    const every = { 1: "day", 2: "2nd day", 3: "3rd day" }[BACKUP_EVERY_DAYS] || `${BACKUP_EVERY_DAYS}th day`;
    return `<p style="font-size: 12px; color: #6b7280;">Database backup is attached every ${every} — next one: ${nextBackup}.</p>`;
  };

  const buildHtml = (backupSection) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333;">
      <h2 style="color: #2563eb;">Square Finance — Daily Consolidated Report</h2>
      <p>Attached is the full loan registry snapshot for <strong>${today}</strong>.</p>
      ${healthSection}
      ${extrasNote}
      ${backupSection}
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

  const subject = `Square Finance — Daily Report (${today})`;
  // Gmail's simple send call allows ~5 MB per request (see emailService.js). As
  // the data grows, warn well before the backup stops fitting.
  const nearLimit = backup && (backup.buffer.length + buffer.length) * 1.78 > MAX_REPORT_REQUEST_BYTES * 0.7;
  const limitNote = nearLimit
    ? noteBox("#fffbeb", "#92400e", "Heads-up: the email is getting close to Gmail's size limit for this sending method. Tell Claude soon so the backup keeps fitting.")
    : "";

  let sent;
  let backupAttached = !!backup;
  try {
    sent = await sendReportEmail(
      recipients, subject, buildHtml(backupSectionFor(backup, backupProblem) + limitNote), buffer, fileName,
      backup ? [{ buffer: backup.buffer, filename: backup.filename, contentType: backup.contentType }] : []
    );
  } catch (err) {
    // Only when the backup attachment is what Gmail rejected (too large / bad
    // request): send the Excel on its own, with a note, so the nightly report is
    // never lost. Network/auth errors are NOT retried (no risk of double emails).
    const rejected = err.code === "REPORT_TOO_LARGE" || err.code === 400 || err.code === 413;
    if (!backup || !rejected) throw err;
    console.error("Report email with the database backup was rejected, resending without it:", err.message);
    backupAttached = false;
    const why = err.code === "REPORT_TOO_LARGE"
      ? "it has grown too big for the email sending method"
      : "Gmail refused the message with it attached";
    sent = await sendReportEmail(recipients, subject, buildHtml(backupSectionFor(null, why)), buffer, fileName);
  }

  sendResponse(res, 200, "success", `Report sent to ${sent.recipients.length} recipient(s)`, null, {
    recipients: sent.recipients,
    // "personal" = sent from the report's own Gmail account, "company" = from the company mailbox
    sentVia: sent.sentVia,
    databaseBackupAttached: backupAttached,
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
