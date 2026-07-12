const Expense = require("../models/Expense");
const Loan = require("../models/Loan");
const DailyLoan = require("../models/DailyLoan");
const WeeklyLoan = require("../models/WeeklyLoan");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const createExpense = asyncHandler(async (req, res, next) => {
  const {
    loanNumber,
    vehicleNumber,
    particulars,
    date,
    amount,
    isOfficeExpense,
  } = req.body;

  if (!particulars || !amount || (!isOfficeExpense && !loanNumber)) {
    return next(
      new ErrorHandler(
        "Please provide particulars, amount and either loan number or mark as office expense",
        400,
      ),
    );
  }

  // Find loanId from any of the three models
  let loan = null;
  if (!isOfficeExpense && loanNumber) {
    // Try Monthly Loan first
    loan = await Loan.findOne({ loanNumber });
    if (!loan) {
      // Try Daily Loan
      loan = await DailyLoan.findOne({ loanNumber });
    }
    if (!loan) {
      // Try Weekly Loan
      loan = await WeeklyLoan.findOne({ loanNumber });
    }
  }

  const expense = await Expense.create({
    loanId: loan ? loan._id : null,
    loanNumber: isOfficeExpense ? "OFFICE" : loanNumber,
    vehicleNumber: isOfficeExpense
      ? "-"
      : vehicleNumber || (loan ? loan.vehicleNumber : null),
    particulars,
    date: date || Date.now(),
    amount,
    isOfficeExpense: isOfficeExpense || false,
    createdBy: req.user._id,
  });

  sendResponse(
    res,
    201,
    "success",
    "Expense recorded successfully",
    null,
    expense,
  );
});

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
const getAllExpenses = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const skip = (page - 1) * limit;

  const match = {};

  if (startDate || endDate) {
    match.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      match.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match.date.$lte = end;
    }
  }

  const [expenses, total, summaryTotal] = await Promise.all([
    Expense.find(match)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Expense.countDocuments(match),
    Expense.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);

  sendResponse(res, 200, "success", "Expenses fetched successfully", null, {
    expenses,
    summary: {
      totalAmount: summaryTotal[0]?.total || 0
    },
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// @desc    Search loan/vehicle info
// @route   GET /api/expenses/search
// @access  Private
const searchLoanInfo = asyncHandler(async (req, res, next) => {
  const { q } = req.query; // query string

  if (!q) {
    return next(new ErrorHandler("Search query is required", 400));
  }

  const [monthlyLoan, dailyLoan, weeklyLoan] = await Promise.all([
    Loan.findOne({
      $or: [
        { loanNumber: { $regex: q, $options: "i" } },
        { vehicleNumber: { $regex: q, $options: "i" } },
      ],
    }).select("loanNumber vehicleNumber customerName"),
    DailyLoan.findOne({ loanNumber: { $regex: q, $options: "i" } }).select(
      "loanNumber customerName",
    ),
    WeeklyLoan.findOne({ loanNumber: { $regex: q, $options: "i" } }).select(
      "loanNumber customerName",
    ),
  ]);

  const loan = monthlyLoan || dailyLoan || weeklyLoan;

  if (!loan) {
    return next(new ErrorHandler("No matching loan or vehicle found", 404));
  }

  sendResponse(res, 200, "success", "Loan info found", null, {
    loanNumber: loan.loanNumber,
    vehicleNumber: loan.vehicleNumber || "",
    customerName: loan.customerName,
  });
});

// @desc    Get total expenses for a loan
// @route   GET /api/expenses/loan/:loanId
// @access  Private
const getLoanExpensesTotal = asyncHandler(async (req, res, next) => {
  const { loanId } = req.params;

  const expenses = await Expense.find({ loanId });
  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  sendResponse(res, 200, "success", "Total expenses fetched", null, {
    total,
    count: expenses.length,
  });
});

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private (Admin only)
const updateExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { loanNumber, vehicleNumber, particulars, date, amount, isOfficeExpense } = req.body;

  const expense = await Expense.findById(id);
  if (!expense) return next(new ErrorHandler("Expense not found", 404));

  // If loan number changed, re-resolve the loanId
  if (loanNumber && loanNumber !== expense.loanNumber) {
    let loan = await Loan.findOne({ loanNumber });
    if (!loan) loan = await DailyLoan.findOne({ loanNumber });
    if (!loan) loan = await WeeklyLoan.findOne({ loanNumber });
    expense.loanId = loan ? loan._id : null;
    expense.loanNumber = isOfficeExpense ? "OFFICE" : loanNumber;
    expense.vehicleNumber = isOfficeExpense ? "-" : vehicleNumber || (loan ? loan.vehicleNumber : expense.vehicleNumber);
  }

  if (particulars !== undefined) expense.particulars = particulars;
  if (date !== undefined) expense.date = date;
  if (amount !== undefined) expense.amount = amount;
  if (isOfficeExpense !== undefined) expense.isOfficeExpense = isOfficeExpense;
  expense.updatedBy = req.user._id;

  await expense.save();

  sendResponse(res, 200, "success", "Expense updated successfully", null, expense);
});

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin only)
const deleteExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const expense = await Expense.findById(id);
  if (!expense) return next(new ErrorHandler("Expense not found", 404));

  await expense.deleteOne();
  sendResponse(res, 200, "success", "Expense deleted successfully", null, null);
});

module.exports = {
  createExpense,
  getAllExpenses,
  searchLoanInfo,
  getLoanExpensesTotal,
  updateExpense,
  deleteExpense,
};
