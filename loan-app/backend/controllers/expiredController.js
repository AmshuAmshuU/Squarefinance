const asyncHandler = require("../utils/asyncHandler");
const Loan = require("../models/Loan");
const sendResponse = require("../utils/response");
const { formatLoanResponse } = require("../utils/loanFormatter");

const getExpiredDocLoans = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { search, filterType, date } = req.query;

  const today = new Date();

  // Base query for active loans
  let query = {
    status: { $regex: /^active$/i },
  };

  // Search functionality (Loan Number, Customer Name, Vehicle Number)
  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { loanNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
      ],
    });
  }

  // Advanced Filtering
  if (date) {
    // Expected format: DD/MM/YYYY or YYYY-MM-DD
    let searchDateStart, searchDateEnd;

    if (date.includes("/")) {
      const [d, m, y] = date.split("/");
      searchDateStart = new Date(y, m - 1, d);
      searchDateEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else {
      searchDateStart = new Date(date);
      searchDateStart.setHours(0, 0, 0, 0);
      searchDateEnd = new Date(date);
      searchDateEnd.setHours(23, 59, 59, 999);
    }

    if (filterType === "fc") {
      query.fcDate = { $gte: searchDateStart, $lte: searchDateEnd };
    } else if (filterType === "insurance") {
      query.insuranceDate = { $gte: searchDateStart, $lte: searchDateEnd };
    } else {
      // If no specific type, search in both
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { fcDate: { $gte: searchDateStart, $lte: searchDateEnd } },
          { insuranceDate: { $gte: searchDateStart, $lte: searchDateEnd } },
        ],
      });
    }
  } else {
    // Default: Show any that are expired today or earlier
    if (filterType === "fc") {
      query.fcDate = { $lt: today };
    } else if (filterType === "insurance") {
      query.insuranceDate = { $lt: today };
    } else {
      // Default: show if EITHER FC or Insurance is expired
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ fcDate: { $lt: today } }, { insuranceDate: { $lt: today } }],
      });
    }
  }

  const total = await Loan.countDocuments(query);
  const loansRaw = await Loan.find(query)
    .sort({ fcDate: 1, insuranceDate: 1 })
    .skip(skip)
    .limit(limit);

  const loans = loansRaw.map((loan) => formatLoanResponse(loan));

  sendResponse(
    res,
    200,
    "success",
    "Expired document loans fetched successfully",
    null,
    {
      loans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

module.exports = {
  getExpiredDocLoans,
};
