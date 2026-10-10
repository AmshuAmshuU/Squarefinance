const mongoose = require("mongoose");

// One row per month: what the Analytics page EXPECTED (monthly EMI + profit)
// at the start and the end of the month, and the profit actually made.
//
// - opening: written ONCE, the first time the Super Admin opens Analytics in
//   the month. Never changed afterwards.
// - closing: replaced on every Super Admin visit, so the last visit of the
//   month is what stays.
// - actualProfit: month-to-date while the month runs; re-calculated exactly
//   and frozen (finalized: true) on the first visit of the next month.
//
// Months before SNAPSHOT_START_MONTH (see analyticsController.js) deliberately
// have NO opening/closing snapshot (shown as NA) - the expected figures for
// those dates were never recorded and are not guessed. Their actualProfit is
// exact and is filled by scripts/backfillMonthlyActualProfit.js.
const snapshotSchema = new mongoose.Schema(
  {
    capturedAt: { type: Date, required: true },
    expectedMonthlyEmi: {
      total: { type: Number, required: true },
      vehicle: { type: Number, required: true },
      weekly: { type: Number, required: true }, // weekly EMI x 4, as on the card
      daily: { type: Number, required: true }, // daily EMI x 30, as on the card
      interest: { type: Number, required: true },
    },
    expectedProfit: {
      total: { type: Number, required: true },
      vehicle: { type: Number, required: true },
      interest: { type: Number, required: true }, // Weekly/Daily have no expected profit
    },
  },
  { _id: false },
);

const monthlyProfitSnapshotSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}$/ }, // "2026-11"
    opening: { type: snapshotSchema },
    closing: { type: snapshotSchema },
    actualProfit: {
      total: { type: Number },
      vehicle: { type: Number },
      weekly: { type: Number },
      daily: { type: Number },
      interest: { type: Number },
      finalized: { type: Boolean, default: false },
      calculatedAt: { type: Date },
    },
    source: { type: String, enum: ["snapshot", "backfill"], default: "snapshot" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("MonthlyProfitSnapshot", monthlyProfitSnapshotSchema);
