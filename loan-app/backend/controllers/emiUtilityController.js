const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const calculateEMI = (principal, roi, tenureMonths) => {
  const p = parseFloat(principal);
  const r = parseFloat(roi);
  const n = parseInt(tenureMonths);
  if (!p || !n) return 0;

  const monthlyInterest = p * (r / 100);
  const monthlyPrincipal = p / n;
  const emi = monthlyPrincipal + monthlyInterest;

  return parseFloat(emi.toFixed(2));
};

// Generate EMIs for existing loans that don't have EMIs yet
const generateEMIsForExistingLoans = asyncHandler(async (req, res, next) => {
  try {
    const loans = await Loan.find();
    let generatedCount = 0;
    let skippedCount = 0;

    for (const loan of loans) {
      // Check if EMIs already exist for this loan
      const existingEMIs = await EMI.find({ loanId: loan._id });

      if (existingEMIs.length > 0) {
        skippedCount++;
        continue; // Skip if EMIs already exist
      }

      // Generate EMIs for this loan
      const emis = [];
      let currentEmiDate = new Date(
        loan.emiStartDate || loan.loanStartDate || new Date(),
      );
      const tenureMonths = loan.tenureMonths || 12;
      const monthlyEMI =
        loan.monthlyEMI ||
        calculateEMI(
          loan.principalAmount,
          loan.annualInterestRate,
          tenureMonths,
        );

      for (let i = 1; i <= tenureMonths; i++) {
        emis.push({
          loanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          emiNumber: i,
          dueDate: new Date(currentEmiDate),
          emiAmount: monthlyEMI,
          status: "Pending",
        });
        currentEmiDate.setMonth(currentEmiDate.getMonth() + 1);
      }

      await EMI.insertMany(emis);
      generatedCount++;
    }

    sendResponse(
      res,
      200,
      "success",
      `EMIs generated for ${generatedCount} loans. Skipped ${skippedCount} loans (already have EMIs).`,
      null,
      { generatedCount, skippedCount, totalLoans: loans.length },
    );
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

module.exports = {
  generateEMIsForExistingLoans,
};
