// Adds a NEW dated snapshot of the partners' share percentages. Old snapshots
// are never changed or removed (the history is kept on purpose), and the
// Analytics "Partners" card always uses the latest one that has taken effect.
//
// To record a change in shares: edit the block below (new date, new
// percentages, reason) and run it once. It refuses to run if the percentages
// do not add up to 100, or if a snapshot already exists for the same date.
//
//   cd backend
//   node scripts/addPartnerShares.js
//
// Against production (Karthik runs this himself in a fresh terminal):
//   set "MONGODB_URI=<production connection string>"
//   node scripts/addPartnerShares.js
require("dotenv").config();
const mongoose = require("mongoose");
const PartnerShareSnapshot = require("../models/PartnerShareSnapshot");

// ---------------------------------------------------------------------------
const EFFECTIVE_FROM = "2026-09-25"; // the day the Rs 1.55 Cr investment was frozen
const INVESTMENT_AMOUNT = 15500000; // capital these stakes are based on
const REASON = "Initial stakes, based on each partner's share of the Rs 1,55,00,000 frozen investment";
const PARTNERS = [
  { name: "Purushotham", percent: 51.29 },
  { name: "Karthik", percent: 32.26 },
  { name: "Ranjith", percent: 8.71 },
  { name: "Rohit", percent: 7.74 },
];
// ---------------------------------------------------------------------------

const show = (label, snap) => {
  console.log(label);
  if (!snap) return console.log("  (none yet)");
  console.log(`  effective from: ${new Date(snap.effectiveFrom).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}`);
  snap.partners.forEach((p) => console.log(`  ${p.name.padEnd(12)} ${p.percent}%`));
  if (snap.reason) console.log(`  reason: ${snap.reason}`);
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to:", mongoose.connection.name || "(default)");

  const total = PARTNERS.reduce((a, p) => a + p.percent, 0);
  if (Math.abs(total - 100) > 0.0001) {
    console.log(`\nThe percentages add up to ${total}, not 100 - nothing was saved.`);
    return mongoose.disconnect();
  }

  const effectiveFrom = new Date(`${EFFECTIVE_FROM}T00:00:00+05:30`);
  const history = await PartnerShareSnapshot.find().sort({ effectiveFrom: 1, createdAt: 1 }).lean();
  console.log(`\nSnapshots already on record: ${history.length}`);
  show("\nLatest on record:", history[history.length - 1]);

  if (history.some((s) => new Date(s.effectiveFrom).getTime() === effectiveFrom.getTime())) {
    console.log(`\nA snapshot effective ${EFFECTIVE_FROM} already exists - nothing was added (history is never overwritten).`);
    return mongoose.disconnect();
  }

  await PartnerShareSnapshot.create({
    effectiveFrom,
    partners: PARTNERS,
    investmentAmount: INVESTMENT_AMOUNT,
    reason: REASON,
  });

  const after = await PartnerShareSnapshot.find().sort({ effectiveFrom: 1, createdAt: 1 }).lean();
  console.log(`\nAdded. Snapshots on record now: ${after.length}`);
  show("\nNewly added:", after.find((s) => new Date(s.effectiveFrom).getTime() === effectiveFrom.getTime()));
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
