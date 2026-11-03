// The Profit card now counts the vehicle sale gain / loss (sale price minus the principal still unpaid) on the
// sale date. Months that were already frozen in the monthly profit snapshots BEFORE that change (e.g. Jun and
// Jul 2026 for loans 41 and 27) still hold the old, lower figure. This re-freezes ONLY the months that contain
// a vehicle sale, using the Profit card's own calculation, so the snapshot table matches the card again.
// Only the "actualProfit" numbers of those months are rewritten - expected/opening/closing are never touched.
//
// SAFE BY DEFAULT: it only reports what it WOULD change. Add --apply to write.
//   node scripts/refreshSaleGainSnapshots.js            (report only)
//   node scripts/refreshSaleGainSnapshots.js --apply    (write the changes)
// Safe to re-run: once matching, nothing is left to change.
require("dotenv").config();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const MonthlyProfitSnapshot = require("../models/MonthlyProfitSnapshot");
const { computeMonthActual } = require("../controllers/analyticsController");

const APPLY = process.argv.includes("--apply");
const monthOf = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(APPLY ? "MODE: APPLY (writing changes)\n" : "MODE: REPORT ONLY (nothing is written; add --apply to write)\n");

  const sold = await Loan.find({ seizedStatus: "Sold", "soldDetails.soldDate": { $exists: true } }).select("loanNumber soldDetails.soldDate").lean();
  const months = [...new Set(sold.map((l) => monthOf(l.soldDetails.soldDate)))].sort();
  console.log(`Vehicle sales found: ${sold.length}, in months: ${months.join(", ") || "none"}\n`);

  let changed = 0;
  for (const month of months) {
    const row = await MonthlyProfitSnapshot.findOne({ month }).select("actualProfit").lean();
    if (!row || !row.actualProfit?.finalized) {
      console.log(`${month}: no frozen snapshot row (live month or none) - skipped, it will pick the new figure up by itself.`);
      continue;
    }
    const { actual } = await computeMonthActual(month);
    const old = row.actualProfit;
    const same = ["total", "vehicle", "weekly", "daily", "interest"].every((k) => (old[k] || 0) === (actual[k] || 0));
    console.log(`${month}: stored total ${old.total} (vehicle ${old.vehicle})  ->  now ${actual.total} (vehicle ${actual.vehicle})  ${same ? "[already matches]" : "[WOULD CHANGE]"}`);
    if (same) continue;
    changed++;
    if (APPLY) {
      await MonthlyProfitSnapshot.updateOne({ month }, { $set: { actualProfit: { ...actual, finalized: true, calculatedAt: new Date() } } });
      console.log("   -> updated");
    }
  }
  console.log(APPLY ? `\nDone. ${changed} month(s) updated.` : `\nReport finished. ${changed} month(s) would change. Nothing was written.`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
