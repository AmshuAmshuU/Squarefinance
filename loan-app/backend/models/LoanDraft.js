const mongoose = require("mongoose");

// A half-filled vehicle loan form, saved on the server while a Super Admin
// decides whether an interest rate below 2.00 is allowed. Not a loan yet - the
// loan only exists once someone finishes the form and presses create. Visible
// to every user who can create loans (any of them can continue it).
const loanDraftSchema = new mongoose.Schema(
  {
    loanNumber: { type: String, default: "" },
    customerName: { type: String, default: "" },
    // The whole Add Loan form exactly as it was when saved.
    formData: { type: mongoose.Schema.Types.Mixed, required: true },
    requestedRate: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Waiting for Approval", "Approved", "Rejected", "Completed"],
      default: "Waiting for Approval",
    },
    approvalId: { type: mongoose.Schema.Types.ObjectId, ref: "Approval" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    // Approval is good for 24 hours from approvedAt.
    expiresAt: { type: Date },

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectRemarks: { type: String },

    // Whoever finally pressed create (can be a different person from createdBy).
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LoanDraft", loanDraftSchema);
