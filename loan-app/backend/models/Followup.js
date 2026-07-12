const mongoose = require("mongoose");

const followupSchema = new mongoose.Schema(
  {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "loanModel",
    },
    loanModel: {
      type: String,
      required: true,
      enum: ["Loan", "WeeklyLoan", "DailyLoan"],
    },
    loanType: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      required: true,
    },
    followupDate: {
      type: Date,
      default: Date.now,
    },
    clientResponse: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    nextFollowupDate: {
      type: Date,
    },
    followedUpBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Followup", followupSchema);
