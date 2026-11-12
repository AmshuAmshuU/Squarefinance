// Repairs weekly loan W62 (Harish), foreclosed on 2026-11-12 for Rs 4,500 CASH:
//   - the loan shows payment mode "Online" (a screen default; the cash row that was entered was ignored), and
//   - miscellaneousFee is 4,500 - that was typed in only to get past a re-foreclosure that showed 0 remaining, but
//     misc is counted as profit, and this money is just the remaining balance (3 EMIs of 1,500), not profit.
//   - the foreclosure left three Payment records (4,500 CASH, 0 CASH, 4,500 CASH) for what was ONE cash receipt.
// After: foreclosure Rs 4,500, mode Cash, no misc / OD / foreclosure charge, one Foreclosure payment record of 4,500 CASH.
// Nothing else on the loan or its EMIs is touched; updatedAt is left as it is.
//
// SAFE BY DEFAULT: it only reports what it WOULD change. Add --apply to write.
//   node scripts/fixLoanW62Foreclosure.js            (report only)
//   node scripts/fixLoanW62Foreclosure.js --apply    (write the changes)
// Safe to re-run: once fixed, nothing is left to change. It refuses to touch anything that does not match what was found.
require("dotenv").config();
const mongoose = require("mongoose");
const WeeklyLoan = require("../models/WeeklyLoan");
const Payment = require("../models/Payment");

const APPLY = process.argv.includes("--apply");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(APPLY ? "MODE: APPLY (writing changes)\n" : "MODE: REPORT ONLY (nothing is written; add --apply to write)\n");

  const loan = await WeeklyLoan.findOne({ loanNumber: "W62" });
  if (!loan) throw new Error("W62 not found");
  console.log(`W62 ${loan.customerName}: status ${loan.status}, foreclosureAmount ${loan.foreclosureAmount}, mode ${loan.paymentMode}, misc ${loan.miscellaneousFee}, OD ${loan.odAmount}, charge ${loan.foreclosureChargeAmount}`);
  if (loan.status !== "Closed" || loan.foreclosureAmount !== 4500) throw new Error("Not in the expected state (Closed, foreclosureAmount 4500) - nothing changed.");

  // 1. the loan itself
  const loanChanges = {};
  if (loan.paymentMode !== "Cash") loanChanges.paymentMode = "Cash";
  if ((loan.miscellaneousFee || 0) !== 0) loanChanges.miscellaneousFee = 0;
  if ((loan.odAmount || 0) !== 0) loanChanges.odAmount = 0;
  if ((loan.foreclosureChargeAmount || 0) !== 0) loanChanges.foreclosureChargeAmount = 0;
  if ((loan.foreclosureChargePercent || 0) !== 0) loanChanges.foreclosureChargePercent = 0;
  console.log("\nLoan fields to change:", Object.keys(loanChanges).length ? JSON.stringify(loanChanges) : "none");

  // 2. the foreclosure payment records: keep the first real one, drop the 0 and the duplicate
  const pays = await Payment.find({ loanId: loan._id, paymentType: "Foreclosure" }).sort({ createdAt: 1 });
  console.log(`\nForeclosure payment records: ${pays.length}`);
  pays.forEach((p) => console.log(`  ${p._id}  amount ${p.amount}  mode ${p.mode}  created ${p.createdAt.toISOString()}`));
  const keep = pays.find((p) => p.amount === 4500);
  if (!keep) throw new Error("No 4,500 foreclosure payment record found - nothing changed.");
  const drop = pays.filter((p) => String(p._id) !== String(keep._id));
  const unexpected = drop.filter((p) => !(p.amount === 0 || p.amount === 4500));
  if (unexpected.length) throw new Error("Unexpected extra payment record(s) - nothing changed.");
  console.log(`  -> keep ${keep._id} (set mode to CASH); remove ${drop.length}: ${drop.map((p) => p._id + " (" + p.amount + ")").join(", ") || "none"}`);

  if (APPLY) {
    if (Object.keys(loanChanges).length) {
      await WeeklyLoan.updateOne({ _id: loan._id }, { $set: loanChanges }, { timestamps: false });
      console.log("\nUpdated the loan.");
    }
    if ((keep.mode || "") !== "CASH") await Payment.updateOne({ _id: keep._id }, { $set: { mode: "CASH" } }, { timestamps: false });
    if (drop.length) {
      const res = await Payment.deleteMany({ _id: { $in: drop.map((p) => p._id) } });
      console.log(`Removed ${res.deletedCount} duplicate foreclosure payment record(s).`);
    }
    console.log("\nDone.");
  } else {
    console.log("\nReport finished. Nothing was changed.");
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
