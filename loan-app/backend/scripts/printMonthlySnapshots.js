// READ-ONLY. Prints the monthly expected-vs-actual snapshot table
// (MonthlyProfitSnapshot). Changes nothing.
//
// Columns: Month | EMI expected at start | Profit expected at start |
//          Actual profit | Profit expected at end | EMI expected at end
// NA = not recorded (months before live snapshots began). A "*" next to an
// actual-profit figure means the month is still running (not frozen yet).
// Below the table, the splits (per loan type) and the exact date/time each
// snapshot was taken are listed for every month that has snapshots.
//
// Run from the backend folder:  node scripts/printMonthlySnapshots.js
require("dotenv").config();
const mongoose = require("mongoose");
const MonthlyProfitSnapshot = require("../models/MonthlyProfitSnapshot");

const n = (v) => (v === undefined || v === null ? "NA" : Math.round(v).toLocaleString("en-IN"));
const monthName = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
};
const when = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }) : "NA";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const rows = await MonthlyProfitSnapshot.find({}).sort({ month: 1 }).lean();
  if (!rows.length) {
    console.log("No monthly snapshot rows yet.");
    await mongoose.disconnect();
    return;
  }

  const head = ["Month", "EMI@start", "Profit@start", "Actual profit", "Profit@end", "EMI@end"];
  const widths = [10, 12, 13, 14, 12, 12];
  const line = (cells) => cells.map((c, i) => String(c).padStart(widths[i])).join(" ");
  console.log("\nMONTHLY EXPECTED vs ACTUAL (NA = not recorded)\n");
  console.log(line(head));
  console.log("-".repeat(widths.reduce((a, b) => a + b + 1, 0)));
  rows.forEach((r) => {
    const a = r.actualProfit;
    console.log(
      line([
        monthName(r.month),
        n(r.opening?.expectedMonthlyEmi.total),
        n(r.opening?.expectedProfit.total),
        a ? n(a.total) + (a.finalized ? "" : "*") : "NA",
        n(r.closing?.expectedProfit.total),
        n(r.closing?.expectedMonthlyEmi.total),
      ]),
    );
  });
  console.log("\n* = month still running; frozen on the Super Admin's first Analytics visit next month.");

  const detailed = rows.filter((r) => r.opening || r.closing);
  if (detailed.length) {
    console.log("\n================ SPLITS AND CAPTURE TIMES ================");
    detailed.forEach((r) => {
      console.log(`\n${monthName(r.month)}`);
      [["Opening", r.opening], ["Closing", r.closing]].forEach(([label, s]) => {
        if (!s) return;
        const e = s.expectedMonthlyEmi;
        const p = s.expectedProfit;
        console.log(`  ${label} snapshot (taken ${when(s.capturedAt)})`);
        console.log(`    Expected monthly EMI : Vehicle ${n(e.vehicle)} | Weekly(x4) ${n(e.weekly)} | Daily(x30) ${n(e.daily)} | Interest ${n(e.interest)} | TOTAL ${n(e.total)}`);
        console.log(`    Expected profit      : Vehicle ${n(p.vehicle)} | Interest ${n(p.interest)} | TOTAL ${n(p.total)}`);
      });
      const a = r.actualProfit;
      if (a) {
        console.log(`  Actual profit ${a.finalized ? "(final)" : "(so far)"}: Vehicle ${n(a.vehicle)} | Weekly ${n(a.weekly)} | Daily ${n(a.daily)} | Interest ${n(a.interest)} | TOTAL ${n(a.total)}`);
      }
    });
  }
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
