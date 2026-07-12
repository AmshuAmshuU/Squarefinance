const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
    },
    loanNumber: {
      type: String,
      required: [
        function () {
          return !this.isOfficeExpense;
        },
        "Loan number is required",
      ],
      trim: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    particulars: {
      type: String,
      required: [true, "Particulars are required"],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isOfficeExpense: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Index for faster searching
expenseSchema.index({ loanNumber: 1 });
expenseSchema.index({ vehicleNumber: 1 });
expenseSchema.index({ date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
