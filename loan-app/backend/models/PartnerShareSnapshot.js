const mongoose = require("mongoose");

// One dated snapshot of who owns what percentage of the business.
//
// APPEND-ONLY BY DESIGN: when the shares change, a NEW snapshot is added with
// the date it took effect - old snapshots are never edited or deleted, so the
// full ownership history is kept for the years ahead. The Analytics "Partners"
// card shows the latest snapshot whose effectiveFrom is not in the future.
// New snapshots are added with backend/scripts/addPartnerShares.js.
const partnerShareSnapshotSchema = new mongoose.Schema(
  {
    effectiveFrom: { type: Date, required: true },
    partners: {
      type: [
        {
          _id: false,
          name: { type: String, required: true, trim: true },
          percent: { type: Number, required: true, min: 0, max: 100 },
        },
      ],
      validate: {
        validator: (arr) => {
          if (!Array.isArray(arr) || arr.length === 0) return false;
          const total = arr.reduce((a, p) => a + p.percent, 0);
          return Math.abs(total - 100) < 0.0001;
        },
        message: "Partner percentages must add up to exactly 100",
      },
    },
    // The capital the stakes were based on at that time (informational).
    investmentAmount: { type: Number },
    reason: { type: String, default: "" },
  },
  { timestamps: true },
);

const blocked = () => {
  throw new Error(
    "Partner share history is append-only: add a new dated snapshot instead of changing or deleting an old one.",
  );
};
[
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "findOneAndReplace",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
].forEach((op) => partnerShareSnapshotSchema.pre(op, blocked));
partnerShareSnapshotSchema.pre("save", function () {
  if (!this.isNew) blocked();
});

module.exports = mongoose.model("PartnerShareSnapshot", partnerShareSnapshotSchema);
