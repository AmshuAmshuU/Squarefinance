// Repairs vehicle loans whose vehicle was SOLD before 2026-07-30 (commit a38f592), when selling a vehicle
// did not yet close out the remaining EMIs properly:
//   - EMIs left "Paid" with nothing paid and NO closedWithoutPayment flag (e.g. loan 41), or
//   - EMIs left "Pending" on a Closed loan (e.g. loan 27).
// Same treatment the sale code now gives every new sale: status Paid, paymentDate = sale date,
// closedWithoutPayment = true. EMIs that really received money are NEVER touched.
//
// SAFE BY DEFAULT: it only reports what it WOULD change. Add --apply to write.
//   node scripts/fixSoldLoanEmis.js            (report only)
//   node scripts/fixSoldLoanEmis.js --apply    (write the changes)
// Safe to re-run: once fixed, nothing is left to change.
require("dotenv").config();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const EMI = require("../models/EMI");

const APPLY = process.argv.includes("--apply");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(APPLY ? "MODE: APPLY (writing changes)\n" : "MODE: REPORT ONLY (nothing is written; add --apply to write)\n");

  const loans = await Loan.find({ status: "Closed", seizedStatus: "Sold", "soldDetails.soldDate": { $exists: true } })
    .select("loanNumber customerName soldDetails principalAmount")
    .lean();
  console.log(`Closed vehicle loans with a recorded sale: ${loans.length}\n`);

  let totalToFix = 0;
  for (const loan of loans) {
    const emis = await EMI.find({ loanId: loan._id, loanModel: "Loan" }).sort({ emiNumber: 1 }).lean();
    // EMIs that never received any money and are not yet flagged as a close-out
    const toFix = emis.filter((e) => !e.closedWithoutPayment && !((e.amountPaid || 0) > 0));
    const genuine = emis.filter((e) => (e.amountPaid || 0) > 0);
    console.log(
      `Loan ${loan.loanNumber} ${loan.customerName || ""} | sold ${new Date(loan.soldDetails.soldDate).toISOString().slice(0, 10)} for Rs ${loan.soldDetails.sellAmount}`,
    );
    console.log(`  EMIs with real payments (left alone): ${genuine.length} ${genuine.length ? "(EMI " + genuine.map((e) => e.emiNumber).join(", ") + ")" : ""}`);
    console.log(`  EMIs to close out: ${toFix.length} ${toFix.length ? "(EMI " + toFix.map((e) => e.emiNumber + ":" + e.status).join(", ") + ")" : ""}`);
    totalToFix += toFix.length;
    if (APPLY && toFix.length) {
      const res = await EMI.updateMany(
        { _id: { $in: toFix.map((e) => e._id) } },
        { $set: { status: "Paid", paymentDate: loan.soldDetails.soldDate, closedWithoutPayment: true } },
        { timestamps: false },
      );
      console.log(`  -> updated ${res.modifiedCount} EMIs`);
    }
    console.log("");
  }
  console.log(APPLY ? `Done. ${totalToFix} EMIs closed out.` : `Report finished. ${totalToFix} EMIs would be closed out. Nothing was changed.`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
