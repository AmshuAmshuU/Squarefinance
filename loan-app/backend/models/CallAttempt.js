const mongoose = require("mongoose");

// How many times a call was logged against a loan on one IST day (every log
// except "Clear" adds one). Kept apart from CallRecord on purpose: that row is
// overwritten by each call and deleted by Clear, but the count must survive a
// Clear. It is per day, so each day starts blank - same as the follow-up lists'
// call note, which only shows a call made today.
const callAttemptSchema = new mongoose.Schema(
  {
    loanId: { type: mongoose.Schema.Types.ObjectId, required: true },
    loanModel: {
      type: String,
      required: true,
      enum: ["Loan", "WeeklyLoan", "DailyLoan", "InterestLoan"],
    },
    day: { type: String, required: true }, // "YYYY-MM-DD" in IST
    count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

callAttemptSchema.index({ loanId: 1, loanModel: 1, day: 1 }, { unique: true });
callAttemptSchema.index({ day: 1 });

module.exports = mongoose.model("CallAttempt", callAttemptSchema);
