const mongoose = require("mongoose");
const DailyLoan = require("../models/DailyLoan");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const EMI = require("../models/EMI");
const ClosedLoan = require("../models/ClosedLoan");
const Followup = require("../models/Followup");
const Payment = require("../models/Payment");
const SeizedVehicle = require("../models/SeizedVehicle");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

// Create Daily Loan
exports.createDailyLoan = asyncHandler(async (req, res, next) => {
  const {
    loanNumber,
    customerName,
    mobileNumbers,
    disbursementAmount,
    startDate,
    dateLoanDisbursed,
    totalEmis,
    paidEmis,
    nextFollowUpDate,
    remarks,
    clientResponse,
    processingFeeRate,
    emiStartDate,
    status,
    guarantorName,
    guarantorMobileNumbers,
    paymentMode,
    chequeNumber,
  } = req.body;

  if (!loanNumber) {
    return next(new ErrorHandler("Loan number is required", 400));
  }

  const existingLoan = await Promise.all([
    Loan.findOne({ loanNumber }),
    WeeklyLoan.findOne({ loanNumber }),
    DailyLoan.findOne({ loanNumber }),
  ]);

  if (existingLoan.some((loan) => loan !== null)) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  // Calculations
  const disbursementArray = req.body.disbursement || [];
  const disbursementSum = disbursementArray.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const amount = disbursementSum > 0 ? disbursementSum : (parseFloat(disbursementAmount) || 0);
  const totalDays = parseInt(totalEmis) || 0;
  const feeRate = parseFloat(processingFeeRate) || 10;
  const currentPaidEmis = parseInt(paidEmis) || 0;

  const processingFee = Math.ceil(amount * (feeRate / 100));
  const dailyPrincipal = totalDays > 0 ? amount / totalDays : 0;
  const emiAmount = Math.ceil(dailyPrincipal);

  // Dates
  const disburseDate = startDate ? new Date(startDate) : null;
  const eStartDate = emiStartDate
    ? new Date(emiStartDate)
    : (disburseDate ? new Date(disburseDate) : null);

  const eEndDate = eStartDate ? new Date(eStartDate) : null;
  if (eEndDate && totalDays > 0) {
    eEndDate.setDate(eEndDate.getDate() + (totalDays - 1));
  }

  const totalAmount = Math.ceil(emiAmount * currentPaidEmis + (parseFloat(req.body.odAmount) || 0));
  const totalCollected = Math.ceil(processingFee); // starts at processing fee only
  const remainingEmis = totalDays - currentPaidEmis;
  const remainingPrincipalAmount = Math.ceil(amount - dailyPrincipal * currentPaidEmis);

  const dailyLoan = await DailyLoan.create({
    loanNumber,
    customerName,
    mobileNumbers,
    disbursementAmount: amount,
    startDate: disburseDate,
    dateLoanDisbursed: dateLoanDisbursed ? new Date(dateLoanDisbursed) : disburseDate,
    emiStartDate: eStartDate,
    emiEndDate: eEndDate,
    totalEmis: totalDays,
    emiAmount,
    paidEmis: currentPaidEmis,
    remainingEmis,
    totalAmount,
    nextEmiDate: eStartDate, // Setting next EMI to start date initially
    processingFee,
    processingFeeRate: feeRate,
    interestRate: 0,
    totalInterestAmount: 0,
    totalCollected,
    remainingPrincipalAmount,
    expenses: 0,
    nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
    remarks,
    clientResponse,
    guarantorName,
    guarantorMobileNumbers,
    paymentMode: paymentMode || "Cash",
    chequeNumber,
    disbursement: req.body.disbursement || [],
    status: status || "Active",
    createdBy: req.user._id,
  });

  // Generate EMIs
  const emis = [];
  if (eStartDate) {
    let currentEmiDateArr = new Date(eStartDate);

    for (let i = 1; i <= totalDays; i++) {
      const isPaid = i <= currentPaidEmis;
      emis.push({
        loanId: dailyLoan._id,
        loanModel: "DailyLoan",
        loanNumber: dailyLoan.loanNumber,
        customerName: dailyLoan.customerName,
        emiNumber: i,
        dueDate: new Date(currentEmiDateArr),
        emiAmount: emiAmount,
        status: isPaid ? "Paid" : "Pending",
        amountPaid: isPaid ? emiAmount : 0,
        paymentDate: isPaid ? new Date(eStartDate) : null,
        paymentMode: isPaid ? "CASH" : "",
        overdue: [],
      });
      currentEmiDateArr.setDate(currentEmiDateArr.getDate() + 1);
    }
  }

  if (emis.length > 0) {
    await EMI.insertMany(emis);
  }

  // No processing fee for daily loans as per business rules

  sendResponse(
    res,
    201,
    "success",
    "Daily loan created and EMIs generated successfully",
    null,
    dailyLoan,
  );
});

// Get EMIs for a Daily Loan
exports.getDailyLoanEMIs = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let emis = await EMI.find({ loanId: id, loanModel: "DailyLoan" })
    .sort({
      emiNumber: 1,
    })
    .populate("updatedBy", "name")
    .populate("approvedBy", "name");

  // Lazy generation for existing records that don't have EMIs
  if (emis.length === 0) {
    const dailyLoan = await DailyLoan.findById(id);
    if (!dailyLoan) {
      return next(new ErrorHandler("Daily loan not found", 404));
    }

    const generatedEmis = [];
    let currentEmiDateArr = new Date(dailyLoan.startDate);
    const emiAmt = dailyLoan.disbursementAmount / dailyLoan.totalEmis;

    for (let i = 1; i <= dailyLoan.totalEmis; i++) {
      const isPaid = i <= (dailyLoan.paidEmis || 0);
      generatedEmis.push({
        loanId: dailyLoan._id,
        loanModel: "DailyLoan",
        loanNumber: dailyLoan.loanNumber,
        customerName: dailyLoan.customerName,
        emiNumber: i,
        dueDate: new Date(currentEmiDateArr),
        emiAmount: Math.ceil(emiAmt),
        status: isPaid ? "Paid" : "Pending",
        amountPaid: isPaid ? Math.ceil(emiAmt) : 0,
        paymentDate: isPaid ? new Date(dailyLoan.startDate) : null,
        paymentMode: isPaid ? "CASH" : "",
      });
      currentEmiDateArr.setDate(currentEmiDateArr.getDate() + 1);
    }

    emis = await EMI.insertMany(generatedEmis);
  }

  sendResponse(res, 200, "success", "EMIs fetched successfully", null, emis);
});

// Get All Daily Loans
exports.getAllDailyLoans = asyncHandler(async (req, res, next) => {
  const { status, followup, searchQuery, page = 1, limit = 25 } = req.query;
  const query = {};

  if (status) {
    query.status = status;
  }

  if (followup === "true") {
    query.nextFollowUpDate = { $exists: true, $ne: null };
  }

  if (searchQuery) {
    query.$or = [
      { loanNumber: { $regex: searchQuery, $options: "i" } },
      { customerName: { $regex: searchQuery, $options: "i" } },
      { mobileNumbers: { $regex: searchQuery, $options: "i" } },
      { guarantorMobileNumbers: { $regex: searchQuery, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await DailyLoan.countDocuments(query);

  let sortConfig = { createdAt: -1 };
  let collationConfig = null;

  if (searchQuery) {
    sortConfig = { loanNumber: 1 };
    collationConfig = { locale: "en", numericOrdering: true };
  }

  const aggregatePipeline = [
    { $match: query },
    { $sort: sortConfig },
    { $skip: skip },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: "emis",
        localField: "_id",
        foreignField: "loanId",
        as: "emis",
      },
    },
    {
      $addFields: {
        repaymentStats: {
          totalCollected: {
            $add: [
              { $sum: { $ifNull: ["$emis.amountPaid", [0]] } },
              { 
                $reduce: {
                  input: "$emis",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      { $sum: { $ifNull: ["$$this.overdue.amount", [0]] } }
                    ]
                  }
                }
              },
              { $ifNull: ["$processingFee", 0] },
            ],
          },
          overdueAmount: {
            $reduce: {
              input: "$emis",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  { $sum: { $ifNull: ["$$this.overdue.amount", [0]] } }
                ]
              }
            }
          },
          arrearsAmount: {
            $reduce: {
              input: "$emis",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$$this.status", "Paid"] },
                          { $lt: ["$$this.dueDate", new Date()] },
                          { $eq: ["$$this.loanModel", "DailyLoan"] },
                        ],
                      },
                      {
                        $subtract: [
                          { $toDouble: "$$this.emiAmount" },
                          { $ifNull: [{ $toDouble: "$$this.amountPaid" }, 0] },
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
          paidEmisCount: {
            $size: {
              $filter: {
                input: "$emis",
                as: "emi",
                cond: { $eq: ["$$emi.status", "Paid"] },
              },
            },
          },
          remainingTenure: {
            $size: {
              $filter: {
                input: "$emis",
                as: "emi",
                cond: { $ne: ["$$emi.status", "Paid"] },
              },
            },
          },
          nextEmiDate: {
            $min: {
              $map: {
                input: {
                  $filter: {
                    input: "$emis",
                    as: "emi",
                    cond: { $ne: ["$$emi.status", "Paid"] },
                  },
                },
                as: "f",
                in: "$$f.dueDate",
              },
            },
          },
        },
      },
    },
    { $addFields: { principalAmount: "$disbursementAmount" } },
    { $project: { emis: 0 } },
  ];
  let dailyLoans;
  if (collationConfig) {
    dailyLoans = await DailyLoan.aggregate(aggregatePipeline).collation(collationConfig);
  } else {
    dailyLoans = await DailyLoan.aggregate(aggregatePipeline);
  }

  sendResponse(res, 200, "success", "Daily loans fetched successfully", null, {
    dailyLoans,
    total,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      limit: Number(limit),
    },
  });
});

// Get Single Daily Loan
exports.getDailyLoanById = asyncHandler(async (req, res, next) => {
  const dailyLoan = await DailyLoan.findById(req.params.id)
    .populate("closureDetails")
    .populate("followupHistory")
    .populate("createdBy", "name")
    .populate("updatedBy", "name");

  if (!dailyLoan) {
    return next(new ErrorHandler("Daily loan not found", 404));
  }

  sendResponse(res, 200, "success", "Daily loan found", null, dailyLoan);
});

// Update Daily Loan
exports.updateDailyLoan = asyncHandler(async (req, res, next) => {
  let dailyLoan = await DailyLoan.findById(req.params.id);

  if (!dailyLoan) {
    return next(new ErrorHandler("Daily loan not found", 404));
  }

  const {
    loanNumber,
    customerName,
    mobileNumbers,
    disbursementAmount,
    startDate,
    dateLoanDisbursed,
    totalEmis,
    paidEmis,
    nextFollowUpDate,
    remarks,
    clientResponse,
    status,
    processingFeeRate,
    emiStartDate,
    guarantorName,
    guarantorMobileNumbers,
    paymentMode,
    chequeNumber,
  } = req.body;

  // Global Loan Number Uniqueness Check
  if (loanNumber && loanNumber !== dailyLoan.loanNumber) {
    const existingLoanWithNumber = await Promise.all([
      Loan.findOne({ loanNumber }),
      WeeklyLoan.findOne({ loanNumber }),
      DailyLoan.findOne({ loanNumber }),
    ]);

    if (existingLoanWithNumber.some((l) => l !== null)) {
      return next(new ErrorHandler("Loan number already exists", 400));
    }
  }

  const updateData = {
    loanNumber: loanNumber || dailyLoan.loanNumber,
    customerName: customerName || dailyLoan.customerName,
    mobileNumbers: mobileNumbers || dailyLoan.mobileNumbers,
    guarantorName: guarantorName !== undefined ? guarantorName : dailyLoan.guarantorName,
    guarantorMobileNumbers: guarantorMobileNumbers || dailyLoan.guarantorMobileNumbers,
    disbursementAmount: req.body.disbursement?.length > 0
        ? req.body.disbursement.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
        : (disbursementAmount !== undefined ? parseFloat(disbursementAmount) : dailyLoan.disbursementAmount),
    startDate: startDate || dailyLoan.startDate,
    dateLoanDisbursed: dateLoanDisbursed || dailyLoan.dateLoanDisbursed || startDate || dailyLoan.startDate,
    emiStartDate:
      emiStartDate ||
      dailyLoan.emiStartDate ||
      startDate ||
      dailyLoan.startDate,
    totalEmis:
      totalEmis !== undefined ? parseInt(totalEmis) : dailyLoan.totalEmis,
    paidEmis: paidEmis !== undefined ? parseInt(paidEmis) : dailyLoan.paidEmis,
    processingFeeRate:
      processingFeeRate !== undefined
        ? parseFloat(processingFeeRate)
        : dailyLoan.processingFeeRate || 10,
    nextFollowUpDate:
      nextFollowUpDate !== undefined
        ? nextFollowUpDate || null
        : dailyLoan.nextFollowUpDate,
    remarks: remarks !== undefined ? remarks : dailyLoan.remarks,
    clientResponse:
      clientResponse !== undefined ? clientResponse : dailyLoan.clientResponse,
    status: status || dailyLoan.status,
    paymentMode: paymentMode || dailyLoan.paymentMode,
    chequeNumber: chequeNumber !== undefined ? chequeNumber : dailyLoan.chequeNumber,
    disbursement: req.body.disbursement || dailyLoan.disbursement,
    updatedBy: req.user._id,
  };

  const amount = updateData.disbursementAmount;
  const totalDays = updateData.totalEmis;
  const currentPaidEmis = updateData.paidEmis;
  const feeRate = updateData.processingFeeRate;

  const processingFee = Math.ceil(amount * (feeRate / 100));
  const dailyPrincipal = amount / totalDays;
  const emiAmount = Math.ceil(dailyPrincipal);

  const eStartDate = new Date(updateData.emiStartDate);
  const eEndDate = new Date(eStartDate);
  eEndDate.setDate(eEndDate.getDate() + (totalDays - 1));
  updateData.emiEndDate = eEndDate;

  const totalAmount = Math.ceil(emiAmount * currentPaidEmis + (dailyLoan.odAmount || 0));
  // totalCollected: use value from request body or keep existing — managed by payment records
  const totalCollected = req.body.totalCollected !== undefined
    ? req.body.totalCollected
    : dailyLoan.totalCollected;
  const remainingEmis = totalDays - currentPaidEmis;
  const remainingPrincipalAmount = Math.ceil(amount - dailyPrincipal * currentPaidEmis);

  Object.assign(updateData, {
    emiAmount,
    processingFee,
    totalCollected,
    remainingEmis,
    remainingPrincipalAmount,
    nextFollowUpDate: nextFollowUpDate
      ? new Date(nextFollowUpDate)
      : updateData.nextFollowUpDate,
  });

  dailyLoan = await DailyLoan.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  // Handle ClosedLoan and Followup records
  if (updateData.status === "Closed") {
    await ClosedLoan.findOneAndUpdate(
      { loanId: dailyLoan._id },
      {
        loanId: dailyLoan._id,
        loanModel: "DailyLoan",
        closureType: "Foreclosure", // Daily/Weekly usually closure is foreclosure or full payment
        closureDate: new Date(),
        amount: dailyLoan.totalCollected || 0,
        processedBy: req.user._id,
        remarks: `Auto-created via DailyLoan sync. ${dailyLoan.remarks || ""}`,
      },
      { upsert: true, new: true },
    );
  }

  if (clientResponse || nextFollowUpDate) {
    await Followup.create({
      loanId: dailyLoan._id,
      loanModel: "DailyLoan",
      loanType: "Daily",
      followupDate: new Date(),
      clientResponse: clientResponse || dailyLoan.clientResponse,
      remarks: dailyLoan.remarks,
      nextFollowupDate: nextFollowUpDate,
      followedUpBy: req.user._id,
    });
  }

  // Refetch to include virtuals
  dailyLoan = await DailyLoan.findById(dailyLoan._id)
    .populate("closureDetails")
    .populate("followupHistory")
    .populate("createdBy", "name")
    .populate("updatedBy", "name");

  // Synchronize EMIs if date, principal, or identification details changed
  if (
    emiStartDate ||
    disbursementAmount !== undefined ||
    totalEmis !== undefined ||
    customerName !== undefined ||
    loanNumber !== undefined
  ) {
    const emis = await EMI.find({
      loanId: dailyLoan._id,
      loanModel: "DailyLoan",
    }).sort({ emiNumber: 1 });

    if (emis.length > 0) {
      const oldTenure = emis.length;
      const newTenure = parseInt(totalEmis || dailyLoan.totalEmis);
      const newEmiStartDate = new Date(dailyLoan.emiStartDate);

      // 1. Update existing EMIs
      const updatePromises = emis.map((emi, index) => {
        const newDueDate = new Date(newEmiStartDate);
        newDueDate.setDate(newDueDate.getDate() + index);

        const updates = {
          dueDate: newDueDate,
          customerName: dailyLoan.customerName,
          loanNumber: dailyLoan.loanNumber,
        };

        // Only update amount for non-paid EMIs to prevent historical data mismatch
        if (emi.status !== "Paid") {
          updates.emiAmount = Math.ceil(dailyLoan.emiAmount);
        }

        return EMI.findByIdAndUpdate(emi._id, updates);
      });
      await Promise.all(updatePromises);

      // 2. Handle Tenure Increase
      if (newTenure > oldTenure) {
        const extraEmis = [];
        for (let i = oldTenure + 1; i <= newTenure; i++) {
          const newDueDate = new Date(newEmiStartDate);
          newDueDate.setDate(newDueDate.getDate() + (i - 1));

          extraEmis.push({
            loanId: dailyLoan._id,
            loanModel: "DailyLoan",
            loanNumber: dailyLoan.loanNumber,
            customerName: dailyLoan.customerName,
            emiNumber: i,
            dueDate: newDueDate,
            emiAmount: Math.ceil(dailyLoan.emiAmount),
            status: "Pending",
            overdue: [],
          });
        }
        if (extraEmis.length > 0) {
          await EMI.insertMany(extraEmis);
        }
      }
      // 3. Handle Tenure Decrease
      else if (newTenure < oldTenure) {
        // Remove extra EMIs only if they are Pending
        await EMI.deleteMany({
          loanId: dailyLoan._id,
          loanModel: "DailyLoan",
          emiNumber: { $gt: newTenure },
          status: "Pending",
        });
      }
    }
  }

  sendResponse(
    res,
    200,
    "success",
    "Daily loan updated successfully",
    null,
    dailyLoan,
  );
});

// Delete Daily Loan
exports.deleteDailyLoan = asyncHandler(async (req, res, next) => {
  const dailyLoan = await DailyLoan.findById(req.params.id);

  if (!dailyLoan) {
    return next(new ErrorHandler("Daily loan not found", 404));
  }

  // Delete associated records
  await Promise.all([
    EMI.deleteMany({ loanId: dailyLoan._id, loanModel: "DailyLoan" }),
    Payment.deleteMany({ loanId: dailyLoan._id, loanModel: "DailyLoan" }),
    require("../models/SeizedVehicle").deleteMany({
      loanId: dailyLoan._id,
      loanModel: "DailyLoan",
    }),
    ClosedLoan.deleteMany({ loanId: dailyLoan._id, loanModel: "DailyLoan" }),
    Followup.deleteMany({ loanId: dailyLoan._id, loanModel: "DailyLoan" }),
  ]);

  await dailyLoan.deleteOne();
  sendResponse(res, 200, "success", "Daily loan deleted successfully");
});

// Get Daily Pending Payments
exports.getDailyPendingPayments = asyncHandler(async (req, res, next) => {
  const {
    customerName,
    loanNumber,
    mobileNumber,
    pageNum = 1,
    limitNum = 10,
  } = req.query;
  const page = parseInt(pageNum, 10) || 1;
  const limit = parseInt(limitNum, 10) || 25;
  const skip = (page - 1) * limit;

  const query = {};
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (mobileNumber)
    query.mobileNumbers = { $regex: mobileNumber, $options: "i" };

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await DailyLoan.aggregate([
    {
      $match: {
        ...query,
        status: { $ne: "Closed" },
      },
    },
    {
      $lookup: {
        from: "emis",
        localField: "_id",
        foreignField: "loanId",
        as: "emis",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "updatedBy",
        foreignField: "_id",
        as: "updatedByInfo",
      },
    },
    {
      $addFields: {
        updatedBy: { $arrayElemAt: ["$updatedByInfo", 0] },
      },
    },
    {
      $addFields: {
        pendingEmisList: {
          $filter: {
            input: "$emis",
            as: "emi",
            cond: {
              $and: [
                { $ne: ["$$emi.status", "Paid"] },
                { $lte: ["$$emi.dueDate", now] },
                { $eq: ["$$emi.loanModel", "DailyLoan"] },
              ],
            },
          },
        },
      },
    },
    {
      $match: {
        $expr: { $gt: [{ $size: "$pendingEmisList" }, 0] },
      },
    },
    {
      $project: {
        loanId: "$_id",
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        status: 1,
        unpaidWeeks: { $size: "$pendingEmisList" },
        totalDueAmount: {
          $reduce: {
            input: "$pendingEmisList",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                {
                  $subtract: [
                    { $toDouble: "$$this.emiAmount" },
                    { $toDouble: { $ifNull: ["$$this.amountPaid", 0] } },
                  ],
                },
              ],
            },
          },
        },
        penalOverdue: {
          $reduce: {
            input: "$emis", // Sum from ALL emis of the loan
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                { $sum: { $ifNull: ["$$this.overdue.amount", [0]] } }
              ]
            }
          }
        },
        earliestDueDate: { $min: "$pendingEmisList.dueDate" },
        earliestEmiId: {
          $let: {
            vars: {
              overdueEmi: { $arrayElemAt: ["$pendingEmisList", 0] },
            },
            in: { $toString: "$$overdueEmi._id" },
          },
        },
        clientResponse: 1,
        nextFollowUpDate: 1,
        updatedBy: {
          _id: 1,
          name: 1,
        },
        updatedAt: 1,
        loanModel: { $literal: "DailyLoan" },
      },
    },
    { $sort: { earliestDueDate: 1 } },
    {
      $facet: {
        payments: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const payments = result[0].payments;
  const total = result[0].totalCount[0]?.count || 0;

  sendResponse(
    res,
    200,
    "success",
    "Daily pending payments fetched successfully",
    null,
    {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

// Get Daily Follow-up Loans
exports.getDailyFollowupLoans = asyncHandler(async (req, res, next) => {
  const {
    customerName,
    loanNumber,
    mobileNumber,
    nextFollowUpDate,
    startDate,
    endDate,
    pageNum = 1,
    limitNum = 10,
  } = req.query;
  const page = parseInt(pageNum, 10) || 1;
  const limit = parseInt(limitNum, 10) || 25;
  const skip = (page - 1) * limit;

  const query = {};
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (mobileNumber)
    query.mobileNumbers = { $regex: mobileNumber, $options: "i" };

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.nextFollowUpDate = { $gte: start, $lte: end };
  } else {
    const dateToFilter =
      nextFollowUpDate || new Date().toISOString().split("T")[0];
    const start = new Date(dateToFilter);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateToFilter);
    end.setHours(23, 59, 59, 999);
    query.nextFollowUpDate = { $gte: start, $lte: end };
  }

  const result = await DailyLoan.aggregate([
    {
      $match: {
        ...query,
        status: { $ne: "Closed" },
      },
    },
    {
      $lookup: {
        from: "emis",
        localField: "_id",
        foreignField: "loanId",
        as: "emis",
      },
    },
    {
      $addFields: {
        pendingEmisList: {
          $filter: {
            input: "$emis",
            as: "emi",
            cond: {
              $and: [
                { $ne: ["$$emi.status", "Paid"] },
                { $eq: ["$$emi.loanModel", "DailyLoan"] },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        loanId: "$_id",
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        status: 1,
        unpaidWeeks: {
          $cond: {
            if: { $gt: [{ $size: "$pendingEmisList" }, 0] },
            then: { $size: "$pendingEmisList" },
            else: 1,
          },
        },
        totalDueAmount: {
          $let: {
            vars: {
              sumOverdue: {
                $reduce: {
                  input: "$pendingEmisList",
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      {
                        $subtract: [
                          { $toDouble: "$$this.emiAmount" },
                          { $toDouble: "$$this.amountPaid" },
                        ],
                      },
                    ],
                  },
                },
              },
              nextEmi: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$emis",
                      as: "e",
                      cond: {
                        $and: [
                          { $ne: ["$$e.status", "Paid"] },
                          { $eq: ["$$e.loanModel", "DailyLoan"] },
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
            },
            in: {
              $cond: {
                if: { $gt: [{ $size: "$pendingEmisList" }, 0] },
                then: "$$sumOverdue",
                else: {
                  $subtract: [
                    { $toDouble: { $ifNull: ["$$nextEmi.emiAmount", 0] } },
                    { $toDouble: { $ifNull: ["$$nextEmi.amountPaid", 0] } },
                  ],
                },
              },
            },
          },
        },
        earliestDueDate: {
          $let: {
            vars: {
              overdueMin: { $min: "$pendingEmisList.dueDate" },
              anyPending: {
                $arrayElemAt: [
                  {
                    $sortArray: {
                      input: {
                        $filter: {
                          input: "$emis",
                          as: "e",
                          cond: {
                            $and: [
                              { $ne: ["$$e.status", "Paid"] },
                              { $eq: ["$$e.loanModel", "DailyLoan"] },
                            ],
                          },
                        },
                      },
                      sortBy: { dueDate: 1 },
                    },
                  },
                  0,
                ],
              },
            },
            in: { $ifNull: ["$$overdueMin", "$$anyPending.dueDate"] },
          },
        },
        earliestEmiId: {
          $let: {
            vars: {
              overdueEmi: { $arrayElemAt: ["$pendingEmisList", 0] },
              anyPendingEmi: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$emis",
                      as: "e",
                      cond: {
                        $and: [
                          { $ne: ["$$e.status", "Paid"] },
                          { $eq: ["$$e.loanModel", "DailyLoan"] },
                        ],
                      },
                    },
                  },
                  0,
                ],
              },
            },
            in: {
              $toString: {
                $ifNull: ["$$overdueEmi._id", "$$anyPendingEmi._id"],
              },
            },
          },
        },
        clientResponse: 1,
        nextFollowUpDate: 1,
      },
    },
    { $sort: { earliestDueDate: 1 } },
    {
      $facet: {
        payments: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const payments = result[0].payments;
  const total = result[0].totalCount[0]?.count || 0;

  sendResponse(
    res,
    200,
    "success",
    "Daily follow-up payments fetched successfully",
    null,
    {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

// Get Daily Pending EMI Details
exports.getDailyPendingEmiDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid EMI ID provided", 400));
  }

  const currentEmi = await EMI.findById(id);
  if (!currentEmi) {
    return next(new ErrorHandler(`EMI details not found for ID: ${id}`, 404));
  }

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const emiDetails = await EMI.aggregate([
    {
      $match: {
        loanId: new mongoose.Types.ObjectId(currentEmi.loanId),
        status: { $ne: "Paid" },
        dueDate: { $lte: now },
      },
    },
    { $sort: { dueDate: 1 } },
    {
      $lookup: {
        from: "payments",
        localField: "_id",
        foreignField: "emiId",
        as: "paymentRecords",
      },
    },
    {
      $lookup: {
        from: "dailyloans",
        localField: "loanId",
        foreignField: "_id",
        as: "loan",
      },
    },
    { $unwind: "$loan" },
    {
      $lookup: {
        from: "users",
        localField: "loan.updatedBy",
        foreignField: "_id",
        as: "updatedUserInfo",
      },
    },
    {
      $unwind: {
        path: "$updatedUserInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        loanId: "$loan._id",
        loanModel: { $literal: "DailyLoan" },
        loanNumber: "$loan.loanNumber",
        customerName: "$loan.customerName",
        mobileNumber: "$loan.mobileNumber",
        disbursementAmount: "$loan.disbursementAmount",
        emiAmount: "$emiAmount",
        amountPaid: "$amountPaid",
        status: "$status",
        dueDate: "$dueDate",
        paymentHistory: 1,
        paymentDate: 1,
        paymentMode: 1,
        remarks: "$remarks",
        clientResponse: "$loan.clientResponse",
        nextFollowUpDate: "$loan.nextFollowUpDate",
        emiNumber: 1,
        overdue: "$overdue",
        paymentHistory: "$paymentHistory",
        updatedAt: "$loan.updatedAt",
        updatedBy: { $ifNull: ["$updatedUserInfo.name", "$loan.updatedBy"] },
        paymentRecords: 1,
      },
    },
  ]);

  if (!emiDetails || emiDetails.length === 0) {
    return next(
      new ErrorHandler(`No pending installments found for this loan`, 404),
    );
  }

  sendResponse(
    res,
    200,
    "success",
    "Daily EMI details fetched successfully",
    null,
    emiDetails,
  );
});
