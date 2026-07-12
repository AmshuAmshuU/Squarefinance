const Loan = require("../models/Loan");
const DailyLoan = require("../models/DailyLoan");
const WeeklyLoan = require("../models/WeeklyLoan");
const EMI = require("../models/EMI");
const mongoose = require("mongoose");

/**
 * Get all loans with at least one pending EMI, grouped by type.
 */
const getPendingLoans = async () => {
  const pendingEmis = await EMI.find({ status: "Pending" }).select("loanId loanModel").lean();

  const loanIdsByType = {
    Loan: new Set(),
    DailyLoan: new Set(),
    WeeklyLoan: new Set(),
  };

  pendingEmis.forEach((emi) => {
    if (loanIdsByType[emi.loanModel]) {
      loanIdsByType[emi.loanModel].add(emi.loanId.toString());
    }
  });

  const [monthly, daily, weekly] = await Promise.all([
    Loan.find({ _id: { $in: Array.from(loanIdsByType.Loan) } }).lean(),
    DailyLoan.find({ _id: { $in: Array.from(loanIdsByType.DailyLoan) } }).lean(),
    WeeklyLoan.find({ _id: { $in: Array.from(loanIdsByType.WeeklyLoan) } }).lean(),
  ]);

  return { monthly, daily, weekly };
};

/**
 * Get partial EMI loans (Monthly only).
 */
const getPartialLoans = async () => {
  const partialEmis = await EMI.find({
    status: "Partially Paid",
    loanModel: "Loan",
  }).select("loanId").lean();

  const loanIds = Array.from(new Set(partialEmis.map((e) => e.loanId.toString())));
  return await Loan.find({ _id: { $in: loanIds } }).lean();
};

/**
 * Get loans that have a follow-up date set.
 */
const getFollowups = async () => {
  const [monthly, daily, weekly] = await Promise.all([
    Loan.find({ followUpDate: { $ne: null } }).lean(),
    DailyLoan.find({ followUpDate: { $ne: null } }).lean(),
    WeeklyLoan.find({ followUpDate: { $ne: null } }).lean(),
  ]);

  return { monthly, daily, weekly };
};

/**
 * Update client response and follow-up date for any loan type.
 */
const updateClientResponse = async (loanId, loanType, clientResponse, followUpDate) => {
  const Model = getModelByType(loanType);
  return await Model.findByIdAndUpdate(
    loanId,
    { clientResponse, followUpDate: followUpDate ? new Date(followUpDate) : null },
    { new: true }
  );
};

/**
 * Complete a follow-up by clearing the date.
 */
const completeFollowup = async (loanId, loanType) => {
  const Model = getModelByType(loanType);
  return await Model.findByIdAndUpdate(
    loanId,
    { followUpDate: null },
    { new: true }
  );
};

// Helper to determine which mongoose model to use
const getModelByType = (type) => {
  switch (type.toLowerCase()) {
    case "monthly":
    case "loan":
      return Loan;
    case "daily":
    case "dailyloan":
      return DailyLoan;
    case "weekly":
    case "weeklyloan":
      return WeeklyLoan;
    default:
      throw new Error("Invalid loan type");
  }
};

module.exports = {
  getPendingLoans,
  getPartialLoans,
  getFollowups,
  updateClientResponse,
  completeFollowup,
};
