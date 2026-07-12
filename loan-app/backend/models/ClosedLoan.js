const mongoose = require("mongoose");

const closedLoanSchema = new mongoose.Schema(
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
    closureType: {
      type: String,
      enum: ["Foreclosure", "Sold", "Full Payment"],
      required: true,
    },
    closureDate: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    soldDetails: {
      sellAmount: Number,
      miscellaneousAmount: Number,
      totalAmount: Number,
      buyerName: String,
      buyerContact: String,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ClosedLoan", closedLoanSchema);
