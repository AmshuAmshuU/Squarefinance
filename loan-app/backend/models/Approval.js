const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema(
  {
    requestType: {
      type: String,
      enum: ["EMI_PAYMENT", "INTEREST_PAYMENT", "FORECLOSURE", "PRINCIPAL_PAYMENT"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // This will be EMI ID or Loan ID
    },
    targetModel: {
      type: String,
      enum: ["EMI", "InterestEMI", "Loan", "WeeklyLoan", "DailyLoan", "InterestLoan"],
      required: true,
    },
    loanNumber: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    requestedData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    remarks: {
      type: String,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Approval", approvalSchema);
