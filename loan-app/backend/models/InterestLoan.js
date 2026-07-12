const mongoose = require("mongoose");

const interestLoanSchema = new mongoose.Schema(
  {
    loanNumber: {
      type: String,
      required: [true, "Loan number is required"],
      unique: true,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
    },
    ownRent: {
      type: String,
      enum: ["Own", "Rent"],
      trim: true,
    },
    mobileNumbers: {
      type: [String],
      index: true,
    },
    guarantorName: {
      type: String,
      trim: true,
    },
    guarantorMobileNumbers: {
      type: [String],
    },
    panNumber: {
      type: String,
      trim: true,
    },
    aadharNumber: {
      type: String,
      trim: true,
    },
    pledgedItemDetails: {
      type: String,
      trim: true,
    },
    // Loan Terms
    initialPrincipalAmount: {
      type: Number,
      required: true,
    },
    remainingPrincipalAmount: {
      type: Number,
      required: true,
    },
    interestRate: {
      type: Number,
      required: true,
    },
    processingFeeRate: {
      type: Number,
      default: 0,
    },
    processingFee: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    emiStartDate: {
      type: Date,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Online", "Cheque"],
      default: "Cash",
    },

    // Payments tracking
    principalPayments: [
      {
        amount: { type: Number, required: true },
        paymentMode: {
          type: String,
          enum: ["Cash", "Online", "Cheque"],
          default: "Cash",
        },
        paymentDate: { type: Date, required: true },
        remarks: { type: String, trim: true },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    disbursement: [
      {
        amount: { type: Number, required: true },
        mode: {
          type: String,
          enum: ["Cash", "Online", "Cheque"],
          default: "Cash",
        },
        chequeNumber: { type: String, trim: true },
        date: { type: Date, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Closed", "Pending", "Seized"],
      default: "Active",
      index: true,
    },
    nextFollowUpDate: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
    clientResponse: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("InterestLoan", interestLoanSchema);
