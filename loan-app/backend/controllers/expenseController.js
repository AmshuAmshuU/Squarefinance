const Expense = require("../models/Expense");
const Loan = require("../models/Loan");
const DailyLoan = require("../models/DailyLoan");
const WeeklyLoan = require("../models/WeeklyLoan");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { normalizeToMidnight, normalizeToEndOfDay } = require("../utils/dateUtils");
const mongoose = require("mongoose");
const Approval = require("../models/Approval");
const User = require("../models/User");
const {
  findLoanByNumber,
  createExpenseRecord,
  updateExpenseRecord,
  changesForAdd,
  changesForDelete,
  changesForEdit,
} = require("../utils/expenseActions");

// Only Super Admin saves expense changes directly; everyone else's add /
// edit / delete becomes a pending approval request (Karthik, 2026-09-28).
// Only Super Admins are notified, since only they can process approvals.
const queueExpenseApproval = async (req, { requestType, targetId, loanNumber, customerName, requestedData, headline }) => {
  const { sendNotification, notifyApprovalCountChange } = require("./notificationController");

  await Approval.create({
    requestType,
    targetId,
    targetModel: "Expense",
    loanNumber,
    customerName,
    requestedData,
    requestedBy: req.user._id,
  });

  const superAdmins = await User.find({ role: "SUPER_ADMIN", _id: { $ne: req.user._id } });
  for (const admin of superAdmins) {
    await sendNotification({
      recipientId: admin._id,
      senderId: req.user._id,
      type: "PAYMENT_REQUEST",
      title: `New ${headline} Approval Request`,
      message: `Employee ${req.user.name} requested approval: ${requestedData.summary}`,
      data: { loanNumber, customerName, employeeName: req.user.name },
    });
  }
  await notifyApprovalCountChange();
};

const assertNoPendingExpenseRequest = async (expenseId, next) => {
  const pending = await Approval.findOne({
    targetId: expenseId,
    targetModel: "Expense",
    status: "Pending",
  });
  if (pending) {
    next(new ErrorHandler("This expense already has a change waiting for approval", 400));
    return true;
  }
  return false;
};

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

  const fields = { loanNumber, vehicleNumber, particulars, date, amount, isOfficeExpense };

  if (req.user.role !== "SUPER_ADMIN") {
    const loan = !isOfficeExpense ? await findLoanByNumber(loanNumber) : null;
    await queueExpenseApproval(req, {
      requestType: "EXPENSE_ADD",
      targetId: new mongoose.Types.ObjectId(),
      loanNumber: isOfficeExpense ? "OFFICE" : loanNumber,
      customerName: loan?.customerName || (isOfficeExpense ? "Office expense" : "-"),
      requestedData: {
        fields,
        changes: changesForAdd(fields),
        summary: `add expense of ₹${Number(amount).toLocaleString("en-IN")} (${particulars}) for ${isOfficeExpense ? "the office" : `loan ${loanNumber}`}.`,
      },
      headline: "Expense",
    });
    return sendResponse(res, 200, "success", "Expense sent for approval", null, { pendingApproval: true });
  }

  const expense = await createExpenseRecord(fields, req.user._id);

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
      match.date.$gte = normalizeToMidnight(new Date(startDate));
    }
    if (endDate) {
      match.date.$lte = normalizeToEndOfDay(new Date(endDate));
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

  const fields = { loanNumber, vehicleNumber, particulars, date, amount, isOfficeExpense };

  if (req.user.role !== "SUPER_ADMIN") {
    if (await assertNoPendingExpenseRequest(expense._id, next)) return;
    const changes = changesForEdit(expense, fields);
    if (changes.length === 0) {
      return next(new ErrorHandler("No changes to submit", 400));
    }
    await queueExpenseApproval(req, {
      requestType: "EXPENSE_EDIT",
      targetId: expense._id,
      loanNumber: expense.loanNumber,
      customerName: expense.isOfficeExpense ? "Office expense" : expense.vehicleNumber || "-",
      requestedData: {
        fields,
        changes,
        summary: `edit expense "${expense.particulars}" (${changes.map((c) => c.label).join(", ")}).`,
      },
      headline: "Expense Edit",
    });
    return sendResponse(res, 200, "success", "Expense change sent for approval", null, { pendingApproval: true });
  }

  await updateExpenseRecord(expense, fields);

  sendResponse(res, 200, "success", "Expense updated successfully", null, expense);
});

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin only)
const deleteExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const expense = await Expense.findById(id);
  if (!expense) return next(new ErrorHandler("Expense not found", 404));

  if (req.user.role !== "SUPER_ADMIN") {
    if (await assertNoPendingExpenseRequest(expense._id, next)) return;
    await queueExpenseApproval(req, {
      requestType: "EXPENSE_DELETE",
      targetId: expense._id,
      loanNumber: expense.loanNumber,
      customerName: expense.isOfficeExpense ? "Office expense" : expense.vehicleNumber || "-",
      requestedData: {
        changes: changesForDelete(expense),
        summary: `delete expense "${expense.particulars}" of ₹${Number(expense.amount).toLocaleString("en-IN")}.`,
      },
      headline: "Expense Delete",
    });
    return sendResponse(res, 200, "success", "Expense deletion sent for approval", null, { pendingApproval: true });
  }

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
