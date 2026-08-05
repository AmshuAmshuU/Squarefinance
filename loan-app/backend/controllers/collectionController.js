const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { parseDateInLocalFormat, normalizeToMidnight } = require('../utils/dateUtils');
const { getAllCollectionEvents } = require("../utils/collectionEvents");

// Rebuilt 2026-08-06 to read directly from EMI/Loan documents (via
// utils/collectionEvents.js) instead of the separate Payment collection -
// see collectionEvents.js for why. Response shape is unchanged.
const getCollectionReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  const events = await getAllCollectionEvents({ startDate, endDate });

  const groups = {};
  for (const e of events) {
    const dateKey = new Date(e.date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const key = `${dateKey}|${e.updatedBy}|${(e.paymentMode || "").toUpperCase()}|${e.paymentType}`;
    if (!groups[key]) {
      groups[key] = {
        _id: { date: dateKey, collector: e.updatedBy, mode: e.paymentMode, type: e.paymentType },
        totalAmount: 0,
        count: 0,
      };
    }
    groups[key].totalAmount += e.totalAmount;
    groups[key].count += 1;
  }

  const collections = Object.values(groups).sort((a, b) => {
    if (a._id.date !== b._id.date) return a._id.date < b._id.date ? 1 : -1;
    return a._id.collector.localeCompare(b._id.collector);
  });

  sendResponse(
    res,
    200,
    "success",
    "Collection report fetched successfully",
    null,
    collections,
  );
});

// Rebuilt 2026-08-06 - see getCollectionReport above / collectionEvents.js
// for why. Response shape (transactions/totalCollectedAmount/summary/
// pagination, and every field on each transaction) is unchanged so the
// frontend Collections page needs no changes.
const getCollectionTransactions = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, page = 1, limit = 25 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // getAllCollectionEvents never produces Processing Fee events, matching
  // the previous explicit exclusion.
  const events = await getAllCollectionEvents({ startDate, endDate });

  const total = events.length;
  const grandTotalAmount = events.reduce((acc, e) => acc + (e.totalAmount || 0), 0);

  const pageEvents = events.slice(skip, skip + limitNum);

  const formattedTransactions = pageEvents.map((e) => ({
    loanId: e.loanId,
    loanModel: e.loanModel,
    loanNumber: e.loanNumber || "Unknown",
    emiNo: e.emiNo || "-",
    customerName: e.customerName || "Unknown",
    emiAmount: e.emiAmount || 0,
    overdueAmount: e.overdueAmount || 0,
    totalAmount: e.totalAmount || 0,
    amount: e.totalAmount || 0,
    paymentMode: e.paymentMode,
    paymentType: e.paymentType,
    date: e.date,
    updatedBy: e.updatedBy || "System",
  }));

  sendResponse(
    res,
    200,
    "success",
    "Collection transactions fetched successfully",
    null,
    {
      transactions: formattedTransactions,
      totalCollectedAmount: formattedTransactions.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0),
      summary: {
        totalAmount: grandTotalAmount
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  );
});

const getLoansGivenSummary = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, page = 1, limit = 25 } = req.query;
  const matchDate = {};

  if (startDate || endDate) {
    if (startDate) {
      // Parse date as IST midnight (UTC-5:30 offset = subtract 5.5 hours from midnight IST to get UTC)
      const start = new Date(startDate + "T00:00:00+05:30");
      matchDate.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate + "T23:59:59+05:30");
      matchDate.$lte = end;
    }
  }

  const query = {};
  if (Object.keys(matchDate).length > 0) {
    query.dateLoanDisbursed = matchDate;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Monthly Loans - fallback to createdAt if dateLoanDisbursed missing
  const monthlyPipeline = [
    {
      $match:
        Object.keys(matchDate).length > 0
          ? {
              $or: [
                { dateLoanDisbursed: matchDate },
                {
                  $and: [
                    { dateLoanDisbursed: { $exists: false } },
                    { createdAt: matchDate },
                  ],
                },
              ],
            }
          : {},
    },
    {
      $project: {
        _id: 1,
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        amount: "$principalAmount",
        date: { $ifNull: ["$dateLoanDisbursed", "$createdAt"] },
        createdAt: 1,
        createdBy: 1,
        type: { $literal: "Monthly" },
      },
    },
  ];

  // Weekly Loans - Fallback to startDate if dateLoanDisbursed is missing
  const weeklyPipeline = [
    {
      $match:
        Object.keys(matchDate).length > 0
          ? {
              $or: [
                { dateLoanDisbursed: matchDate },
                {
                  $and: [
                    { dateLoanDisbursed: { $exists: false } },
                    { startDate: matchDate },
                  ],
                },
              ],
            }
          : {},
    },
    {
      $project: {
        _id: 1,
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        amount: "$disbursementAmount",
        date: {
          $ifNull: [
            "$dateLoanDisbursed",
            { $ifNull: ["$startDate", "$createdAt"] },
          ],
        },
        createdAt: 1,
        createdBy: 1,
        type: { $literal: "Weekly" },
      },
    },
  ];

  // Daily Loans - Fallback to startDate if dateLoanDisbursed is missing
  const dailyPipeline = [
    {
      $match:
        Object.keys(matchDate).length > 0
          ? {
              $or: [
                { dateLoanDisbursed: matchDate },
                {
                  $and: [
                    { dateLoanDisbursed: { $exists: false } },
                    { startDate: matchDate },
                  ],
                },
              ],
            }
          : {},
    },
    {
      $project: {
        _id: 1,
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        amount: "$disbursementAmount",
        date: {
          $ifNull: [
            "$dateLoanDisbursed",
            { $ifNull: ["$startDate", "$createdAt"] },
          ],
        },
        createdAt: 1,
        createdBy: 1,
        type: { $literal: "Daily" },
      },
    },
  ];

  // Interest Loans pipeline
  const interestLoanPipeline = [
    {
      $match:
        Object.keys(matchDate).length > 0
          ? {
              $or: [
                { dateLoanDisbursed: matchDate },
                {
                  $and: [
                    { dateLoanDisbursed: { $exists: false } },
                    { createdAt: matchDate },
                  ],
                },
              ],
            }
          : {},
    },
    {
      $project: {
        _id: 1,
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        amount: "$initialPrincipalAmount",
        date: { $ifNull: ["$dateLoanDisbursed", "$createdAt"] },
        createdAt: 1,
        createdBy: 1,
        type: { $literal: "Interest" },
      },
    },
  ];

  const InterestLoan = require("../models/InterestLoan");

  const [monthlyRes, weeklyRes, dailyRes, interestRes] = await Promise.all([
    Loan.aggregate(monthlyPipeline),
    WeeklyLoan.aggregate(weeklyPipeline),
    DailyLoan.aggregate(dailyPipeline),
    InterestLoan.aggregate(interestLoanPipeline),
  ]);

  const allLoansRaw = [...monthlyRes, ...weeklyRes, ...dailyRes, ...interestRes].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const total = allLoansRaw.length;
  const paginatedLoans = allLoansRaw.slice(skip, skip + limitNum);

  // Populate createdBy
  const User = mongoose.model("User");
  const loanResults = await Promise.all(
    paginatedLoans.map(async (loan) => {
      const creator = await User.findById(loan.createdBy).select("name").lean();
      return {
        _id: loan._id,
        loanNumber: loan.loanNumber,
        customerName: loan.customerName,
        mobileNumber:
          loan.mobileNumbers && loan.mobileNumbers.length > 0
            ? loan.mobileNumbers[0]
            : "N/A",
        loanAmount: loan.amount,
        type: loan.type,
        date: loan.date || loan.createdAt,
        createdBy: creator ? creator.name : "System",
      };
    }),
  );

  sendResponse(res, 200, "success", "Loans given fetched successfully", null, {
    loans: loanResults,
    summary: {
      totalAmount: allLoansRaw.reduce((sum, l) => sum + (l.amount || 0), 0)
    },
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

module.exports = {
  getCollectionReport,
  getCollectionTransactions,
  getLoansGivenSummary,
};
