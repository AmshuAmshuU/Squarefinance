const mongoose = require("mongoose");

// The most recent phone call logged against a loan (one row per loan,
// overwritten by each new call). Follow-up lists only show a record made
// today (IST) - it's a same-day coordination note so two staff don't call the
// same customer twice - but the loan details page shows the last call with
// its date whenever it happened.
const callRecordSchema = new mongoose.Schema(
  {
    loanId: { type: mongoose.Schema.Types.ObjectId, required: true },
    loanModel: {
      type: String,
      required: true,
      enum: ["Loan", "WeeklyLoan", "DailyLoan", "InterestLoan"],
    },
    response: { type: String, required: true, enum: ["NP", "EOD", "SWO"] },
    calledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    calledByName: { type: String, required: true },
    calledAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true },
);

callRecordSchema.index({ loanId: 1, loanModel: 1 }, { unique: true });
callRecordSchema.index({ calledAt: -1 });

module.exports = mongoose.model("CallRecord", callRecordSchema);
