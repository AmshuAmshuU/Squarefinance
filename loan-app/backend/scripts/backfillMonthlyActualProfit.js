// ONE-OFF fill of the monthly snapshot table (MonthlyProfitSnapshot) for the
// months BEFORE live snapshots start (before SNAPSHOT_START_MONTH, i.e. up to
// and including October 2026).
//
// Writes ONLY the exact, calculable thing - the actual profit of each month,
// worked out with the Analytics Profit card's own calculation. The opening /
// closing expected EMI and expected profit are deliberately left empty (NA):
// they were never recorded and are not guessed.
//
// - DRY RUN by default: prints what it WOULD write and changes nothing.
//   Add --write to actually save.
// - Safe to re-run: months that already have a row are never touched.
// - Months from SNAPSHOT_START_MONTH onwards are never written here - those
//   come from real snapshots only.
// - The latest month it fills (October 2026) is saved as "month so far"
//   (not frozen); it is re-calculated exactly and frozen automatically on the
//   Super Admin's first Analytics visit in November.
//
// Run from the backend folder:
//   node scripts/backfillMonthlyActualProfit.js            (preview only)
//   node scripts/backfillMonthlyActualProfit.js --write    (save)
require("dotenv").config();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const InterestLoan = require("../models/InterestLoan");
const MonthlyProfitSnapshot = require("../models/MonthlyProfitSnapshot");
const { getProfitStats, SNAPSHOT_START_MONTH } = require("../controllers/analyticsController");

const write = process.argv.includes("--write");
const istDay = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const nextMonthKey = (key) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const lastDayOf = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${key}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
};
const callProfit = (query) =>
  new Promise((resolve, reject) => {
    const res = { status() { return this; }, json(body) { resolve(body.data); return this; } };
    getProfitStats({ query }, res, reject);
  });
const f = (n) => (n ?? 0).toLocaleString("en-IN");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to:", mongoose.connection.name);
  console.log(write ? "MODE: WRITE (saving rows)\n" : "MODE: PREVIEW ONLY - nothing is saved. Add --write to save.\n");

  const now = new Date();
  const today = istDay(now);
  const currentMonth = today.slice(0, 7);

  const [veh, wk, dy, intr] = await Promise.all([
    Loan.find({}, "dateLoanDisbursed createdAt").lean(),
    WeeklyLoan.find({}, "dateLoanDisbursed createdAt").lean(),
    DailyLoan.find({}, "dateLoanDisbursed createdAt").lean(),
    InterestLoan.find({}, "startDate createdAt").lean(),
  ]);
  const starts = [
    ...veh.map((l) => l.dateLoanDisbursed || l.createdAt),
    ...wk.map((l) => l.dateLoanDisbursed || l.createdAt),
    ...dy.map((l) => l.dateLoanDisbursed || l.createdAt),
    ...intr.map((l) => l.startDate || l.createdAt),
  ].filter(Boolean);
  const startMonth = istDay(new Date(Math.min(...starts.map((d) => new Date(d).getTime())))).slice(0, 7);

  // Fill every month before the live-snapshot start, up to the current month.
  const lastMonth = currentMonth < SNAPSHOT_START_MONTH ? currentMonth : (() => {
    // Running after live snapshots began: fill only up to the month before them.
    let k = startMonth, last = startMonth;
    while (k < SNAPSHOT_START_MONTH) { last = k; k = nextMonthKey(k); }
    return last;
  })();

  const existing = new Set((await MonthlyProfitSnapshot.find({}, "month").lean()).map((r) => r.month));
  console.log(`Months ${startMonth} to ${lastMonth}; ${existing.size} month(s) already in the table.\n`);
  console.log("Month     Actual profit   Vehicle    Weekly     Daily   Interest   Status");

  let created = 0;
  for (let k = startMonth; k <= lastMonth; k = nextMonthKey(k)) {
    if (existing.has(k)) {
      console.log(`${k}   (already has a row - left untouched)`);
      continue;
    }
    const isCurrent = k === currentMonth;
    const data = await callProfit({
      interval: "custom",
      startDate: `${k}-01`,
      endDate: isCurrent ? today : lastDayOf(k),
    });
    const actual = {
      total: data.totalProfit,
      vehicle: data.breakdown.monthly,
      weekly: data.breakdown.weekly,
      daily: data.breakdown.daily,
      interest: data.breakdown.interest,
      finalized: !isCurrent,
      calculatedAt: now,
    };
    console.log(
      `${k}   ${f(actual.total).padStart(12)} ${f(actual.vehicle).padStart(9)} ${f(actual.weekly).padStart(9)} ${f(actual.daily).padStart(9)} ${f(actual.interest).padStart(9)}   ${isCurrent ? "month so far (frozen on first Nov visit)" : "final"}`,
    );
    if (write) {
      await MonthlyProfitSnapshot.updateOne(
        { month: k },
        { $setOnInsert: { actualProfit: actual, source: "backfill" } },
        { upsert: true },
      );
      created++;
    }
  }
  console.log(write ? `\nSaved ${created} new row(s). Opening/closing snapshots left empty (NA).` : "\nPreview only - nothing saved.");
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
