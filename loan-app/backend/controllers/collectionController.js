const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const Payment = require("../models/Payment");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { parseDateInLocalFormat, normalizeToMidnight } = require('../utils/dateUtils');

const getCollectionReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, collectedBy } = req.query;
  const match = {
    paymentDate: {},
  };

  if (startDate) match.paymentDate.$gte = new Date(startDate + "T00:00:00+05:30");
  if (endDate) match.paymentDate.$lte = new Date(endDate + "T23:59:59+05:30");
  if (Object.keys(match.paymentDate).length === 0) delete match.paymentDate;
  if (collectedBy) match.collectedBy = new mongoose.Types.ObjectId(collectedBy);

  const collections = await mongoose.model("Payment").aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "emis",
        localField: "emiId",
        foreignField: "_id",
        as: "standardEmiInfo"
      }
    },
    {
      $lookup: {
        from: "interestemis",
        localField: "emiId",
        foreignField: "_id",
        as: "interestEmiInfo"
      }
    },
    {
      $addFields: {
        emiDetails: { 
          $ifNull: [
            { $arrayElemAt: ["$standardEmiInfo", 0] },
            { $arrayElemAt: ["$interestEmiInfo", 0] }
          ] 
        }
      }
    },
    {
      $match: {
        $or: [
          { "paymentType": "Foreclosure" },
          { "paymentType": "Processing Fee" },
          { "paymentType": "Interest" },
          { "emiId": { $exists: false } },
          { "emiId": null },
          {
            $expr: {
              $let: {
                vars: {
                  isOverdue: { $eq: ["$paymentType", "Overdue"] },
                  paymentDateStr: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate", timezone: "+05:30" } },
                  paymentAmount: { $toDouble: { $ifNull: ["$totalAmount", "$amount"] } }
                },
                in: {
                  $or: [
                    { $eq: ["$emiDetails", null] },
                    {
                      $and: [
                        "$$isOverdue",
                        {
                          $anyElementTrue: {
                            $map: {
                              input: { $ifNull: ["$emiDetails.overdue", []] },
                              as: "ov",
                              in: { 
                                $and: [
                                  { $eq: [{ $dateToString: { format: "%Y-%m-%d", date: "$$ov.date", timezone: "+05:30" } }, "$$paymentDateStr"] },
                                  { $eq: [{ $toDouble: "$$ov.amount" }, "$$paymentAmount"] }
                                  // Mode is intentionally NOT part of this match: a mode-only
                                  // correction (e.g. Online -> Cash) leaves the Payment record's
                                  // mode stale, but the date+amount still correctly identify the
                                  // same transaction, so it must still show in Collections.
                                ]
                              }
                            }
                          }
                        }
                      ]
                    },
                    {
                      $and: [
                        { $not: "$$isOverdue" },
                        {
                          $anyElementTrue: {
                            $map: {
                              input: { $ifNull: ["$emiDetails.paymentHistory", []] },
                              as: "ph",
                              in: { 
                                $and: [
                                  { $eq: [{ $dateToString: { format: "%Y-%m-%d", date: "$$ph.date", timezone: "+05:30" } }, "$$paymentDateStr"] },
                                  { $eq: [{ $toDouble: "$$ph.amount" }, "$$paymentAmount"] }
                                  // Mode intentionally not matched here either — see the
                                  // overdue branch above for why.
                                ]
                              }
                            }
                          }
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    },
    {
      $group: {
        _id: {
          loanId: "$loanId",
          emiId: { $ifNull: ["$emiId", "$_id"] },
          paymentDate: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate", timezone: "+05:30" } },
          paymentType: "$paymentType",
          amount: { $ifNull: ["$totalAmount", "$amount"] },
          mode: { $toUpper: "$mode" }
        },
        amount: { $first: { $ifNull: ["$totalAmount", "$amount"] } },
        collectedBy: { $first: "$collectedBy" },
        mode: { $first: "$mode" },
        paymentDate: { $first: "$paymentDate" },
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "collectedBy",
        foreignField: "_id",
        as: "collector",
      },
    },
    { $unwind: { path: "$collector", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$_id.paymentDate", timezone: "+05:30" } },
          collector: { $ifNull: ["$collector.name", "System"] },
          mode: "$mode",
          type: "$_id.paymentType",
        },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": -1, "_id.collector": 1 } },
  ]);

  sendResponse(
    res,
    200,
    "success",
    "Collection report fetched successfully",
    null,
    collections,
  );
});

const getCollectionTransactions = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, page = 1, limit = 25 } = req.query;
  const match = {};

  if (startDate || endDate) {
    match.paymentDate = {};
    if (startDate) {
      match.paymentDate.$gte = normalizeToMidnight(parseDateInLocalFormat(startDate));
    }
    if (endDate) {
      const end = normalizeToMidnight(parseDateInLocalFormat(endDate));
      end.setHours(23, 59, 59, 999);
      match.paymentDate.$lte = end;
    }
  }

  // Exclude Processing Fees from Collections tab (case-insensitive)
  match.paymentType = { $not: /processing fee/i };

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // 1. Group transactions to handle reversals/edits (same loan, same emi, same day)
  const aggregation = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "emis",
        localField: "emiId",
        foreignField: "_id",
        as: "standardEmiInfo"
      }
    },
    {
      $lookup: {
        from: "interestemis",
        localField: "emiId",
        foreignField: "_id",
        as: "interestEmiInfo"
      }
    },
    {
      $addFields: {
        emiDetails: { 
          $ifNull: [
            { $arrayElemAt: ["$standardEmiInfo", 0] },
            { $arrayElemAt: ["$interestEmiInfo", 0] }
          ] 
        }
      }
    },
    {
      $match: {
        $or: [
          { "paymentType": "Foreclosure" },
          { "paymentType": "Processing Fee" },
          { "paymentType": "Interest" },
          { "emiId": { $exists: false } },
          { "emiId": null },
          {
            $expr: {
              $let: {
                vars: {
                  isOverdue: { $eq: ["$paymentType", "Overdue"] },
                  paymentDateStr: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate", timezone: "+05:30" } },
                  paymentAmount: { $toDouble: { $ifNull: ["$totalAmount", "$amount"] } }
                },
                in: {
                  $or: [
                    { $eq: ["$emiDetails", null] },
                    {
                      $and: [
                        "$$isOverdue",
                        {
                          $anyElementTrue: {
                            $map: {
                              input: { $ifNull: ["$emiDetails.overdue", []] },
                              as: "ov",
                              in: { 
                                $and: [
                                  { $eq: [{ $dateToString: { format: "%Y-%m-%d", date: "$$ov.date", timezone: "+05:30" } }, "$$paymentDateStr"] },
                                  { $eq: [{ $toDouble: "$$ov.amount" }, "$$paymentAmount"] }
                                  // Mode is intentionally NOT part of this match: a mode-only
                                  // correction (e.g. Online -> Cash) leaves the Payment record's
                                  // mode stale, but the date+amount still correctly identify the
                                  // same transaction, so it must still show in Collections.
                                ]
                              }
                            }
                          }
                        }
                      ]
                    },
                    {
                      $and: [
                        { $not: "$$isOverdue" },
                        {
                          $anyElementTrue: {
                            $map: {
                              input: { $ifNull: ["$emiDetails.paymentHistory", []] },
                              as: "ph",
                              in: { 
                                $and: [
                                  { $eq: [{ $dateToString: { format: "%Y-%m-%d", date: "$$ph.date", timezone: "+05:30" } }, "$$paymentDateStr"] },
                                  { $eq: [{ $toDouble: "$$ph.amount" }, "$$paymentAmount"] }
                                  // Mode intentionally not matched here either — see the
                                  // overdue branch above for why.
                                ]
                              }
                            }
                          }
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    },
    {
      $group: {
        _id: {
          loanId: "$loanId",
          emiId: { $ifNull: ["$emiId", "$_id"] },
          paymentDate: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate", timezone: "+05:30" } },
          paymentType: "$paymentType",
          amount: { $ifNull: ["$totalAmount", "$amount"] },
          mode: { $toUpper: "$mode" }
        },
        emiAmount: { $first: "$emiAmount" },
        overdueAmount: { $first: "$overdueAmount" },
        totalAmountSum: { 
          $first: { 
            $cond: [
              { $gt: [{ $ifNull: ["$totalAmount", 0] }, 0] },
              "$totalAmount",
              { 
                $cond: [
                  { $gt: [{ $ifNull: ["$amount", 0] }, 0] },
                  "$amount",
                  { $ifNull: ["$overdueAmount", 0] }
                ]
              }
            ]
          } 
        },
        mode: { $first: "$mode" },
        paymentDate: { $first: "$paymentDate" },
        loanModel: { $first: "$loanModel" },
        collectedBy: { $first: "$collectedBy" },
        createdAt: { $first: "$createdAt" },
        emiDetails: { $first: "$emiDetails" }
      }
    },
    { $sort: { "_id.paymentDate": -1, createdAt: -1 } }
  ];

  // Get total count and grand total amount
  const summaryAgg = await Payment.aggregate([
    ...aggregation,
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        grandTotalAmount: { $sum: "$totalAmountSum" }
      }
    }
  ]);

  const total = summaryAgg[0]?.totalCount || 0;
  const grandTotalAmount = summaryAgg[0]?.grandTotalAmount || 0;

  // Get paginated results
  const transactions = await Payment.aggregate([
    ...aggregation,
    { $skip: skip },
    { $limit: limitNum },
    {
      $lookup: {
        from: "users",
        localField: "collectedBy",
        foreignField: "_id",
        as: "collectorInfo"
      }
    },
    {
      $lookup: {
        from: "loans",
        localField: "_id.loanId",
        foreignField: "_id",
        as: "monthlyLoanInfo"
      }
    },
    {
      $lookup: {
        from: "weeklyloans",
        localField: "_id.loanId",
        foreignField: "_id",
        as: "weeklyLoanInfo"
      }
    },
    {
      $lookup: {
        from: "dailyloans",
        localField: "_id.loanId",
        foreignField: "_id",
        as: "dailyLoanInfo"
      }
    },
    {
      $addFields: {
        collector: { $arrayElemAt: ["$collectorInfo", 0] },
        loanFallback: {
          $ifNull: [
            { $arrayElemAt: ["$monthlyLoanInfo", 0] },
            { 
              $ifNull: [
                { $arrayElemAt: ["$weeklyLoanInfo", 0] },
                { $arrayElemAt: ["$dailyLoanInfo", 0] }
              ]
            }
          ]
        }
      }
    }
  ]);

  // Format the output
  const formattedTransactions = transactions.map((txn) => {
    const totalAmt = txn.totalAmountSum || 0;
    const emiAmt = txn.emiAmount || (txn._id.paymentType === "Interest" ? totalAmt : 0);
    
    return {
      _id: txn._id,
      loanId: txn._id.loanId,
      loanModel: txn.loanModel,
      loanNumber: txn.emiDetails?.loanNumber || txn.loanFallback?.loanNumber || "Unknown",
      emiNo: txn.emiDetails?.emiNumber || (txn.emiDetails?.emiNo || "-"),
      customerName: txn.emiDetails?.customerName || txn.loanFallback?.customerName || "Unknown",
      emiAmount: emiAmt,
      overdueAmount: txn.overdueAmount || 0,
      totalAmount: totalAmt,
      amount: totalAmt,
      paymentMode: txn.mode,
      paymentType: txn.paymentType || txn._id.paymentType,
      date: txn._id.paymentDate,
      updatedBy: txn.collector ? txn.collector.name : "System",
    };
  });

  sendResponse(
    res,
    200,
    "success",
    "Collection transactions fetched successfully",
    null,
    {
      transactions: formattedTransactions,
      totalCollectedAmount: transactions.reduce((acc, curr) => acc + (curr.totalAmountSum || 0), 0),
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
