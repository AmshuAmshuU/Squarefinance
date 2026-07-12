const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const DailyLoan = require("../models/DailyLoan");
const WeeklyLoan = require("../models/WeeklyLoan");
const EMI = require("../models/EMI");
const Expense = require("../models/Expense");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const InterestLoan = require("../models/InterestLoan");
const InterestEMI = require("../models/InterestEMI");
const Payment = require("../models/Payment");

const getAnalyticsStats = asyncHandler(async (req, res, next) => {
  const startTotal = performance.now();

  const [
    loanMetrics,
    dailyMetrics,
    weeklyMetrics,
    interestMetrics,
    expenseStats,
    userStats,
    pendingMetrics,
    partialMetrics,
    totalLoanCounts,
    monthlyEmiExpected,
  ] = await Promise.all([
    // 1. Monthly Loan Metrics
    Loan.aggregate([
      {
        $facet: {
          disbursement: [{ $group: { _id: null, total: { $sum: "$principalAmount" } } }],
          foreclosure: [{ $group: { _id: null, total: { $sum: { $ifNull: ["$foreclosureAmount", 0] } } } }],
          processingFees: [{ $group: { _id: null, total: { $sum: { $ifNull: ["$processingFee", 0] } } } }],
          sold: [{ $group: { _id: null, total: { $sum: { $ifNull: ["$soldDetails.totalAmount", "$soldDetails.sellAmount", 0] } } } }],
          active: [{ $match: { status: { $ne: "Closed" }, seizedStatus: { $ne: "Sold" } } }, { $count: "count" }],
          closed: [{ $match: { status: "Closed" } }, { $count: "count" }],
          vehicleStatus: [{ $match: { isSeized: true } }, { $group: { _id: { $switch: { branches: [{ case: { $eq: ["$seizedStatus", "Seized"] }, then: "Seized" }, { case: { $eq: ["$seizedStatus", "Sold"] }, then: "Sold" }], default: "For Seizing" } }, count: { $sum: 1 } } }],
        }
      }
    ]),

    // 2. Daily Loan Metrics
    DailyLoan.aggregate([
      {
        $facet: {
          disbursement: [{ $group: { _id: null, total: { $sum: "$disbursementAmount" } } }],
          active: [{ $match: { status: { $ne: "Closed" } } }, { $count: "count" }],
          closed: [{ $match: { status: "Closed" } }, { $count: "count" }],
        }
      }
    ]),

    // 3. Weekly Loan Metrics
    WeeklyLoan.aggregate([
      {
        $facet: {
          disbursement: [{ $group: { _id: null, total: { $sum: "$disbursementAmount" } } }],
          active: [{ $match: { status: { $ne: "Closed" } } }, { $count: "count" }],
          closed: [{ $match: { status: "Closed" } }, { $count: "count" }],
        }
      }
    ]),

    // 4. Interest Loan Metrics
    InterestLoan.aggregate([
      {
        $facet: {
          disbursement: [{ $group: { _id: null, total: { $sum: "$initialPrincipalAmount" }, processingFees: { $sum: "$processingFee" } } }],
          principalCollected: [{ $group: { _id: null, total: { $sum: { $sum: { $ifNull: ["$principalPayments.amount", []] } } } } }],
          active: [{ $match: { status: { $ne: "Closed" } } }, { $count: "count" }],
          closed: [{ $match: { status: "Closed" } }, { $count: "count" }],
        }
      }
    ]),

    // 5. EMI Collections (Monthly + Interest) & Expenses
    Promise.all([
      EMI.aggregate([
        { $match: { loanModel: "Loan" } },
        { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ["$amountPaid", 0] }, { $ifNull: [{ $sum: { $ifNull: ["$overdue.amount", []] } }, 0] }] } } } }
      ]),
      InterestEMI.aggregate([
        { $group: { _id: null, total: { $sum: { $add: [{ $ifNull: ["$amountPaid", 0] }, { $ifNull: [{ $sum: { $ifNull: ["$overdue.amount", []] } }, 0] }] } } } }
      ]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]),

    // 6. User Roles
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),

    // 7. Pending Collections (Monthly + Daily + Weekly + Interest)
    EMI.aggregate([{ $match: { status: "Pending" } }, { $group: { _id: "$loanId" } }, { $count: "count" }]),
    
    // 8. Partial Counts
    EMI.aggregate([{ $match: { status: "Partially Paid", loanModel: "Loan" } }, { $group: { _id: "$loanId" } }, { $count: "count" }]),

    // 9. Total loans given (all types, all statuses)
    Promise.all([
      Loan.countDocuments({}),
      DailyLoan.countDocuments({}),
      WeeklyLoan.countDocuments({}),
      InterestLoan.countDocuments({}),
    ]),

    // 10. Monthly EMI expected from active loans (all 4 types)
    Promise.all([
      // Vehicle loans: sum of monthlyEMI for active loans
      Loan.aggregate([
        { $match: { status: { $ne: "Closed" } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$monthlyEMI", 0] } } } }
      ]),
      // Weekly loans: sum of emiAmount for active loans
      WeeklyLoan.aggregate([
        { $match: { status: { $ne: "Closed" } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$emiAmount", 0] } } } }
      ]),
      // Daily loans: sum of emiAmount * 30 for active loans (monthly equivalent)
      DailyLoan.aggregate([
        { $match: { status: { $ne: "Closed" } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$emiAmount", 0] } } } }
      ]),
      // Interest loans: sum of (remainingPrincipal * interestRate / 100) for active loans
      InterestLoan.aggregate([
        { $match: { status: { $ne: "Closed" } } },
        { $group: { _id: null, total: { $sum: { $multiply: [{ $ifNull: ["$remainingPrincipalAmount", 0] }, { $divide: [{ $ifNull: ["$interestRate", 0] }, 100] }] } } } }
      ]),
    ]),
  ]);

  // Safe extraction helper for facet results
  const getSum = (facetResult, facetName, field = "total") => {
    const data = facetResult && facetResult[0] ? facetResult[0][facetName] : null;
    return data && data[0] ? (data[0][field] || 0) : 0;
  };

  const getCount = (facetResult, facetName) => {
    const data = facetResult && facetResult[0] ? facetResult[0][facetName] : null;
    return data && data[0] ? (data[0].count || 0) : 0;
  };

  // Safe extraction for individual aggregates (not facets)
  const getAggSum = (arr, field = "total") => arr && arr[0] ? (arr[0][field] || 0) : 0;

  // 1. Disbursement Breakdown
  const monthlyDisbursed = Math.round(getSum(loanMetrics, "disbursement"));
  const dailyDisbursed = Math.round(getSum(dailyMetrics, "disbursement"));
  const weeklyDisbursed = Math.round(getSum(weeklyMetrics, "disbursement"));
  const interestDisbursed = Math.round(getSum(interestMetrics, "disbursement"));
  const totalLoanAmount = monthlyDisbursed + dailyDisbursed + weeklyDisbursed + interestDisbursed;

  // 2. Collection Breakdown
  const [emiMonthlyArr, emiInterestArr, expenseResultsArr] = expenseStats || [[], [], []];
  
  const monthlyCollected = Math.round(
    getAggSum(emiMonthlyArr) + 
    getSum(loanMetrics, "foreclosure") + 
    getSum(loanMetrics, "sold") + 
    getSum(loanMetrics, "processingFees")
  );
  // Read daily and weekly collected directly from totalCollected field on each loan document
  const [emiDailyArr, emiWeeklyArr] = await Promise.all([
    DailyLoan.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalCollected", 0] } } } }
    ]),
    WeeklyLoan.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ["$totalCollected", 0] } } } }
    ]),
  ]);
  const dailyCollected = Math.round(getAggSum(emiDailyArr));
  const weeklyCollected = Math.round(getAggSum(emiWeeklyArr));
  const interestCollected = Math.round(
    getAggSum(emiInterestArr) + 
    getSum(interestMetrics, "principalCollected") + 
    getSum(interestMetrics, "disbursement", "processingFees")
  );
  const totalCollectedAmount = monthlyCollected + dailyCollected + weeklyCollected + interestCollected;

  // 3. Global Counts
  const activeLoansCount = 
    getCount(loanMetrics, "active") + 
    getCount(dailyMetrics, "active") + 
    getCount(weeklyMetrics, "active") + 
    getCount(interestMetrics, "active");

  const closedLoansCount = 
    getCount(loanMetrics, "closed") + 
    getCount(dailyMetrics, "closed") + 
    getCount(weeklyMetrics, "closed") + 
    getCount(interestMetrics, "closed");

  const totalExpenses = Math.round(getAggSum(expenseResultsArr));

  // 4. Vehicle & User Stats
  const vehicleData = { "For Seizing": 0, Seized: 0, Sold: 0 };
  if (loanMetrics[0]?.vehicleStatus) {
    loanMetrics[0].vehicleStatus.forEach(s => { 
      if (s._id) vehicleData[s._id] = s.count || 0; 
    });
  }

  const userData = { SUPER_ADMIN: 0, ADMIN: 0, EMPLOYEE: 0 };
  if (userStats) {
    userStats.forEach(s => { 
      if (s._id) userData[s._id] = s.count || 0; 
    });
  }

  // 5. Payment Mode Stats (Granular)
  const [collectionModes] = await Promise.all([
    Payment.aggregate([
      { $group: { _id: { $cond: [{ $eq: ["$mode", "Cash"] }, "cash", "account"] }, total: { $sum: "$totalAmount" } } }
    ])
  ]);

  const [dMonthly, dDaily, dWeekly, dInterest] = await Promise.all([
    Loan.find({}, "disbursement paymentMode principalAmount"),
    DailyLoan.find({}, "disbursement paymentMode disbursementAmount"),
    WeeklyLoan.find({}, "disbursement paymentMode disbursementAmount"),
    InterestLoan.find({}, "disbursement paymentMode initialPrincipalAmount"),
  ]);

  const calcD = (loans, amtField) => {
    let c = 0; let a = 0;
    loans.forEach(l => {
      if (l.disbursement?.length > 0) {
        l.disbursement.forEach(d => {
          if (d.mode === "Cash") c += (d.amount || 0);
          else a += (d.amount || 0);
        });
      } else {
        if (l.paymentMode === "Cash") c += (l[amtField] || 0);
        else a += (l[amtField] || 0);
      }
    });
    return { c, a };
  };

  const mD = calcD(dMonthly, "principalAmount");
  const dD = calcD(dDaily, "disbursementAmount");
  const wD = calcD(dWeekly, "disbursementAmount");
  const iD = calcD(dInterest, "initialPrincipalAmount");

  const collByMode = { cash: 0, account: 0 };
  collectionModes.forEach(m => {
    if (m._id === "account") collByMode.account = Math.round(m.total);
    else collByMode.cash += Math.round(m.total);
  });

  // Total loans given
  const [totalMonthly, totalDaily, totalWeekly, totalInterest] = totalLoanCounts || [0, 0, 0, 0];
  const totalLoansGiven = totalMonthly + totalDaily + totalWeekly + totalInterest;

  // Monthly EMI expected from active loans
  const [emiVehicle, emiWeekly, emiDaily, emiInterest] = monthlyEmiExpected || [[], [], [], []];
  const monthlyEmiVehicle = Math.round(emiVehicle[0]?.total || 0);
  const monthlyEmiWeeklyVal = Math.round((emiWeekly[0]?.total || 0) * 4); // weekly amount × 4 = monthly equivalent
  const monthlyEmiDailyVal = Math.round((emiDaily[0]?.total || 0) * 30); // daily amount * 30 = monthly equivalent
  const monthlyEmiInterestVal = Math.round(emiInterest[0]?.total || 0);
  const totalMonthlyEmiExpected = monthlyEmiVehicle + monthlyEmiWeeklyVal + monthlyEmiDailyVal + monthlyEmiInterestVal;

  const duration = (performance.now() - startTotal).toFixed(2);

  const statsResponse = {
    cards: {
      totalLoanAmount,
      totalCollectedAmount,
      disbursementBreakdown: {
        monthly: monthlyDisbursed,
        daily: dailyDisbursed,
        weekly: weeklyDisbursed,
        interest: interestDisbursed
      },
      collectedBreakdown: {
        monthly: monthlyCollected,
        daily: dailyCollected,
        weekly: weeklyCollected,
        interest: interestCollected
      },
      paymentModeStats: {
        disbursement: {
          cash: Math.round(mD.c + dD.c + wD.c + iD.c),
          account: Math.round(mD.a + dD.a + wD.a + iD.a),
          total: totalLoanAmount 
        },
        collection: {
          cash: Math.max(0, totalCollectedAmount - collByMode.account),
          account: collByMode.account,
          total: totalCollectedAmount 
        }
      },
      pendingLoansCount: pendingMetrics[0]?.count || 0,
      partialLoansCount: partialMetrics[0]?.count || 0,
      activeLoansCount,
      closedLoansCount,
      totalLoansGiven,
      totalLoansBreakdown: {
        monthly: totalMonthly,
        daily: totalDaily,
        weekly: totalWeekly,
        interest: totalInterest,
      },
      totalMonthlyEmiExpected,
      monthlyEmiBreakdown: {
        monthly: monthlyEmiVehicle,
        weekly: monthlyEmiWeeklyVal,
        daily: monthlyEmiDailyVal,
        interest: monthlyEmiInterestVal,
      },
      totalExpenses,
      userCounts: userData,
    },
    vehicleStats: Object.keys(vehicleData).map(key => ({ name: key, value: vehicleData[key] })),
    performance: { totalTime: `${duration}ms` },
  };

  sendResponse(res, 200, "success", "Analytics stats fetched successfully", null, statsResponse);
});

const exportAllData = asyncHandler(async (req, res, next) => {
  const [
    monthlyLoans,
    dailyLoans,
    weeklyLoans,
    interestLoans,
    expenses
  ] = await Promise.all([
    Loan.find().sort({ createdAt: -1 }).lean(),
    DailyLoan.find().sort({ createdAt: -1 }).lean(),
    WeeklyLoan.find().sort({ createdAt: -1 }).lean(),
    InterestLoan.find().sort({ createdAt: -1 }).lean(),
    Expense.find().sort({ date: -1 }).lean(),
  ]);

  sendResponse(res, 200, "success", "Export data fetched successfully", null, {
    monthlyLoans,
    dailyLoans,
    weeklyLoans,
    interestLoans,
    expenses
  });
});

const getTrendStats = asyncHandler(async (req, res, next) => {
  try {
    const { range = "max", interval = "all", startDate: customStart, endDate: customEnd } = req.query;

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date(now);

    let groupFormat = "%Y-%m"; // Default Monthly

    // Handle User's specific Filter Logic
    if (interval === "daily") {
      // "show today only"
      startDate.setHours(0, 0, 0, 0);
      groupFormat = "%Y-%m-%d %H:00"; // Hourly view for today
    } else if (interval === "weekly") {
      // "7 days trends"
      startDate.setDate(now.getDate() - 7);
      groupFormat = "%Y-%m-%d";
    } else if (interval === "monthly") {
      // "past month trend only"
      startDate.setMonth(now.getMonth() - 1);
      groupFormat = "%Y-%m-%d";
    } else if (interval === "yearly") {
      // "same for year also"
      startDate.setFullYear(now.getFullYear() - 1);
      groupFormat = "%Y-%m";
    } else if (interval === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
      // Decide group format based on duration
      const diffDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
      if (diffDays <= 2) groupFormat = "%Y-%m-%d %H:00";
      else if (diffDays <= 60) groupFormat = "%Y-%m-%d";
      else groupFormat = "%Y-%m";
    } else {
      // Default / Max view
      startDate = new Date(0); // All time
      groupFormat = "%Y-%m";
    }

    // 1. Collections
    const collectionStats = await Payment.aggregate([
      { $match: { paymentDate: { $gte: startDate, $lte: endDate }, status: "Success" } },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$paymentDate" } },
          total: { $sum: "$amount" }
        }
      }
    ]);

    // 2. Disbursements
    const aggregateModelDisbursements = async (Model, amountField, dateFields) => {
      return Model.aggregate([
        {
          $project: {
            disbursements: {
              $cond: {
                if: { $and: [{ $isArray: "$disbursement" }, { $gt: [{ $size: "$disbursement" }, 0] }] },
                then: "$disbursement",
                else: [{ amount: { $ifNull: [`$${amountField}`, 0] }, date: { $ifNull: [...dateFields.map(f => `$${f}`), "$createdAt"] } }]
              }
            }
          }
        },
        { $unwind: "$disbursements" },
        { $match: { "disbursements.date": { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: "$disbursements.date" } },
            total: { $sum: "$disbursements.amount" }
          }
        }
      ]);
    };

    const disResults = await Promise.all([
      aggregateModelDisbursements(Loan, "principalAmount", ["dateLoanDisbursed", "emiStartDate"]),
      aggregateModelDisbursements(DailyLoan, "disbursementAmount", ["dateLoanDisbursed", "startDate"]),
      aggregateModelDisbursements(WeeklyLoan, "disbursementAmount", ["dateLoanDisbursed", "startDate"]),
      aggregateModelDisbursements(InterestLoan, "initialPrincipalAmount", ["startDate"]),
    ]);

    const disbursementMap = {};
    disResults.flat().forEach(item => {
      if (item._id) disbursementMap[item._id] = (disbursementMap[item._id] || 0) + item.total;
    });

    const collectionMap = {};
    collectionStats.forEach(item => {
      if (item._id) collectionMap[item._id] = item.total;
    });

    let allDates = [...new Set([...Object.keys(disbursementMap), ...Object.keys(collectionMap)])].sort();

    const trendData = [];
    let runningDisbursement = 0;
    let runningCollection = 0;

    // For today view or very short ranges, we might have few points.
    allDates.forEach(date => {
      const dVal = Math.round(disbursementMap[date] || 0);
      const cVal = Math.round(collectionMap[date] || 0);
      runningDisbursement += dVal;
      runningCollection += cVal;

      trendData.push({
        date,
        disbursement: dVal,
        collection: cVal,
        cumulativeDisbursement: runningDisbursement,
        cumulativeCollection: runningCollection
      });
    });

    sendResponse(res, 200, "success", "Trend stats fetched successfully", null, trendData);
  } catch (error) {
    console.error("Error in getTrendStats:", error);
    next(error);
  }
});

module.exports = {
  getAnalyticsStats,
  exportAllData,
  getTrendStats,
};
