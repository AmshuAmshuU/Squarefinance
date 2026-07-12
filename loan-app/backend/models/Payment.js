const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    emiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EMI",
      required: false,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "loanModel",
    },
    loanModel: {
      type: String,
      required: true,
      enum: ["Loan", "WeeklyLoan", "DailyLoan", "InterestLoan"],
    },
    amount: {
      type: Number,
      default: 0,
    },
    emiAmount: {
      type: Number,
      default: 0,
    },
    overdueAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    mode: {
      type: String,
      required: true,
      default: "Cash",
    },
    chequeNumber: {
      type: String,
      default: "",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    paymentType: {
      type: String,
      enum: [
        "Monthly",
        "Daily",
        "Weekly",
        "Processing Fee",
        "Overdue",
        "Interest",
        "Foreclosure",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["Partial", "Pending", "Success"],
      default: "Success",
    },
    remarks: {
      type: String,
      trim: true,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
