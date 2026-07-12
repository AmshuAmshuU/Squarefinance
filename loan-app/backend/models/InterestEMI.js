const mongoose = require("mongoose");

const interestEmiSchema = new mongoose.Schema(
  {
    interestLoanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterestLoan",
      required: true,
    },
    loanNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    emiNumber: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    interestAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Partially Paid", "Waiting for Approval"],
      default: "Pending",
    },
    paymentDate: {
      type: Date,
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Online", "Cheque", ""],
      default: "",
    },
    chequeNumber: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    overdue: [{ date: { type: Date }, amount: { type: Number }, mode: { type: String }, chequeNumber: { type: String } }],
    paymentHistory: [
      {
        amount: { type: Number, required: true },
        mode: { type: String, required: true },
        chequeNumber: { type: String, default: "" },
        date: { type: Date, required: true },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

interestEmiSchema.index({ interestLoanId: 1 });
interestEmiSchema.index({ status: 1 });
interestEmiSchema.index({ dueDate: 1 });

module.exports = mongoose.model("InterestEMI", interestEmiSchema);
