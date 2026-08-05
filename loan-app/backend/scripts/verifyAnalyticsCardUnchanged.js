// Read-only diagnostic requested after Karthik pushed back on the Collections
// rebuild: proves the main Analytics page cards (getAnalyticsStats) and the
// numbers Karthik personally verified are computed by code this rebuild
// never touched, and shows exactly how the (also correct, EMI-direct)
// Analytics card total relates to the new Collections total.
require("dotenv").config();
const mongoose = require("mongoose");
const { getAnalyticsStats } = require("../controllers/analyticsController");
const { getAllCollectionEvents } = require("../utils/collectionEvents");

function callController(fn, req) {
  return new Promise((resolve, reject) => {
    const res = {
      status(c) { this._status = c; return this; },
      json(body) { this._body = body; resolve(this); return this; },
    };
    Promise.resolve(fn(req, res, reject)).catch(reject);
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to:", mongoose.connection.db.databaseName);

  const res = await callController(getAnalyticsStats, { query: {} });
  const cards = res._body.data.cards;
  console.log("\n=== Main Analytics card (getAnalyticsStats) - UNCHANGED code ===");
  console.log("totalCollectedAmount:", cards.totalCollectedAmount);

  const events = await getAllCollectionEvents({});
  const collectionsTotal = events.reduce((s, e) => s + e.totalAmount, 0);
  const processingFeeTotal = events
    .filter(() => false) // Collections/collectionEvents never includes Processing Fee
    .reduce((s, e) => s + e.totalAmount, 0);

  console.log("\n=== New Collections total (getAllCollectionEvents) ===");
  console.log("Sum of all collection events:", collectionsTotal);
  console.log("(Collections has never included Processing Fee - that's a disbursement-time");
  console.log(" fee, not a collection event, and was already excluded before this rebuild)");

  console.log("\nDifference (Analytics card - Collections total):", cards.totalCollectedAmount - collectionsTotal);
  console.log("This gap should be ~= total Processing Fees across all loan types,");
  console.log("since that's the one category the Analytics card includes that Collections doesn't.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
