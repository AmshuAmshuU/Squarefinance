// ONE-OFF: gives every loan that already has a customer-shared location its
// first row in the new location history (the "Location history" button and the
// Location Updates page), using the latest location and time the loan already
// holds. Before this feature only the latest tap was ever kept, so nothing
// older exists to recover.
//
// These rows are marked backfilled: they are history only and NEVER count as
// "unseen", so nobody gets a flood of alerts.
//
// - DRY RUN by default: prints what it would add and changes nothing.
//   Add --write to actually save.
// - Safe to re-run: a loan that already has any history row is skipped.
//
// Run from the backend folder:
//   node scripts/backfillLocationHistory.js            (preview only)
//   node scripts/backfillLocationHistory.js --write    (save)
require("dotenv").config();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const InterestLoan = require("../models/InterestLoan");
const LocationUpdate = require("../models/LocationUpdate");

const write = process.argv.includes("--write");
const MODELS = [
  { Model: Loan, name: "Loan" },
  { Model: WeeklyLoan, name: "WeeklyLoan" },
  { Model: DailyLoan, name: "DailyLoan" },
  { Model: InterestLoan, name: "InterestLoan" },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to:", mongoose.connection.name);
  console.log(write ? "MODE: WRITE (saving rows)\n" : "MODE: PREVIEW ONLY - nothing is saved. Add --write to save.\n");

  let found = 0;
  let added = 0;
  for (const { Model, name } of MODELS) {
    const loans = await Model.find(
      { lastLocationAt: { $ne: null }, lastLocationLat: { $ne: null }, lastLocationLng: { $ne: null } },
      "loanNumber customerName lastLocationLat lastLocationLng lastLocationAt",
    ).lean();
    let typeAdded = 0;
    for (const loan of loans) {
      found++;
      if (await LocationUpdate.exists({ loanId: loan._id, loanModel: name })) continue;
      typeAdded++;
      if (write) {
        await LocationUpdate.create({
          loanId: loan._id,
          loanModel: name,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          lat: loan.lastLocationLat,
          lng: loan.lastLocationLng,
          at: loan.lastLocationAt,
          backfilled: true,
        });
      }
    }
    added += typeAdded;
    console.log(`${name.padEnd(12)} loans with a shared location: ${String(loans.length).padStart(4)}   history rows ${write ? "added" : "to add"}: ${typeAdded}`);
  }
  console.log(`\n${write ? "Added" : "Would add"} ${added} row(s) (${found} loans have a shared location).`);
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
