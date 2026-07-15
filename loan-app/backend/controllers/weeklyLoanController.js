const mongoose = require("mongoose");
const WeeklyLoan = require("../models/WeeklyLoan");
const Loan = require("../models/Loan");
const DailyLoan = require("../models/DailyLoan");
const EMI = require("../models/EMI");
const ClosedLoan = require("../models/ClosedLoan");
const Followup = require("../models/Followup");
const Payment = require("../models/Payment");
const SeizedVehicle = require("../models/SeizedVehicle");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { addDays } = require("date-fns");

// Create Weekly Loan
exports.createWeeklyLoan = asyncHandler(async (req, res, next) => {
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
  const disbursementSum = disbursementArray.reduce(
    (sum, d) => sum + (parseFloat(d.amount) || 0),
    0,
  );
  const amount =
    disbursementSum > 0 ? disbursementSum : parseFloat(disbursementAmount) || 0;
  const totalWeeks = parseInt(totalEmis) || 0;
  const feeRate = parseFloat(processingFeeRate) || 10;
  const currentPaidEmis = parseInt(paidEmis) || 0;

  // Processing Fee
  const processingFee = Math.ceil(amount * (feeRate / 100));

  // Interest Calculation (Removed as requested)
  const weeklyPrincipal = totalWeeks > 0 ? amount / totalWeeks : 0;
  const emiAmount = Math.ceil(weeklyPrincipal);
  const totalInterestAmount = 0;

  // Dates
  const disburseDate = startDate ? new Date(startDate) : null;
  const eStartDate = emiStartDate
    ? new Date(emiStartDate)
    : disburseDate
      ? new Date(disburseDate)
      : null;
  const nextEmiDate = eStartDate;

  const eEndDate = eStartDate ? new Date(eStartDate) : null;
  if (eEndDate && totalWeeks > 0) {
    eEndDate.setDate(eEndDate.getDate() + (totalWeeks - 1) * 7);
  }

  const totalAmount = Math.ceil(
    emiAmount * currentPaidEmis + (parseFloat(req.body.odAmount) || 0),
  );
  // totalCollected starts at processing fee only (actual money received at disbursement)
  // It gets updated by payment records as EMIs are collected
  const totalCollected = Math.ceil(processingFee);
  const remainingEmis = totalWeeks - currentPaidEmis;
  const remainingPrincipalAmount = Math.ceil(
    amount - emiAmount * currentPaidEmis,
  ); // Using rounded EMI

  const weeklyLoan = await WeeklyLoan.create({
    loanNumber,
    customerName,
    mobileNumbers,
    disbursementAmount: amount,
    startDate: disburseDate,
    dateLoanDisbursed: dateLoanDisbursed
      ? new Date(dateLoanDisbursed)
      : disburseDate,
    emiStartDate: eStartDate,
    emiEndDate: eEndDate,
    totalEmis: totalWeeks,
    emiAmount,
    paidEmis: currentPaidEmis,
    remainingEmis,
    totalAmount,
    nextEmiDate: eStartDate,
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

    for (let i = 1; i <= totalWeeks; i++) {
      const isPaid = i <= currentPaidEmis;
      emis.push({
        loanId: weeklyLoan._id,
        loanModel: "WeeklyLoan",
        loanNumber: weeklyLoan.loanNumber,
        customerName: weeklyLoan.customerName,
        emiNumber: i,
        dueDate: new Date(currentEmiDateArr),
        emiAmount: emiAmount,
        status: isPaid ? "Paid" : "Pending",
        amountPaid: isPaid ? emiAmount : 0,
        paymentDate: isPaid ? new Date(eStartDate) : null,
        paymentMode: isPaid ? "CASH" : "",
        overdue: [],
      });
      currentEmiDateArr.setDate(currentEmiDateArr.getDate() + 7);
    }
  }

  if (emis.length > 0) {
    await EMI.insertMany(emis);
  }

  // Create Payment record for processing fee if applicable
  if (weeklyLoan.processingFee && parseFloat(weeklyLoan.processingFee) > 0) {
    try {
      await Payment.create({
        loanId: weeklyLoan._id,
        loanModel: "WeeklyLoan",
        amount: parseFloat(weeklyLoan.processingFee),
        mode: "CASH",
        paymentDate: weeklyLoan.startDate || new Date(),
        paymentType: "Processing Fee",
        status: "Success",
        remarks: "Loan Processing Fee",
        collectedBy: req.user._id,
      });
    } catch (err) {
      console.error("Error creating processing fee payment record:", err);
    }
  }

  sendResponse(
    res,
    201,
    "success",
    "Weekly loan created and EMIs generated successfully",
    null,
    weeklyLoan,
  );
});

// Get EMIs for a Weekly Loan
exports.getWeeklyLoanEMIs = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let emis = await EMI.find({ loanId: id, loanModel: "WeeklyLoan" })
    .sort({
      emiNumber: 1,
    })
    .populate("updatedBy", "name")
    .populate("approvedBy", "name");

  // Lazy generation for existing records that don't have EMIs
  if (emis.length === 0) {
    const weeklyLoan = await WeeklyLoan.findById(id);
    if (!weeklyLoan) {
      return next(new ErrorHandler("Weekly loan not found", 404));
    }

    const generatedEmis = [];
    let currentEmiDateArr = new Date(
      weeklyLoan.emiStartDate || weeklyLoan.startDate,
    );
    const emiAmt = weeklyLoan.disbursementAmount / weeklyLoan.totalEmis;

    for (let i = 1; i <= weeklyLoan.totalEmis; i++) {
      const isPaid = i <= (weeklyLoan.paidEmis || 0);
      generatedEmis.push({
        loanId: weeklyLoan._id,
        loanModel: "WeeklyLoan",
        loanNumber: weeklyLoan.loanNumber,
        customerName: weeklyLoan.customerName,
        emiNumber: i,
        dueDate: new Date(currentEmiDateArr),
        emiAmount: Math.ceil(emiAmt),
        status: isPaid ? "Paid" : "Pending",
        amountPaid: isPaid ? Math.ceil(emiAmt) : 0,
        paymentDate: isPaid
          ? new Date(weeklyLoan.emiStartDate || weeklyLoan.startDate)
          : null,
        paymentMode: isPaid ? "CASH" : "",
      });
      currentEmiDateArr.setDate(currentEmiDateArr.getDate() + 7);
    }

    emis = await EMI.insertMany(generatedEmis);
  }

  sendResponse(res, 200, "success", "EMIs fetched successfully", null, emis);
});

// Get All Weekly Loans
exports.getAllWeeklyLoans = asyncHandler(async (req, res, next) => {
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
  const total = await WeeklyLoan.countDocuments(query);

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
                      { $sum: { $ifNull: ["$$this.overdue.amount", [0]] } },
                    ],
                  },
                },
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
                  { $sum: { $ifNull: ["$$this.overdue.amount", [0]] } },
                ],
              },
            },
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
                          { $eq: ["$$this.loanModel", "WeeklyLoan"] },
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

  let weeklyLoans;
  if (collationConfig) {
    weeklyLoans =
      await WeeklyLoan.aggregate(aggregatePipeline).collation(collationConfig);
  } else {
    weeklyLoans = await WeeklyLoan.aggregate(aggregatePipeline);
  }

  sendResponse(res, 200, "success", "Weekly loans fetched successfully", null, {
    weeklyLoans,
    total,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      limit: Number(limit),
    },
  });
});

// Get Single Weekly Loan
exports.getWeeklyLoanById = asyncHandler(async (req, res, next) => {
  const weeklyLoan = await WeeklyLoan.findById(req.params.id)
    .populate("closureDetails")
    .populate("followupHistory")
    .populate("createdBy", "name")
    .populate("updatedBy", "name");

  if (!weeklyLoan) {
    return next(new ErrorHandler("Weekly loan not found", 404));
  }

  sendResponse(res, 200, "success", "Weekly loan found", null, weeklyLoan);
});

// Update Weekly Loan
exports.updateWeeklyLoan = asyncHandler(async (req, res, next) => {
  let weeklyLoan = await WeeklyLoan.findById(req.params.id);

  if (!weeklyLoan) {
    return next(new ErrorHandler("Weekly loan not found", 404));
  }

  // If employee (not super admin), save clientResponse directly then check other changes
  const isSuperAdmin = req.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin) {
    const { computeLoanDiff } = require("../utils/loanDiff");
    const Approval = require("../models/Approval");
    const { notifyAdmins } = require("./notificationController");

    // Save clientResponse and nextFollowUpDate directly — employees can always update these
    weeklyLoan.clientResponse = req.body.clientResponse !== undefined ? req.body.clientResponse : weeklyLoan.clientResponse;
    weeklyLoan.nextFollowUpDate = req.body.nextFollowUpDate !== undefined ? (req.body.nextFollowUpDate ? new Date(req.body.nextFollowUpDate) : null) : weeklyLoan.nextFollowUpDate;
    weeklyLoan.updatedBy = req.user._id;
    weeklyLoan.clientResponseUpdatedBy = req.user._id;
    weeklyLoan.clientResponseUpdatedAt = new Date();
    await weeklyLoan.save();

    const changes = computeLoanDiff(weeklyLoan, req.body);
    if (changes.length === 0) {
      return sendResponse(res, 200, "success", "No changes detected", null, weeklyLoan);
    }

    await Approval.create({
      requestType: "LOAN_EDIT",
      targetId: weeklyLoan._id,
      targetModel: "WeeklyLoan",
      loanNumber: weeklyLoan.loanNumber,
      customerName: weeklyLoan.customerName || "—",
      requestedBy: req.user._id,
      requestedData: { changes, newValues: req.body },
      status: "Pending",
    });

    await notifyAdmins({
      senderId: req.user._id,
      type: "LOAN_EDIT_REQUEST",
      title: "Loan Edit Approval Request",
      message: `Employee ${req.user.name} requested changes to loan ${weeklyLoan.loanNumber} (${weeklyLoan.customerName || "—"}). ${changes.length} field(s) changed.`,
      data: { loanNumber: weeklyLoan.loanNumber, changes },
    });

    return sendResponse(res, 200, "success", "Changes submitted for approval", null, weeklyLoan);
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

  console.log("------- UPDATE WEEKLY LOAN CALLED -------");
  console.log("Incoming req.body.status:", req.body.status);
  console.log("Extracted status:", status);

  // Global Loan Number Uniqueness Check
  if (loanNumber && loanNumber !== weeklyLoan.loanNumber) {
    const existingLoanWithNumber = await Promise.all([
      Loan.findOne({ loanNumber }),
      WeeklyLoan.findOne({ loanNumber }),
      DailyLoan.findOne({ loanNumber }),
    ]);

    if (existingLoanWithNumber.some((l) => l !== null)) {
      return next(new ErrorHandler("Loan number already exists", 400));
    }
  }

  // Update logic with recalculations
  const updateData = {
    loanNumber: loanNumber || weeklyLoan.loanNumber,
    customerName: customerName || weeklyLoan.customerName,
    mobileNumbers: mobileNumbers || weeklyLoan.mobileNumbers,
    guarantorName:
      guarantorName !== undefined ? guarantorName : weeklyLoan.guarantorName,
    guarantorMobileNumbers:
      guarantorMobileNumbers || weeklyLoan.guarantorMobileNumbers,
    disbursementAmount:
      req.body.disbursement?.length > 0
        ? req.body.disbursement.reduce(
            (sum, d) => sum + (parseFloat(d.amount) || 0),
            0,
          )
        : disbursementAmount !== undefined
          ? parseFloat(disbursementAmount)
          : weeklyLoan.disbursementAmount,
    startDate: startDate || weeklyLoan.startDate,
    dateLoanDisbursed:
      dateLoanDisbursed ||
      weeklyLoan.dateLoanDisbursed ||
      startDate ||
      weeklyLoan.startDate,
    emiStartDate:
      emiStartDate ||
      weeklyLoan.emiStartDate ||
      startDate ||
      weeklyLoan.startDate,
    totalEmis:
      totalEmis !== undefined ? parseInt(totalEmis) : weeklyLoan.totalEmis,
    paidEmis: paidEmis !== undefined ? parseInt(paidEmis) : weeklyLoan.paidEmis,
    processingFeeRate:
      processingFeeRate !== undefined
        ? parseFloat(processingFeeRate)
        : weeklyLoan.processingFeeRate || 10,
    nextFollowUpDate:
      nextFollowUpDate !== undefined
        ? nextFollowUpDate || null
        : weeklyLoan.nextFollowUpDate,
    remarks: remarks !== undefined ? remarks : weeklyLoan.remarks,
    clientResponse:
      clientResponse !== undefined ? clientResponse : weeklyLoan.clientResponse,
    status: status || weeklyLoan.status,
    interestRate: 0,
    expenses: 0,
    paymentMode: paymentMode || weeklyLoan.paymentMode,
    chequeNumber:
      chequeNumber !== undefined ? chequeNumber : weeklyLoan.chequeNumber,
    disbursement: req.body.disbursement || weeklyLoan.disbursement,
    updatedBy: req.user._id,
  };

  // Recalculate
  const amount = updateData.disbursementAmount;
  const totalWeeks = updateData.totalEmis;
  const currentPaidEmis = updateData.paidEmis;
  const feeRate = updateData.processingFeeRate;

  // Processing Fee
  const processingFee = Math.ceil(amount * (feeRate / 100));

  // Interest Calculation (Removed)
  const weeklyPrincipal = amount / totalWeeks;
  const emiAmount = Math.ceil(weeklyPrincipal);
  const totalInterestAmount = 0;

  // EMI End Date
  const eStartDate = new Date(updateData.emiStartDate);
  const eEndDate = new Date(eStartDate);
  eEndDate.setDate(eEndDate.getDate() + (totalWeeks - 1) * 7);
  updateData.emiEndDate = eEndDate;

  const totalAmount = Math.ceil(
    emiAmount * currentPaidEmis + (weeklyLoan.odAmount || 0),
  );
  // totalCollected: use value from request body (set by frontend from DB) or keep existing
  const totalCollected = req.body.totalCollected !== undefined
    ? req.body.totalCollected
    : weeklyLoan.totalCollected;
  const remainingEmis = totalWeeks - currentPaidEmis;
  const remainingPrincipalAmount = Math.ceil(
    amount - emiAmount * currentPaidEmis,
  );

  Object.assign(updateData, {
    emiAmount,
    processingFee,
    totalInterestAmount,
    totalCollected,
    remainingEmis,
    remainingPrincipalAmount,
    nextFollowUpDate: nextFollowUpDate
      ? new Date(nextFollowUpDate)
      : updateData.nextFollowUpDate,
  });

  weeklyLoan = await WeeklyLoan.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  // Handle ClosedLoan and Followup records
  if (updateData.status === "Closed") {
    await ClosedLoan.findOneAndUpdate(
      { loanId: weeklyLoan._id },
      {
        loanId: weeklyLoan._id,
        loanModel: "WeeklyLoan",
        closureType: "Foreclosure",
        closureDate: new Date(),
        amount: weeklyLoan.totalCollected || 0,
        processedBy: req.user._id,
        remarks: `Auto-created via WeeklyLoan sync. ${weeklyLoan.remarks || ""}`,
      },
      { upsert: true, new: true },
    );
  }

  if (clientResponse || nextFollowUpDate) {
    await Followup.create({
      loanId: weeklyLoan._id,
      loanModel: "WeeklyLoan",
      loanType: "Weekly",
      followupDate: new Date(),
      clientResponse: clientResponse || weeklyLoan.clientResponse,
      remarks: weeklyLoan.remarks,
      nextFollowupDate: nextFollowUpDate,
      followedUpBy: req.user._id,
    });
  }

  // Refetch to include virtuals
  weeklyLoan = await WeeklyLoan.findById(weeklyLoan._id)
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
      loanId: weeklyLoan._id,
      loanModel: "WeeklyLoan",
    }).sort({ emiNumber: 1 });

    if (emis.length > 0) {
      const oldTenure = emis.length;
      const newTenure = parseInt(totalEmis || weeklyLoan.totalEmis);
      const newEmiStartDate = new Date(weeklyLoan.emiStartDate);

      // 1. Update existing EMIs
      const updatePromises = emis.map((emi, index) => {
        const newDueDate = new Date(newEmiStartDate);
        newDueDate.setDate(newDueDate.getDate() + index * 7);

        const updates = {
          dueDate: newDueDate,
          customerName: weeklyLoan.customerName,
          loanNumber: weeklyLoan.loanNumber,
        };

        // Only update amount for non-paid EMIs to prevent historical data mismatch
        if (emi.status !== "Paid") {
          updates.emiAmount = Math.ceil(weeklyLoan.emiAmount);
        }

        return EMI.findByIdAndUpdate(emi._id, updates);
      });
      await Promise.all(updatePromises);

      // 2. Handle Tenure Increase
      if (newTenure > oldTenure) {
        const extraEmis = [];
        for (let i = oldTenure + 1; i <= newTenure; i++) {
          const newDueDate = new Date(newEmiStartDate);
          newDueDate.setDate(newDueDate.getDate() + (i - 1) * 7);

          extraEmis.push({
            loanId: weeklyLoan._id,
            loanModel: "WeeklyLoan",
            loanNumber: weeklyLoan.loanNumber,
            customerName: weeklyLoan.customerName,
            emiNumber: i,
            dueDate: newDueDate,
            emiAmount: Math.ceil(weeklyLoan.emiAmount),
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
          loanId: weeklyLoan._id,
          loanModel: "WeeklyLoan",
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
    "Weekly loan updated successfully",
    null,
    weeklyLoan,
  );
});

// Delete Weekly Loan
exports.deleteWeeklyLoan = asyncHandler(async (req, res, next) => {
  const weeklyLoan = await WeeklyLoan.findById(req.params.id);

  if (!weeklyLoan) {
    return next(new ErrorHandler("Weekly loan not found", 404));
  }

  // Delete associated records
  await Promise.all([
    EMI.deleteMany({ loanId: weeklyLoan._id, loanModel: "WeeklyLoan" }),
    Payment.deleteMany({ loanId: weeklyLoan._id, loanModel: "WeeklyLoan" }),
    require("../models/SeizedVehicle").deleteMany({
      loanId: weeklyLoan._id,
      loanModel: "WeeklyLoan",
    }),
    ClosedLoan.deleteMany({ loanId: weeklyLoan._id, loanModel: "WeeklyLoan" }),
    Followup.deleteMany({ loanId: weeklyLoan._id, loanModel: "WeeklyLoan" }),
  ]);

  await weeklyLoan.deleteOne();

  sendResponse(res, 200, "success", "Weekly loan deleted successfully");
});

// Get Weekly Pending Payments (Aggregation)
exports.getWeeklyPendingPayments = asyncHandler(async (req, res, next) => {
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

  const result = await WeeklyLoan.aggregate([
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
                { $eq: ["$$emi.loanModel", "WeeklyLoan"] },
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
            input: "$emis",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                { $sum: { $ifNull: ["$$this.overdue.amount", [0]] } },
              ],
            },
          },
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
        loanModel: { $literal: "WeeklyLoan" },
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
    "Weekly pending payments fetched successfully",
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

// Get Weekly Follow-up Loans (Aggregation)
exports.getWeeklyFollowupLoans = asyncHandler(async (req, res, next) => {
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

  const result = await WeeklyLoan.aggregate([
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
                { $eq: ["$$emi.loanModel", "WeeklyLoan"] },
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
                          { $eq: ["$$e.loanModel", "WeeklyLoan"] },
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
                              { $eq: ["$$e.loanModel", "WeeklyLoan"] },
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
                          { $eq: ["$$e.loanModel", "WeeklyLoan"] },
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
    "Weekly follow-up payments fetched successfully",
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

// Get Weekly Pending EMI Details
exports.getWeeklyPendingEmiDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid EMI ID provided", 400));
  }

  // First get the loanId for this EMI
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
        from: "weeklyloans", // Collection name for WeeklyLoan model
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
        loanModel: { $literal: "WeeklyLoan" },
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
    // If no overdue EMIs, return at least the current one if it exists
    // (though the monthly logic suggests we only care about overdue ones in this view)
    return next(
      new ErrorHandler(`No pending installments found for this loan`, 404),
    );
  }

  sendResponse(
    res,
    200,
    "success",
    "Weekly EMI details fetched successfully",
    null,
    emiDetails,
  );
});
