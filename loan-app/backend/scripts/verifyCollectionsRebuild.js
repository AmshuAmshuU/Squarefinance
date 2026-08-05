// Read-only diagnostic: compares the new EMI-direct collection events
// (utils/collectionEvents.js) against the old Payment-collection totals,
// to sanity-check the Collections rebuild before Karthik tests it live.
// Safe to run against staging or production - makes no writes.
require("dotenv").config();
const mongoose = require("mongoose");
const { getAllCollectionEvents } = require("../utils/collectionEvents");
const Payment = require("../models/Payment");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to:", mongoose.connection.db.databaseName);

  const events = await getAllCollectionEvents({});
  const oldPayments = await Payment.find({}).lean();

  console.log("\n=== NEW (EMI-direct) totals by paymentType ===");
  const newByType = {};
  events.forEach((e) => {
    newByType[e.paymentType] = newByType[e.paymentType] || { count: 0, total: 0 };
    newByType[e.paymentType].count += 1;
    newByType[e.paymentType].total += e.totalAmount;
  });
  Object.entries(newByType).sort().forEach(([type, v]) => {
    console.log(`  ${type.padEnd(28)} count=${String(v.count).padEnd(6)} total=${v.total}`);
  });
  const newGrandTotal = events.reduce((s, e) => s + e.totalAmount, 0);
  console.log(`  ${"TOTAL".padEnd(28)} count=${String(events.length).padEnd(6)} total=${newGrandTotal}`);

  console.log("\n=== OLD (Payment collection) totals by paymentType ===");
  const oldByType = {};
  oldPayments.forEach((p) => {
    const amt = p.totalAmount || p.amount || 0;
    oldByType[p.paymentType] = oldByType[p.paymentType] || { count: 0, total: 0 };
    oldByType[p.paymentType].count += 1;
    oldByType[p.paymentType].total += amt;
  });
  Object.entries(oldByType).sort().forEach(([type, v]) => {
    console.log(`  ${String(type).padEnd(28)} count=${String(v.count).padEnd(6)} total=${v.total}`);
  });
  const oldGrandTotal = oldPayments.reduce((s, p) => s + (p.totalAmount || p.amount || 0), 0);
  console.log(`  ${"TOTAL".padEnd(28)} count=${String(oldPayments.length).padEnd(6)} total=${oldGrandTotal}`);

  console.log(`\nGrand total diff (new - old): ${newGrandTotal - oldGrandTotal}`);

  // Loan 111 specific check (the reported bug)
  console.log("\n=== Loan 111 events (new) ===");
  const loan111Events = events.filter((e) => e.loanNumber == 111 || String(e.loanNumber) === "111");
  loan111Events.forEach((e) => {
    console.log(`  ${new Date(e.date).toISOString().slice(0,10)}  ${e.paymentType.padEnd(24)} mode=${(e.paymentMode||"").padEnd(8)} amount=${e.totalAmount}  by=${e.updatedBy}`);
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
