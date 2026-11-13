// Moves every foreclosure's payment mode into its own field (foreclosurePaymentMode), and gives back five old vehicle
// loans the payout mode they had before the 13 Nov 2026 repair.
//
// WHY: a loan's paymentMode field means "how the loan was originally paid out", and the Payment Mode Analysis card uses it for
// the payout (disbursement) cash/account split of older loans that have no disbursement entries. Foreclosures used to overwrite
// it with the foreclosure mode, and the 13 Nov repair (fixForeclosureModes.js) set it again on 6 such vehicle loans, which moved
// Rs 3.8 lakh on that card from "account" to "cash". New code keeps the foreclosure mode in foreclosurePaymentMode; this script
// brings the existing data in line.
//
// STEP 1 - every foreclosed loan (Vehicle, Weekly, Daily) that has a paymentMode but no foreclosurePaymentMode yet gets
//          foreclosurePaymentMode = its current paymentMode. Collections reads that field first, so what Collections shows
//          does not change by even a rupee.
// STEP 2 - six vehicle loans repaired on 13 Nov get their paymentMode put back to what it was before:
//              loan 1 and loan 4  -> "Online"      (it is Cash now)
//              loans 49, 52, 96MOB and 95G -> no mode at all (they had none)
//          each only when it currently holds exactly the value the repair gave it, so nothing else is ever touched.
// Nothing else on any loan changes (not even updatedAt).
//
// SAFE BY DEFAULT: it only reports what it WOULD change. Add --apply to write.
//   node scripts/separateForeclosureMode.js            (report only)
//   node scripts/separateForeclosureMode.js --apply    (write the changes)
// Safe to re-run: once done, nothing is left to change.
require("dotenv").config();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");

const APPLY = process.argv.includes("--apply");
// loan number -> [value the 13 Nov repair gave it, what it had before (null = nothing)]
const RESTORE = { 1: ["Cash", "Online"], 4: ["Cash", "Online"], 49: ["Cash", null], 52: ["Cash", null], "96MOB": ["Cash", null], "95G": ["Online", null] };

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(APPLY ? "MODE: APPLY (writing changes)\n" : "MODE: REPORT ONLY (nothing is written; add --apply to write)\n");

  // STEP 1
  let copied = 0, alreadyDone = 0;
  const step1 = [];
  for (const [Model, name] of [[Loan, "Vehicle"], [WeeklyLoan, "Weekly"], [DailyLoan, "Daily"]]) {
    const loans = await Model.find({ foreclosureDate: { $ne: null }, foreclosureAmount: { $gt: 0 } }).select("loanNumber paymentMode foreclosurePaymentMode").lean();
    for (const l of loans) {
      if (l.foreclosurePaymentMode) { alreadyDone++; continue; }
      if (!l.paymentMode) continue;
      step1.push({ Model, id: l._id, type: name, loan: l.loanNumber, mode: l.paymentMode });
    }
  }
  console.log(`STEP 1 - foreclosed loans that will get foreclosurePaymentMode copied from paymentMode: ${step1.length} (already done: ${alreadyDone})`);
  const byMode = {};
  step1.forEach((r) => { byMode[r.mode] = (byMode[r.mode] || 0) + 1; });
  console.log("  by mode:", JSON.stringify(byMode));

  // STEP 2 (reads the value the loan would have after step 1, so it also works in report mode)
  console.log("\nSTEP 2 - vehicle loans to put back to their earlier payout mode:");
  const step2 = [];
  for (const [num, [repaired, before]] of Object.entries(RESTORE)) {
    const l = await Loan.findOne({ loanNumber: num }).select("loanNumber customerName paymentMode foreclosurePaymentMode foreclosureAmount").lean();
    if (!l) { console.log(`  loan ${num}: not found - skipped`); continue; }
    const now = l.paymentMode || null;
    if (now === before) { console.log(`  loan ${num} ${l.customerName}: already ${before || "(nothing)"} - nothing to do`); continue; }
    if (now !== repaired) { console.log(`  loan ${num} ${l.customerName}: holds ${now || "(nothing)"}, not the repaired value ${repaired} - LEFT ALONE`); continue; }
    console.log(`  loan ${num} ${l.customerName} (foreclosure Rs ${Math.round(l.foreclosureAmount || 0)}): paymentMode ${now} -> ${before || "(nothing)"}; foreclosure mode kept as ${l.foreclosurePaymentMode || now}`);
    step2.push({ id: l._id, before });
  }

  if (APPLY) {
    for (const r of step1) await r.Model.updateOne({ _id: r.id }, { $set: { foreclosurePaymentMode: r.mode } }, { timestamps: false });
    for (const r of step2) {
      await Loan.updateOne({ _id: r.id }, r.before ? { $set: { paymentMode: r.before } } : { $unset: { paymentMode: 1 } }, { timestamps: false, strict: false });
    }
    console.log(`\nDone. Step 1: ${step1.length} loan(s). Step 2: ${step2.length} loan(s).`);
  } else {
    console.log(`\nReport finished. Step 1 would update ${step1.length} loan(s), step 2 would update ${step2.length}. Nothing was written.`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
