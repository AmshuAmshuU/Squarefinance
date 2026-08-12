// One-time backfill: generates a locationToken for any existing loan (all
// 4 types) that doesn't already have one - new loans get one automatically
// at creation, but loans created before this feature shipped need this run
// once. Safe to re-run anytime - only touches loans missing a token.
require("dotenv").config();
const mongoose = require("mongoose");
const { MODELS, generateLocationToken } = require("../utils/customerLocation");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to:", mongoose.connection.db.databaseName);

  let totalFixed = 0;
  for (const { Model, name } of MODELS) {
    const missing = await Model.find({
      $or: [{ locationToken: { $exists: false } }, { locationToken: null }],
    }).select("_id loanNumber");

    console.log(`${name}: ${missing.length} loan(s) missing a token`);

    for (const loan of missing) {
      await Model.updateOne(
        { _id: loan._id },
        { $set: { locationToken: generateLocationToken() } },
        { timestamps: false }
      );
    }
    totalFixed += missing.length;
  }

  console.log(`\nDone. ${totalFixed} loan(s) given a new locationToken.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
