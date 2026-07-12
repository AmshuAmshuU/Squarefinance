const mongoose = require("mongoose");

const seizedVehicleSchema = new mongoose.Schema(
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
    seizedDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["For Seizing", "Seized", "Sold", "Re-activate"],
      default: "For Seizing",
    },
    remarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SeizedVehicle", seizedVehicleSchema);
