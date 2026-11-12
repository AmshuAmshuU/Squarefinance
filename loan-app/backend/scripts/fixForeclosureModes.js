// Fixes the payment mode shown on Collections for PAST foreclosures.
//
// Until 2026-11-13 a foreclosure saved the loan with the foreclosure screen's default mode ("Online") instead of the
// mode chosen on the payment row, so cash foreclosures showed as Online (or as nothing, on the oldest ones). The mode that
// was actually entered is kept on the foreclosure's Payment record(s), so this copies it onto the loan - but only where
// that is clearly the same mistake:
//   - the loan has NO mode saved                        -> set it from the Payment record
//   - the loan says "Online" but the Payment record says Cash or Cheque (the screen's default overwrote the real choice)
//                                                       -> set it from the Payment record
// It deliberately does NOT touch, only lists:
//   - loans that say Cash/Cheque while the Payment record says something else (cannot tell which is right - check your books)
//   - foreclosures whose Payment records mix modes (one loan field cannot hold two modes)
//   - foreclosures with no Payment record
// Only the loan's paymentMode (and nothing else, not even updatedAt) is changed.
//
// SAFE BY DEFAULT: it only reports what it WOULD change. Add --apply to write.
//   node scripts/fixForeclosureModes.js            (report only)
//   node scripts/fixForeclosureModes.js --apply    (write the changes)
// Safe to re-run: once fixed, nothing is left to change.
require("dotenv").config();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const Payment = require("../models/Payment");

const APPLY = process.argv.includes("--apply");
const labelOf = (mode) => {
  const t = String(mode || "").trim();
  if (!t) return "";
  if (t.includes(",")) return "Mixed";
  const u = t.toUpperCase();
  return u === "CASH" ? "Cash" : u === "CHEQUE" ? "Cheque" : "Online"; // ONLINE, BANK, PhonePe, GPay... are all online
};
const day = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(APPLY ? "MODE: APPLY (writing changes)\n" : "MODE: REPORT ONLY (nothing is written; add --apply to write)\n");

  const fix = [], ambiguous = [], mixed = [], noPayment = [];
  let same = 0;
  for (const [Model, name] of [[Loan, "Vehicle"], [WeeklyLoan, "Weekly"], [DailyLoan, "Daily"]]) {
    const loans = await Model.find({ foreclosureDate: { $ne: null }, foreclosureAmount: { $gt: 0 } }).select("loanNumber customerName foreclosureDate foreclosureAmount paymentMode").lean();
    for (const l of loans) {
      const pays = await Payment.find({ loanId: l._id, paymentType: "Foreclosure" }).select("mode").lean();
      const row = { Model, type: name, id: l._id, loan: l.loanNumber, name: l.customerName, date: day(l.foreclosureDate), amount: Math.round(l.foreclosureAmount), current: l.paymentMode || "" };
      if (!pays.length) { noPayment.push(row); continue; }
      const labels = [...new Set(pays.map((p) => labelOf(p.mode)).filter(Boolean))];
      if (labels.length !== 1 || labels[0] === "Mixed") { mixed.push({ ...row, entered: labels.join(" + ") }); continue; }
      const entered = labels[0];
      row.entered = entered;
      if (row.current === entered) { same++; continue; }
      if (!row.current || (row.current === "Online" && entered !== "Online")) fix.push(row);
      else ambiguous.push(row);
    }
  }

  const show = (r) => `  ${r.date}  ${r.type.padEnd(7)} ${String(r.loan).padEnd(8)} ${String(r.name || "").slice(0, 18).padEnd(18)} Rs ${String(r.amount).padStart(7)}  loan says ${(r.current || "(nothing)").padEnd(9)} payment entered ${r.entered || "-"}`;
  console.log(`Foreclosed loans already right: ${same}\n`);
  console.log(`TO FIX (${fix.length}) - loan mode will be set to what was entered:`);
  fix.sort((a, b) => a.date.localeCompare(b.date)).forEach((r) => console.log(show(r)));
  console.log(`\nLEFT AS THEY ARE, please check your books (${ambiguous.length}) - loan says one mode, the payment record another:`);
  ambiguous.forEach((r) => console.log(show(r)));
  console.log(`\nLEFT AS THEY ARE - payment record mixes modes (${mixed.length}):`);
  mixed.forEach((r) => console.log(show(r)));
  console.log(`\nLEFT AS THEY ARE - no payment record (${noPayment.length}): ${noPayment.map((r) => r.loan).join(", ") || "none"}`);

  if (APPLY) {
    for (const r of fix) await r.Model.updateOne({ _id: r.id }, { $set: { paymentMode: r.entered } }, { timestamps: false });
    console.log(`\nDone. ${fix.length} loan(s) updated.`);
  } else {
    console.log(`\nReport finished. ${fix.length} loan(s) would change. Nothing was written.`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
