const mongoose = require("mongoose");

const emiSchema = new mongoose.Schema(
  {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "loanModel",
      required: true,
    },
    loanModel: {
      type: String,
      required: true,
      enum: ["Loan", "WeeklyLoan", "DailyLoan"],
      default: "Loan",
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
    emiAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    paymentMode: {
      type: String,
      default: "",
    },
    paymentDate: {
      type: Date,
    },
    overdue: {
      type: [
        {
          date: { type: Date, required: true },
          amount: { type: Number, required: true },
          mode: { type: String, default: "CASH" },
          chequeNumber: { type: String, default: "" },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Partially Paid", "Overdue", "Waiting for Approval"],
      default: "Pending",
    },
    remarks: {
      type: String,
      trim: true,
    },
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for individual payment records
emiSchema.virtual("paymentRecords", {
  ref: "Payment",
  localField: "_id",
  foreignField: "emiId",
});

// Indexes for analytics and lookup
emiSchema.index({ loanId: 1 });
emiSchema.index({ amountPaid: 1 });
emiSchema.index({ status: 1 });
emiSchema.index({ status: 1, paymentDate: 1 });
emiSchema.index({ "overdue.date": 1 });

module.exports = mongoose.model("EMI", emiSchema);
