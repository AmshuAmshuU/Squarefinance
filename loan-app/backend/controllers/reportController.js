const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const { getConsolidatedReportData } = require("./analyticsController");
const { buildConsolidatedReportWorkbook } = require("../utils/excelReportBuilder");
const { buildAnalyticsPagePdf } = require("../utils/pdfReportBuilder");
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

// Separate from the Excel report by design: logs into the app with a real
// account (via a hidden automated browser), captures the live Analytics
// page as a PDF, and emails it to a single recipient only. Independent
// trigger, independent failure mode — if this fails, the Excel report
// (sent by sendDailyConsolidatedReport) is completely unaffected.
const sendDailyAnalyticsPdf = asyncHandler(async (req, res, next) => {
  const providedSecret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || providedSecret !== process.env.CRON_SECRET) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const loginEmail = process.env.ANALYTICS_PDF_LOGIN_EMAIL;
  const loginPassword = process.env.ANALYTICS_PDF_LOGIN_PASSWORD;
  const loginAccessKey = process.env.ANALYTICS_PDF_LOGIN_ACCESS_KEY;
  const recipient = process.env.ANALYTICS_PDF_RECIPIENT || loginEmail;

  if (!loginEmail || !loginPassword) {
    return next(new ErrorHandler("ANALYTICS_PDF_LOGIN_EMAIL/PASSWORD not configured", 500));
  }
  if (!recipient) {
    return next(new ErrorHandler("No PDF recipient configured", 500));
  }

  // Respond immediately. The scheduler only needs to successfully trigger
  // this — cron-job.org's free tier caps request timeouts at 30 seconds,
  // well under how long a real headless-browser login + page capture
  // takes on a free-tier host. The actual work continues below, in this
  // same long-running Render process, after the response has been sent.
  sendResponse(res, 202, "success", `Analytics PDF generation started — will be emailed to ${recipient} shortly`, null, { recipient });

  // Hard overall safety-net timeout. Every individual Puppeteer wait
  // already has its own timeout, but this guarantees SOMETHING gets
  // logged within a bounded window no matter what — e.g. if a network
  // call (like the Gmail API upload) hangs without its own timeout —
  // instead of the job going silent with nothing in the logs at all.
  const withHardTimeout = (promise, ms, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} exceeded hard timeout of ${ms}ms`)), ms)
      ),
    ]);

  try {
    await withHardTimeout(
      (async () => {
        const pdfBuffer = await buildAnalyticsPagePdf({ loginEmail, loginPassword, loginAccessKey });

        const today = new Date().toLocaleDateString("en-IN", {
          day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
        });
        const fileName = `Analytics_Snapshot_${new Date().toISOString().split("T")[0]}.pdf`;

        const htmlBody = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333;">
            <h2 style="color: #2563eb;">Square Finance — Daily Analytics Snapshot</h2>
            <p>Attached is a full snapshot of the Analytics page (All Time view) for <strong>${today}</strong>.</p>
            <p style="font-size: 12px; color: #9ca3af;">This report was generated and sent automatically.</p>
          </div>
        `;

        await sendReportEmail(
          [recipient],
          `Square Finance — Analytics Snapshot (${today})`,
          htmlBody,
          pdfBuffer,
          fileName,
          "application/pdf"
        );
        console.log(`Analytics PDF sent to ${recipient}`);
      })(),
      // Generous ceiling — nothing is waiting on this in real time (it's a
      // once-daily background email), so there's no cost to giving it
      // plenty of room on a free-tier host where auth/DB round-trips have
      // been observed taking 500ms-1s+ each, well above what a single
      // lightweight lookup normally costs.
      240000,
      "Analytics PDF job"
    );
  } catch (err) {
    // Response already sent — can't forward to the error middleware.
    // Log it so it's visible in Render's Logs tab.
    console.error("Analytics PDF background job failed:", err);
  }
});

module.exports = { sendDailyConsolidatedReport, sendDailyAnalyticsPdf };
