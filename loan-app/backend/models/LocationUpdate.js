const mongoose = require("mongoose");

// One row per time a customer shared their location through the link on their
// loan (history + the "Location Updates" page). The loan itself still only
// keeps the LATEST location (lastLocationLat/Lng/At) - that is unchanged.
//
// seenBy is per person: each staff member's own banner / unseen count stays
// until THEY mark it seen. backfilled rows (the one latest location each loan
// already had when this feature was added) are history only and never count as
// unseen.
const locationUpdateSchema = new mongoose.Schema(
  {
    loanId: { type: mongoose.Schema.Types.ObjectId, required: true },
    loanModel: { type: String, required: true, enum: ["Loan", "WeeklyLoan", "DailyLoan", "InterestLoan"] },
    loanNumber: { type: String },
    customerName: { type: String },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    at: { type: Date, default: Date.now, required: true },
    seenBy: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        userName: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],
    backfilled: { type: Boolean, default: false },
  },
  { timestamps: false },
);

locationUpdateSchema.index({ at: -1 });
locationUpdateSchema.index({ loanId: 1, loanModel: 1, at: -1 });

module.exports = mongoose.model("LocationUpdate", locationUpdateSchema);
