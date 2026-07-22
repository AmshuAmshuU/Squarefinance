const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const EMI = require("../models/EMI");
const InterestEMI = require("../models/InterestEMI");

// Detection-only. Never modifies data - each check here mirrors a known bug
// pattern this app has actually hit (see CLAUDE.md "Known Past Bugs" and the
// approvalController.js Vehicle-loan auto-close fix), so a genuine fix always
// goes through the same read-only-diagnose-then-explicit-approval process,
// via the matching scripts/*.js repair script - never automatically here.

// 1. Loans where every EMI is Paid and remaining principal is 0, but the
// loan itself was never closed - the exact symptom of the approval-workflow
// auto-close bug fixed for Vehicle loans. Interest loans are intentionally
// excluded: their "all currently-generated EMIs paid" state is normal
// (principal is repaid separately) and doesn't imply the loan should close.
const findStuckLoans = async () => {
  const results = [];

  const vehicleLoans = await Loan.find({ status: { $ne: "Closed" } }).lean();
  for (const loan of vehicleLoans) {
    const emis = await EMI.find({ loanId: loan._id, loanModel: "Loan" }).lean();
    if (emis.length === 0) continue;
    const isAllPaid = emis.every((e) => e.status === "Paid");
    if (isAllPaid && (loan.remainingPrincipal || 0) === 0) {
      results.push({ type: "Vehicle", loanNumber: loan.loanNumber, customerName: loan.customerName });
    }
  }

  for (const [Model, loanModel, label] of [[WeeklyLoan, "WeeklyLoan", "Weekly"], [DailyLoan, "DailyLoan", "Daily"]]) {
    const loans = await Model.find({ status: { $ne: "Closed" } }).lean();
    for (const loan of loans) {
      const emis = await EMI.find({ loanId: loan._id, loanModel }).lean();
      if (emis.length === 0) continue;
      const isAllPaid = emis.every((e) => e.status === "Paid");
      if (isAllPaid && (loan.remainingPrincipalAmount || 0) === 0) {
        results.push({ type: label, loanNumber: loan.loanNumber, customerName: loan.customerName });
      }
    }
  }

  return results;
};

// 2. Weekly/Daily loans whose stored paidEmis/remainingEmis counters don't
// match what their actual EMI records say - the bug fixPaidEmis.js repairs.
const findEmiCounterDrift = async () => {
  const results = [];

  for (const [Model, loanModel, label] of [[WeeklyLoan, "WeeklyLoan", "Weekly"], [DailyLoan, "DailyLoan", "Daily"]]) {
    const loans = await Model.find({}).lean();
    for (const loan of loans) {
      const emis = await EMI.find({ loanId: loan._id, loanModel }).lean();
      if (emis.length === 0) continue;
      const actualPaidEmis = emis.filter((e) => e.status === "Paid").length;
      const actualRemainingEmis = emis.length - actualPaidEmis;
      const storedPaidEmis = loan.paidEmis || 0;
      const storedRemainingEmis = loan.remainingEmis || 0;
      if (storedPaidEmis !== actualPaidEmis || storedRemainingEmis !== actualRemainingEmis) {
        results.push({ type: label, loanNumber: loan.loanNumber, customerName: loan.customerName });
      }
    }
  }

  return results;
};

// 3. EMIs where "overdue" is stored as something other than an array - the
// bug fixCorruptedOverdue.js repairs. Mongoose validation would reject a
// fresh write like this, but historical records can still carry it forward.
const findCorruptedOverdue = async () => {
  const seen = new Set();
  const results = [];
  const addUnique = (type, loanNumber, customerName) => {
    const key = `${type}|${loanNumber}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ type, loanNumber, customerName });
  };

  const badEmis = await EMI.find({ overdue: { $not: { $type: "array" } } }).lean();
  badEmis.forEach((e) => addUnique(e.loanModel === "Loan" ? "Vehicle" : e.loanModel === "WeeklyLoan" ? "Weekly" : "Daily", e.loanNumber, e.customerName));

  const badInterestEmis = await InterestEMI.find({ overdue: { $exists: true, $not: { $type: "array" } } }).lean();
  badInterestEmis.forEach((e) => addUnique("Interest", e.loanNumber, e.customerName));

  return results;
};

// 4. Active loans with zero EMI records at all - a schedule-generation
// failure at disbursement time that would otherwise go unnoticed until
// someone tries to record a payment.
const findLoansMissingSchedule = async () => {
  const results = [];

  for (const [Model, loanModel, label] of [[Loan, "Loan", "Vehicle"], [WeeklyLoan, "WeeklyLoan", "Weekly"], [DailyLoan, "DailyLoan", "Daily"]]) {
    const activeLoans = await Model.find({ status: "Active" }).lean();
    for (const loan of activeLoans) {
      const count = await EMI.countDocuments({ loanId: loan._id, loanModel });
      if (count === 0) {
        results.push({ type: label, loanNumber: loan.loanNumber, customerName: loan.customerName });
      }
    }
  }

  const InterestLoan = require("../models/InterestLoan");
  const activeInterestLoans = await InterestLoan.find({ status: "Active" }).lean();
  for (const loan of activeInterestLoans) {
    const count = await InterestEMI.countDocuments({ interestLoanId: loan._id });
    if (count === 0) {
      results.push({ type: "Interest", loanNumber: loan.loanNumber, customerName: loan.customerName });
    }
  }

  return results;
};

const runDataHealthCheck = async () => {
  const [stuckLoans, emiCounterDrift, corruptedOverdue, missingSchedule] = await Promise.all([
    findStuckLoans(),
    findEmiCounterDrift(),
    findCorruptedOverdue(),
    findLoansMissingSchedule(),
  ]);

  return {
    stuckLoans,
    emiCounterDrift,
    corruptedOverdue,
    missingSchedule,
    totalIssues: stuckLoans.length + emiCounterDrift.length + corruptedOverdue.length + missingSchedule.length,
  };
};

module.exports = { runDataHealthCheck };
