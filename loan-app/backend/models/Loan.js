const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    siNo: {
      type: String,
      trim: true,
    },
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
    principalAmount: {
      type: Number,
    },
    processingFeeRate: {
      type: Number,
      default: 0,
    },
    processingFee: {
      type: Number,
    },
    tenureType: {
      type: String,
      default: "Monthly",
    },
    tenureMonths: {
      type: Number,
    },
    annualInterestRate: {
      type: Number,
    },
    dateLoanDisbursed: {
      type: Date,
    },
    emiStartDate: {
      type: Date,
    },
    emiEndDate: {
      type: Date,
    },
    monthlyEMI: {
      type: Number,
    },
    totalInterestAmount: {
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
    vehicleNumber: {
      type: String,
      trim: true,
    },
    chassisNumber: {
      type: String,
      trim: true,
    },
    engineNumber: {
      type: String,
      trim: true,
    },
    modelYear: {
      type: String,
      trim: true,
    },
    typeOfVehicle: {
      type: String,
      trim: true,
    },
    ywBoard: {
      type: String,
      trim: true,
    },
    docChecklist: {
      type: String,
      trim: true,
    },
    dealerName: {
      type: String,
      trim: true,
    },
    dealerNumber: {
      type: String,
      trim: true,
    },
    fcDate: {
      type: Date,
    },
    insuranceDate: {
      type: Date,
    },
    rtoWorkPending: {
      type: [String],
      default: [],
    },
    hpEntry: {
      type: String,
      enum: ["Not done", "Applied", "Finished"],
      default: "Not done",
      trim: true,
    },
    isSeized: {
      type: Boolean,
      default: false,
    },
    seizedDate: {
      type: Date,
    },
    seizedStatus: {
      type: String,
      enum: ["For Seizing", "Seized", "Sold", "Re-activate"],
      default: "For Seizing",
    },
    remarks: {
      type: String,
      trim: true,
    },
    pledgedItemDetails: {
      type: String,
      trim: true,
    },
    clientResponse: {
      type: String,
      trim: true,
    },
    nextFollowUpDate: {
      type: Date,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["Active", "Closed", "Seized", "Pending", "Waiting for Approval"],
        message: "Please select a valid status",
      },
      default: "Active",
      trim: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      default: "Pending",
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    odAmount: {
      type: Number,
      default: 0,
    },
    remainingPrincipal: {
      type: Number,
      default: 0,
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
    soldDetails: {
      sellAmount: {
        type: Number,
      },
      miscellaneousAmount: {
        type: Number,
        default: 0,
      },
      totalAmount: {
        type: Number,
      },
      soldDate: {
        type: Date,
      },
      soldBy: {
        type: mongoose.Schema.Types.Mixed,
        ref: "User",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for Seized Vehicle details
loanSchema.virtual("seizedDetails", {
  ref: "SeizedVehicle",
  localField: "_id",
  foreignField: "loanId",
  justOne: true,
});

// Virtual for Closure details
loanSchema.virtual("closureDetails", {
  ref: "ClosedLoan",
  localField: "_id",
  foreignField: "loanId",
  justOne: true,
});

// Virtual for Follow-up history
loanSchema.virtual("followupHistory", {
  ref: "Followup",
  localField: "_id",
  foreignField: "loanId",
});

// Additional indexes for analytics and faster searching
loanSchema.index({ principalAmount: 1 });
loanSchema.index({ foreclosureAmount: 1 });
loanSchema.index({ "soldDetails.totalAmount": 1 });
loanSchema.index({ "soldDetails.sellAmount": 1 });
loanSchema.index({ paymentStatus: 1 });
loanSchema.index({ isSeized: 1 });
loanSchema.index({ seizedStatus: 1 });

module.exports = mongoose.model("Loan", loanSchema);
