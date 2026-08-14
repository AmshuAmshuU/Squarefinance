// Shared utility for the customer-location-sharing feature: a permanent
// per-loan link that a customer taps to update their current coordinates
// on that loan. Sent manually, on demand, via the "Send link to customer"
// button (Karthik's explicit choice - 2026-08-13 - over any automatic
// sending at creation or on a schedule, since he wants control over when
// it goes out). Only the latest tap is kept - no history, matching his
// explicit "just the latest edit" preference for this feature.
const crypto = require("crypto");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const InterestLoan = require("../models/InterestLoan");

const MODELS = [
  { Model: Loan, name: "Loan" },
  { Model: WeeklyLoan, name: "WeeklyLoan" },
  { Model: DailyLoan, name: "DailyLoan" },
  { Model: InterestLoan, name: "InterestLoan" },
];

const generateLocationToken = () => crypto.randomBytes(6).toString("base64url");

// Finds which loan (across all 4 types) owns a given location token.
async function findLoanByLocationToken(token) {
  for (const { Model, name } of MODELS) {
    const loan = await Model.findOne({ locationToken: token }).select(
      "loanNumber customerName"
    );
    if (loan) return { loan, modelName: name };
  }
  return null;
}

// timestamps:false - this is an unauthenticated customer action, not a
// staff edit, and must not make the loan look like it was just "updated"
// by whoever's updatedBy happens to be stamped on it (same reasoning as
// the EMI schedule-sync fix elsewhere in this app).
async function updateLocationByToken(token, lat, lng) {
  for (const { Model } of MODELS) {
    const updated = await Model.findOneAndUpdate(
      { locationToken: token },
      { lastLocationLat: lat, lastLocationLng: lng, lastLocationAt: new Date() },
      { timestamps: false }
    );
    if (updated) return true;
  }
  return false;
}

// The customer-facing link must always point at the real live site, never
// whatever origin the staff member happened to be using to click "Send".
// Deliberately a dedicated env var rather than guessing from FRONTEND_URL
// (a comma-separated CORS allowlist that can also list old preview/dev
// domains, e.g. loanapp-dev.vercel.app) - picking "the first non-localhost
// entry" from that list picked the wrong one in practice (found 2026-08-14).
function getPublicAppUrl() {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  const origins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return origins.find((o) => !o.includes("localhost") && !o.includes("127.0.0.1")) || origins[0] || "";
}

module.exports = {
  generateLocationToken,
  findLoanByLocationToken,
  updateLocationByToken,
  getPublicAppUrl,
  MODELS,
};
