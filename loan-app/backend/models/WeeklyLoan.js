const mongoose = require("mongoose");

const weeklyLoanSchema = new mongoose.Schema(
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
    },
    address: {
      type: String,
      trim: true,
    },
    ownRent: {
      type: String,
      enum: ["Own", "Rent", ""],
      trim: true,
    },
    mobileNumbers: {
      type: [String],
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
    disbursementAmount: {
      type: Number,
    },
    startDate: {
      type: Date,
    },
    dateLoanDisbursed: {
      type: Date,
    },
    totalEmis: {
      type: Number,
    },
    emiAmount: {
      type: Number,
    },
    paidEmis: {
      type: Number,
      default: 0,
    },
    remainingEmis: {
      type: Number,
    },
    totalAmount: {
      type: Number,
    },
    nextEmiDate: {
      type: Date,
    },
    processingFee: {
      type: Number,
    },
    totalCollected: {
      type: Number,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Online", "Cheque"],
      default: "Cash",
    },
    chequeNumber: {
      type: String,
      trim: true,
    },
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
      enum: ["Active", "Closed", "Pending", "Seized", "Waiting for Approval"],
      default: "Active",
    },
    nextFollowUpDate: {
      type: Date,
    },
    clientResponseUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    clientResponseUpdatedAt: {
      type: Date,
    },
    odAmount: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      trim: true,
    },
    clientResponse: {
      type: String,
      trim: true,
    },
    processingFeeRate: {
      type: Number,
      default: 0,
    },
    interestRate: {
      type: Number,
      default: 0,
    },
    emiStartDate: {
      type: Date,
    },
    emiEndDate: {
      type: Date,
    },
    totalInterestAmount: {
      type: Number,
      default: 0,
    },
    remainingPrincipalAmount: {
      type: Number,
    },
    expenses: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      default: "Weekly",
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
    foreclosedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
    },
    foreclosureDate: {
      type: Date,
    },
    foreclosureAmount: {
      type: Number,
    },
    foreclosureChargeAmount: {
      type: Number,
      default: 0,
    },
    foreclosureChargePercent: {
      type: Number,
      default: 0,
    },
    miscellaneousFee: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for Closure details
weeklyLoanSchema.virtual("closureDetails", {
  ref: "ClosedLoan",
  localField: "_id",
  foreignField: "loanId",
  justOne: true,
});

// Virtual for Follow-up history
weeklyLoanSchema.virtual("followupHistory", {
  ref: "Followup",
  localField: "_id",
  foreignField: "loanId",
});

// Indexes
weeklyLoanSchema.index({ status: 1 });
weeklyLoanSchema.index({ loanNumber: 1 });
weeklyLoanSchema.index({ customerName: 1 });
weeklyLoanSchema.index({ mobileNumbers: 1 });
weeklyLoanSchema.index({ guarantorMobileNumbers: 1 });
weeklyLoanSchema.index({ disbursementAmount: 1 });
weeklyLoanSchema.index({ nextFollowUpDate: 1 });

module.exports = mongoose.model("WeeklyLoan", weeklyLoanSchema);
