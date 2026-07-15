const mongoose = require("mongoose");
const InterestLoan = require("../models/InterestLoan");
const InterestEMI = require("../models/InterestEMI");
const Payment = require("../models/Payment");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { notifyAdmins } = require("./notificationController");
const { addMonths, differenceInCalendarMonths } = require("date-fns");
const {
  parseDateInLocalFormat,
  normalizeToMidnight,
} = require("../utils/dateUtils");

// Helper to recalculate pending EMIs when principal changes
const recalculatePendingEMIs = async (interestLoanId) => {
  const InterestLoan = require("../models/InterestLoan");
  const InterestEMI = require("../models/InterestEMI");
  
  const loan = await InterestLoan.findById(interestLoanId);
  if (!loan) return;

  const pendingEmis = await InterestEMI.find({
    interestLoanId: loan._id,
    status: { $in: ["Pending", "Partially Paid"] },
  });

  for (const emi of pendingEmis) {
    const newInterestAmount = Math.ceil(
      loan.remainingPrincipalAmount * (loan.interestRate / 100)
    );
    emi.interestAmount = newInterestAmount;
    
    // Re-evaluate status if interest amount changed
    if (emi.amountPaid >= emi.interestAmount) {
      emi.status = "Paid";
    } else if (emi.amountPaid > 0) {
      emi.status = "Partially Paid";
    } else {
      emi.status = "Pending";
    }
    
    await emi.save();
  }
};

// Create Interest Loan
exports.createInterestLoan = asyncHandler(async (req, res, next) => {
  const {
    loanNumber,
    customerName,
    address,
    ownRent,
    mobileNumbers,
    panNumber,
    aadharNumber,
    guarantorName,
    guarantorMobileNumbers,
    principalAmount,
    interestRate,
    processingFeeRate,
    processingFee,
    startDate,
    emiStartDate,
    disbursement,
    principalPayments,
    paymentMode,
    remarks,
  } = req.body;

  if (!loanNumber) {
    return next(new ErrorHandler("Loan number is required", 400));
  }

  const existingLoan = await InterestLoan.findOne({ loanNumber });
  if (existingLoan) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  const initialP = (disbursement || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || parseFloat(principalAmount) || 0;
  const paidP = (principalPayments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remainingP = initialP - paidP;
  const r = parseFloat(interestRate) || 0;
  const fee = parseFloat(processingFee) || 0;

  const interestLoan = await InterestLoan.create({
    loanNumber,
    customerName,
    address,
    ownRent,
    mobileNumbers,
    panNumber,
    aadharNumber,
    guarantorName,
    guarantorMobileNumbers,
    initialPrincipalAmount: initialP,
    remainingPrincipalAmount: remainingP,
    interestRate: r,
    processingFeeRate: parseFloat(processingFeeRate) || 0,
    processingFee: fee,
    startDate: startDate || new Date(),
    emiStartDate: emiStartDate || new Date(),
    disbursement: disbursement || [],
    principalPayments: principalPayments || [],
    createdBy: req.user._id,
    paymentMode: paymentMode || "Cash",
    status: remainingP <= 0 ? "Closed" : (req.body.status || "Active"),
    remarks,
  });

  // Generate EMIs from emiStartDate until today (Catch-up loop)
  const today = normalizeToMidnight(new Date());
  let currentEmiDate = normalizeToMidnight(new Date(interestLoan.emiStartDate));
  let emiNum = 1;

  while (emiNum === 1 || currentEmiDate <= today) {
    const emiInterestAmount = Math.ceil(interestLoan.remainingPrincipalAmount * (r / 100));
    const isFirst = emiNum === 1;
    const disbursementDate = normalizeToMidnight(new Date(interestLoan.startDate));
    const firstEmiDate = normalizeToMidnight(new Date(interestLoan.emiStartDate));
    const shouldAutoPay = isFirst && disbursementDate.getTime() === firstEmiDate.getTime();

    const emi = await InterestEMI.create({
      interestLoanId: interestLoan._id,
      loanNumber: interestLoan.loanNumber,
      customerName: interestLoan.customerName,
      emiNumber: emiNum,
      dueDate: new Date(currentEmiDate),
      interestAmount: emiInterestAmount,
      amountPaid: shouldAutoPay ? emiInterestAmount : 0,
      status: shouldAutoPay ? "Paid" : "Pending",
      paymentDate: shouldAutoPay ? new Date(interestLoan.startDate) : null,
      paymentMode: shouldAutoPay ? paymentMode || "Cash" : "",
      remarks: shouldAutoPay ? "Auto-paid First EMI" : "",
      paymentHistory: shouldAutoPay
        ? [
            {
              amount: emiInterestAmount,
              mode: paymentMode || "Cash",
              date: new Date(interestLoan.startDate),
              addedBy: req.user._id,
            },
          ]
        : [],
      updatedBy: shouldAutoPay ? req.user._id : undefined,
    });

    if (shouldAutoPay) {
      // Create Payment record for auto-paid first EMI
      await Payment.create({
        emiId: emi._id,
        loanId: interestLoan._id,
        loanModel: "InterestLoan",
        amount: emiInterestAmount,
        mode: paymentMode || "Cash",
        paymentDate: new Date(interestLoan.startDate),
        paymentType: "Interest",
        status: "Success",
        remarks: "Auto-paid First EMI",
        collectedBy: req.user._id,
      });
    }

    emiNum++;
    currentEmiDate = addMonths(currentEmiDate, 1);
    if (emiNum > 120) break; // Safety break
  }

  // Create Payment record for processing fee if applicable
  if (fee > 0) {
    await Payment.create({
      loanId: interestLoan._id,
      loanModel: "InterestLoan",
      amount: fee,
      mode: "Cash",
      paymentDate: interestLoan.startDate || new Date(),
      paymentType: "Processing Fee",
      status: "Success",
      remarks: "Interest Loan Processing Fee",
      collectedBy: req.user._id,
    });
  }

  sendResponse(res, 201, "success", "Interest loan created successfully", null, interestLoan);
});

// Get All Interest Loans
exports.getAllInterestLoans = asyncHandler(async (req, res, next) => {
  const { searchQuery, status, customerName, loanNumber, mobileNumber, page = 1, limit = 25 } = req.query;
  const query = {};

  if (status && status !== "undefined" && status !== "null") {
    query.status = status;
  }
  
  if (customerName) {
    query.customerName = { $regex: customerName, $options: "i" };
  }

  if (loanNumber) {
    query.loanNumber = { $regex: loanNumber, $options: "i" };
  }

  if (mobileNumber) {
    query.mobileNumbers = { $regex: mobileNumber, $options: "i" };
  }

  if (searchQuery && searchQuery !== "undefined" && searchQuery !== "null") {
    query.$or = [
      { loanNumber: { $regex: searchQuery, $options: "i" } },
      { customerName: { $regex: searchQuery, $options: "i" } },
      { mobileNumbers: { $regex: searchQuery, $options: "i" } },
      { guarantorName: { $regex: searchQuery, $options: "i" } },
      { guarantorMobileNumbers: { $regex: searchQuery, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const total = await InterestLoan.countDocuments(query);

  let sortConfig = { createdAt: -1 };
  let collationConfig = null;

  if (searchQuery && searchQuery !== "undefined" && searchQuery !== "null") {
    sortConfig = { loanNumber: 1 };
    collationConfig = { locale: "en", numericOrdering: true };
  }

  const findQuery = InterestLoan.find(query)
    .sort(sortConfig)
    .skip(skip)
    .limit(Number(limit));

  if (collationConfig) {
    findQuery.collation(collationConfig);
  }

  const loans = await findQuery.lean();

  sendResponse(res, 200, "success", "Interest loans fetched successfully", null, {
    loans,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get Interest Loan Details
exports.getInterestLoanById = asyncHandler(async (req, res, next) => {
  const loan = await InterestLoan.findById(req.params.id)
    .populate("createdBy", "name")
    .populate("updatedBy", "name");

  if (!loan) {
    return next(new ErrorHandler("Interest loan not found", 404));
  }

  let emis = await InterestEMI.find({ interestLoanId: loan._id })
    .populate("updatedBy", "name")
    .populate("approvedBy", "name")
    .sort({
      emiNumber: 1,
    });

  // Self-healing: Ensure at least one pending or paid EMI exists, and if the last one is paid, generate the next one
  if (loan.status && loan.status.toLowerCase() === "active") {
    if (emis.length === 0) {
      const disbursementDate = normalizeToMidnight(new Date(loan.startDate));
      const firstEmiDate = normalizeToMidnight(new Date(loan.emiStartDate));
      const shouldAutoPay = disbursementDate.getTime() === firstEmiDate.getTime();
      const firstAmount = Math.ceil(loan.initialPrincipalAmount * (loan.interestRate / 100));

      const newEmi = await InterestEMI.create({
        interestLoanId: loan._id,
        loanNumber: loan.loanNumber,
        customerName: loan.customerName,
        emiNumber: 1,
        dueDate: new Date(loan.emiStartDate),
        interestAmount: firstAmount,
        amountPaid: shouldAutoPay ? firstAmount : 0,
        status: shouldAutoPay ? "Paid" : "Pending",
        paymentDate: shouldAutoPay ? new Date(loan.startDate) : null,
        paymentMode: shouldAutoPay ? loan.paymentMode || "Cash" : "",
        remarks: shouldAutoPay ? "Auto-paid First EMI" : "",
        paymentHistory: shouldAutoPay
          ? [
              {
                amount: firstAmount,
                mode: loan.paymentMode || "Cash",
                date: new Date(loan.startDate),
                addedBy: req.user._id,
              },
            ]
          : [],
      });

      if (shouldAutoPay) {
        const Payment = require("../models/Payment");
        await Payment.create({
          emiId: newEmi._id,
          loanId: loan._id,
          loanModel: "InterestLoan",
          amount: firstAmount,
          mode: loan.paymentMode || "Cash",
          paymentDate: new Date(loan.startDate),
          paymentType: "Interest",
          status: "Success",
          remarks: "Auto-paid First EMI",
          collectedBy: req.user._id,
        });
      }
      emis = [newEmi];
    } else {
      let lastEmi = emis[emis.length - 1];
      const today = normalizeToMidnight(new Date());

      // Catch up with missing EMIs if the last one is paid and we're not yet in the future
      while (
        lastEmi.status === "Paid" &&
        normalizeToMidnight(new Date(lastEmi.dueDate)) <= today
      ) {
        const nextDueDate = addMonths(new Date(lastEmi.dueDate), 1);
        const nextInterestAmount = Math.ceil(
          loan.remainingPrincipalAmount * (loan.interestRate / 100)
        );

        const newEmi = await InterestEMI.create({
          interestLoanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          emiNumber: lastEmi.emiNumber + 1,
          dueDate: nextDueDate,
          interestAmount: nextInterestAmount,
          status: "Pending",
        });
        emis.push(newEmi);
        lastEmi = newEmi;

        if (lastEmi.emiNumber > 500) break; // Safety break
      }
    }
  }

  // Fetch pending approvals for these EMIs in batch
  const Approval = require("../models/Approval");
  const emiIds = emis.map((e) => e._id);
  const pendingApprovals = await Approval.find({
    targetId: { $in: emiIds },
    status: "Pending",
  });

  const pendingMap = {};
  pendingApprovals.forEach((a) => {
    pendingMap[a.targetId.toString()] = a.requestedData;
  });

  const emisWithPending = emis.map((emi) => {
    const emiObj = typeof emi.toObject === "function" ? emi.toObject() : emi;
    if (pendingMap[emiObj._id.toString()]) {
      emiObj.pendingApproval = pendingMap[emiObj._id.toString()];
    }
    return emiObj;
  });

  sendResponse(res, 200, "success", "Interest loan fetched successfully", null, {
    loan,
    emis: emisWithPending,
  });
});

// Add Principal Payment
exports.addPrincipalPayment = asyncHandler(async (req, res, next) => {
  const { amount, paymentMode, paymentDate, remarks } = req.body;
  const loan = await InterestLoan.findById(req.params.id);

  if (!loan) {
    return next(new ErrorHandler("Interest loan not found", 404));
  }

  const pAmount = parseFloat(amount);
  if (isNaN(pAmount) || pAmount <= 0) {
    return next(new ErrorHandler("Invalid payment amount", 400));
  }

  loan.principalPayments.push({
    amount: pAmount,
    paymentMode: paymentMode || "Cash",
    paymentDate: paymentDate || new Date(),
    remarks,
    addedBy: req.user._id,
  });

  loan.remainingPrincipalAmount -= pAmount;
  if (loan.remainingPrincipalAmount <= 0) {
    loan.status = "Closed";
    loan.remainingPrincipalAmount = 0;
  }

  await loan.save();
  
  // Recalculate future EMIs based on the new remaining principal
  await recalculatePendingEMIs(loan._id);

  sendResponse(res, 200, "success", "Principal payment added successfully", null, loan);
});

// Update/Pay Interest EMI
const normalizePaymentMode = (mode) => {
  if (!mode) return "Cash";
  const m = mode.trim().toLowerCase();
  if (m === "cash") return "Cash";
  if (m === "online") return "Online";
  if (m === "cheque") return "Cheque";
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
};

exports.payInterestEMI = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { remarks, dateGroups } = req.body;
  let { overdue } = req.body;

  if (Array.isArray(overdue)) {
    overdue = overdue.map(ov => ({
      ...ov,
      mode: normalizePaymentMode(ov.mode)
    }));
  }

  let emi = await InterestEMI.findById(id);
  if (!emi) {
    return next(new ErrorHandler("Interest EMI record not found", 404));
  }

  // Check for Payment Approval Authority
  const isSuperAdmin = req.user.role === "SUPER_ADMIN";
  const hasApprovalAuthority = req.user.permissions?.paymentApproval;

  if (!isSuperAdmin && !hasApprovalAuthority) {
    // Identify NEW payments (not present in current emi.paymentHistory)
    const currentHistory = emi.paymentHistory || [];
    const newPayments = [];
    
    if (req.body.dateGroups && Array.isArray(req.body.dateGroups)) {
      req.body.dateGroups.forEach(group => {
        (group.payments || []).forEach(p => {
          const match = currentHistory.find(hp => 
            hp.amount === parseFloat(p.amount) && 
            hp.mode === (p.mode || "Cash") && 
            new Date(hp.date).toDateString() === new Date(group.date).toDateString()
          );
          if (!match) {
            newPayments.push({ mode: p.mode || "Cash", amount: parseFloat(p.amount) });
          }
        });
      });
    } else if (req.body.addedAmount) {
       newPayments.push({ mode: req.body.paymentMode || "Cash", amount: parseFloat(req.body.addedAmount) });
    }

    const Approval = require("../models/Approval");
    const existingApproval = await Approval.findOne({
      targetId: emi._id,
      status: "Pending",
    });

    if (existingApproval) {
      existingApproval.requestedData = { 
        ...req.body, 
        emiNumber: emi.emiNumber, 
        loanId: emi.interestLoanId,
        newPayments: newPayments.length > 0 ? newPayments : null
      };
      existingApproval.requestedBy = req.user._id;
      existingApproval.createdAt = Date.now();
      await existingApproval.save();
      return sendResponse(res, 200, "success", "Pending interest payment approval request has been updated", null, existingApproval);
    }

    await Approval.create({
      requestType: "INTEREST_PAYMENT",
      targetId: emi._id,
      targetModel: "InterestEMI",
      loanNumber: emi.loanNumber,
      customerName: emi.customerName || "Customer",
      requestedData: { 
        ...req.body, 
        emiNumber: emi.emiNumber, 
        loanId: emi.interestLoanId,
        newPayments: newPayments.length > 0 ? newPayments : null
      },
      requestedBy: req.user._id,
      status: "Pending",
    });

    // Calculate total amount if dateGroups is present
    let displayAmount = req.body.addedAmount || 0;
    if (req.body.dateGroups && Array.isArray(req.body.dateGroups)) {
      displayAmount = req.body.dateGroups.reduce((total, group) => {
        return total + (group.payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      }, 0);
    }

    // Notify Admins
    const { notifyApprovalCountChange, notifyAdmins } = require("./notificationController");
    await notifyAdmins({
      senderId: req.user._id,
      type: "PAYMENT_REQUEST",
      title: "New Interest EMI Request",
      message: `Employee ${req.user.name} requested approval for Interest EMI of ₹${displayAmount} for loan ${emi.loanNumber} (${emi.customerName}).`,
      data: {
        loanNumber: emi.loanNumber,
        customerName: emi.customerName,
        amount: displayAmount,
        employeeName: req.user.name,
        loanId: emi.interestLoanId,
        loanType: "InterestLoan",
        targetId: emi._id,
      },
    });

    // Notify count change for real-time badge updates
    await notifyApprovalCountChange();

    emi.status = "Waiting for Approval";
    emi.updatedBy = req.user._id;
    await emi.save();

    return sendResponse(res, 200, "success", "Interest payment submitted for approval", null, emi);
  }

  const loan = await InterestLoan.findById(emi.interestLoanId);
  if (!loan) {
    return next(new ErrorHandler("Interest loan not found", 404));
  }

  const originalEmi = await InterestEMI.findById(id).lean();
  const buckets = {};
  const getGroupKey = (date) =>
    normalizeToMidnight(new Date(date)).toISOString();

  const addToBucket = (date, mode, chequeNumber, type, amount, isNew) => {
    const key = getGroupKey(date);
    if (!buckets[key]) {
      buckets[key] = {
        date: normalizeToMidnight(new Date(date)),
        modes: new Set(),
        chequeNumbers: new Set(),
        emiDelta: 0,
        overdueDelta: 0,
      };
    }
    const val = parseFloat(amount) || 0;
    if (type === "EMI") buckets[key].emiDelta += isNew ? val : -val;
    else buckets[key].overdueDelta += isNew ? val : -val;

    if (isNew && val > 0) {
      if (mode) buckets[key].modes.add(normalizePaymentMode(mode));
      if (chequeNumber) buckets[key].chequeNumbers.add(chequeNumber);
    }
  };

  if (dateGroups && Array.isArray(dateGroups)) {
    emi.paymentHistory = [];
    dateGroups.forEach((group) => {
      if (group.date && group.payments) {
        group.payments.forEach((p) => {
          const amount = parseFloat(p.amount);
          if (amount > 0) {
            const normalizedMode = normalizePaymentMode(p.mode);
            emi.paymentHistory.push({
              amount: amount,
              mode: normalizedMode,
              chequeNumber: p.chequeNumber || "",
              date: new Date(group.date),
              addedBy: req.user._id,
            });
            addToBucket(group.date, normalizedMode, p.chequeNumber, "EMI", amount, true);
          }
        });
      }
    });
  }

  if (overdue !== undefined) emi.overdue = overdue;
  if (remarks !== undefined) emi.remarks = remarks;

  if (Array.isArray(originalEmi.paymentHistory)) {
    originalEmi.paymentHistory.forEach((p) =>
      addToBucket(p.date, p.mode, p.chequeNumber, "EMI", p.amount, false)
    );
  }
  if (Array.isArray(originalEmi.overdue)) {
    originalEmi.overdue.forEach((p) =>
      addToBucket(p.date, p.mode, p.chequeNumber, "Overdue", p.amount, false)
    );
  }

  if (Array.isArray(emi.paymentHistory)) {
    emi.paymentHistory.forEach((p) =>
      addToBucket(p.date, p.mode, p.chequeNumber, "EMI", p.amount, true)
    );
  }
  if (Array.isArray(emi.overdue)) {
    emi.overdue.forEach((p) =>
      addToBucket(p.date, p.mode, p.chequeNumber, "Overdue", p.amount, true)
    );
  }

  for (const key in buckets) {
    const { date, modes, chequeNumbers, emiDelta, overdueDelta } = buckets[key];
    const totalDelta = emiDelta + overdueDelta;

    if (totalDelta !== 0 || emiDelta !== 0 || overdueDelta !== 0) {
      const combinedMode = modes.size > 0 ? Array.from(modes).join(", ") : "Cash";
      const combinedChequeNo = chequeNumbers.size > 0 ? Array.from(chequeNumbers).join(", ") : "";

      await Payment.create({
        emiId: emi._id,
        loanId: emi.interestLoanId,
        loanModel: "InterestLoan",
        amount: totalDelta,
        mode: combinedMode,
        chequeNumber: combinedChequeNo,
        paymentDate: date,
        paymentType: "Interest",
        status: "Success",
        remarks: remarks || "",
        collectedBy: req.user._id,
      });
    }
  }

  const newAmountPaid = emi.paymentHistory.reduce((acc, curr) => acc + curr.amount, 0);
  emi.amountPaid = newAmountPaid;

  const oldStatus = originalEmi.status;
  if (emi.amountPaid >= emi.interestAmount) {
    emi.status = "Paid";
    emi.paymentDate = emi.paymentHistory.length > 0 ? emi.paymentHistory[emi.paymentHistory.length - 1].date : new Date();
  } else if (emi.amountPaid > 0) {
    emi.status = "Partially Paid";
  } else {
    const hasOverdue = emi.overdue && Array.isArray(emi.overdue) && emi.overdue.some((ov) => parseFloat(ov.amount) > 0);
    emi.status = hasOverdue ? "Overdue" : "Pending";
  }

  emi.updatedBy = req.user._id;

  if (Array.isArray(emi.paymentHistory)) {
    emi.paymentMode = [...new Set(emi.paymentHistory.map((p) => p.mode).filter(Boolean)),].join(", ");
  }

  await emi.save();

  if (emi.status === "Paid" && oldStatus !== "Paid") {
    const nextEmi = await InterestEMI.findOne({
      interestLoanId: loan._id,
      emiNumber: emi.emiNumber + 1,
    });

    if (!nextEmi && loan.status && loan.status.toLowerCase() === "active") {
      const nextDueDate = addMonths(new Date(emi.dueDate), 1);
      const nextInterestAmount = Math.ceil(
        loan.remainingPrincipalAmount * (loan.interestRate / 100)
      );

      await InterestEMI.create({
        interestLoanId: loan._id,
        loanNumber: loan.loanNumber,
        customerName: loan.customerName,
        emiNumber: emi.emiNumber + 1,
        dueDate: nextDueDate,
        interestAmount: nextInterestAmount,
        status: "Pending",
      });
    }
  }

  sendResponse(res, 200, "success", "Interest EMI updated successfully", null, emi);
});

// Get Pending Interest Payments
exports.getInterestPendingPayments = asyncHandler(async (req, res, next) => {
  const { searchQuery, page = 1, limit = 25 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const query = {};
  if (searchQuery && searchQuery !== "undefined" && searchQuery !== "null") {
    query.$or = [
      { loanNumber: { $regex: searchQuery, $options: "i" } },
      { customerName: { $regex: searchQuery, $options: "i" } },
      { mobileNumbers: { $regex: searchQuery, $options: "i" } },
      { guarantorName: { $regex: searchQuery, $options: "i" } },
      { guarantorMobileNumbers: { $regex: searchQuery, $options: "i" } },
    ];
  }

  const result = await InterestLoan.aggregate([
    { $match: { ...query, status: { $ne: "Closed" } } },
    { $lookup: { from: "interestemis", localField: "_id", foreignField: "interestLoanId", as: "emis" } },
    { $lookup: { from: "users", localField: "updatedBy", foreignField: "_id", as: "updatedByInfo" } },
    { $addFields: { updatedBy: { $arrayElemAt: ["$updatedByInfo", 0] } } },
    { $addFields: { pendingEmisList: { $filter: { input: "$emis", as: "emi", cond: { $and: [{ $ne: ["$$emi.status", "Paid"] }, { $lte: ["$$emi.dueDate", now] }] } } } } },
    { $match: { $expr: { $gt: [{ $size: "$pendingEmisList" }, 0] } } },
    {
      $project: {
        loanId: "$_id",
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        status: 1,
        unpaidMonths: { $size: "$pendingEmisList" },
        initialPrincipalAmount: 1,
        totalDueAmount: {
          $reduce: {
            input: "$pendingEmisList",
            initialValue: 0,
            in: {
              $add: ["$$value", { $subtract: [{ $toDouble: "$$this.interestAmount" }, { $toDouble: { $ifNull: ["$$this.amountPaid", 0] } }] }]
            }
          }
        },
        penalOverdue: {
          $reduce: {
            input: "$emis",
            initialValue: 0,
            in: { $add: ["$$value", { $sum: { $ifNull: ["$$this.overdue.amount", [0]] } }] }
          }
        },
        earliestDueDate: { $min: "$pendingEmisList.dueDate" },
        earliestEmiId: { $let: { vars: { overdueEmi: { $arrayElemAt: ["$pendingEmisList", 0] } }, in: { $toString: "$$overdueEmi._id" } } },
        clientResponse: 1,
        nextFollowUpDate: 1,
        updatedBy: { _id: 1, name: 1 },
        updatedAt: 1,
        loanModel: { $literal: "InterestLoan" },
      }
    },
    { $sort: { earliestDueDate: 1 } },
    { $facet: { payments: [{ $skip: skip }, { $limit: Number(limit) }], totalCount: [{ $count: "count" }] } }
  ]);

  const payments = result[0].payments;
  const total = result[0].totalCount[0]?.count || 0;

  sendResponse(res, 200, "success", "Interest pending payments fetched successfully", null, {
    pendingPayments: payments,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
  });
});

// Update Loan basic details
exports.updateInterestLoan = asyncHandler(async (req, res, next) => {
  let loan = await InterestLoan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // If employee, create approval request instead of saving directly
  const isSuperAdmin = req.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin) {
    const { computeLoanDiff } = require("../utils/loanDiff");
    const Approval = require("../models/Approval");
    const { notifyAdmins } = require("./notificationController");

    // Always save clientResponse and nextFollowUpDate directly
    const clientDirectUpdate = {};
    if (req.body.clientResponse !== undefined) clientDirectUpdate.clientResponse = req.body.clientResponse;
    if (req.body.nextFollowUpDate !== undefined) clientDirectUpdate.nextFollowUpDate = req.body.nextFollowUpDate ? new Date(req.body.nextFollowUpDate) : null;
    if (Object.keys(clientDirectUpdate).length > 0) {
      clientDirectUpdate.updatedBy = req.user._id;
      await InterestLoan.findByIdAndUpdate(req.params.id, { $set: clientDirectUpdate });
    }

    const changes = computeLoanDiff(loan, req.body);
    if (changes.length === 0) {
      return sendResponse(res, 200, "success", "No changes detected", null, loan);
    }

    await Approval.create({
      requestType: "LOAN_EDIT",
      targetId: loan._id,
      targetModel: "InterestLoan",
      loanNumber: loan.loanNumber,
      customerName: loan.customerName || "—",
      requestedBy: req.user._id,
      requestedData: { changes, newValues: req.body },
      status: "Pending",
    });

    await notifyAdmins({
      senderId: req.user._id,
      type: "LOAN_EDIT_REQUEST",
      title: "Loan Edit Approval Request",
      message: `Employee ${req.user.name} requested changes to loan ${loan.loanNumber} (${loan.customerName || "—"}). ${changes.length} field(s) changed.`,
      data: { loanNumber: loan.loanNumber, changes },
    });

    return sendResponse(res, 200, "success", "Changes submitted for approval", null, loan);
  }

  const oldEmiStartDate = loan.emiStartDate ? new Date(loan.emiStartDate).toISOString().split("T")[0] : null;
  const newEmiStartDate = req.body.emiStartDate ? new Date(req.body.emiStartDate).toISOString().split("T")[0] : null;
  const dateChanged = newEmiStartDate && oldEmiStartDate && newEmiStartDate !== oldEmiStartDate;

  if (dateChanged) {
    const oldDate = normalizeToMidnight(new Date(loan.emiStartDate));
    const newDate = normalizeToMidnight(new Date(req.body.emiStartDate));
    const monthDiff = differenceInCalendarMonths(newDate, oldDate);

    const emis = await InterestEMI.find({ interestLoanId: loan._id }).sort({ emiNumber: 1 });

    if (emis.length > 0) {
      for (const emi of emis) {
        emi.dueDate = addMonths(new Date(emi.dueDate), monthDiff);
        await emi.save();
      }

      const today = normalizeToMidnight(new Date());
      let lastEmi = emis[emis.length - 1];
      let currentEmiDate = addMonths(new Date(lastEmi.dueDate), 1);
      let emiNum = lastEmi.emiNumber + 1;

      const r = parseFloat(req.body.interestRate || loan.interestRate) || 0;
      const initialP = (req.body.disbursement || loan.disbursement || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || loan.initialPrincipalAmount || 0;

      while (currentEmiDate <= today) {
        const emiInterestAmount = Math.ceil(initialP * (r / 100));
        await InterestEMI.create({
          interestLoanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: req.body.customerName || loan.customerName,
          emiNumber: emiNum,
          dueDate: new Date(currentEmiDate),
          interestAmount: emiInterestAmount,
          status: "Pending",
        });
        emiNum++;
        currentEmiDate = addMonths(currentEmiDate, 1);
        if (emiNum > 120) break;
      }
    } else {
      // standard generation loop
      const today = normalizeToMidnight(new Date());
      let currentEmiDate = normalizeToMidnight(new Date(req.body.emiStartDate));
      const r = parseFloat(req.body.interestRate || loan.interestRate) || 0;
      const initialP = (req.body.disbursement || loan.disbursement || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) || loan.initialPrincipalAmount || 0;
      let emiNum = 1;
      while (emiNum === 1 || currentEmiDate <= today) {
        const emiInterestAmount = Math.ceil(initialP * (r / 100));
        const isFirst = emiNum === 1;
        const disbursementDate = normalizeToMidnight(new Date(req.body.startDate || loan.startDate));
        const firstEmiDate = normalizeToMidnight(new Date(req.body.emiStartDate || loan.emiStartDate));
        const shouldAutoPay = isFirst && disbursementDate.getTime() === firstEmiDate.getTime();

        const emi = await InterestEMI.create({
          interestLoanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: req.body.customerName || loan.customerName,
          emiNumber: emiNum,
          dueDate: new Date(currentEmiDate),
          interestAmount: emiInterestAmount,
          amountPaid: shouldAutoPay ? emiInterestAmount : 0,
          status: shouldAutoPay ? "Paid" : "Pending",
          paymentDate: shouldAutoPay ? new Date(req.body.startDate || loan.startDate) : null,
          paymentMode: shouldAutoPay ? req.body.paymentMode || loan.paymentMode || "Cash" : "",
          remarks: shouldAutoPay ? "Auto-paid First EMI" : "",
          paymentHistory: shouldAutoPay ? [{ amount: emiInterestAmount, mode: req.body.paymentMode || loan.paymentMode || "Cash", date: new Date(req.body.startDate || loan.startDate), addedBy: req.user._id }] : [],
          updatedBy: shouldAutoPay ? req.user._id : undefined,
        });

        if (shouldAutoPay) {
          const Payment = require("../models/Payment");
          await Payment.create({ emiId: emi._id, loanId: loan._id, loanModel: "InterestLoan", amount: emiInterestAmount, mode: req.body.paymentMode || loan.paymentMode || "Cash", paymentDate: new Date(req.body.startDate || loan.startDate), paymentType: "Interest", status: "Success", remarks: "Auto-paid First EMI", collectedBy: req.user._id });
        }
        emiNum++;
        currentEmiDate = addMonths(currentEmiDate, 1);
        if (emiNum > 120) break;
      }
    }
  }

  if (req.body.disbursement || req.body.principalPayments) {
    const initialP = (req.body.disbursement || loan.disbursement || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const paidP = (req.body.principalPayments || loan.principalPayments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    req.body.initialPrincipalAmount = initialP;
    req.body.remainingPrincipalAmount = initialP - paidP;
    if (req.body.remainingPrincipalAmount <= 0) req.body.status = "Closed";
  }

  req.body.updatedBy = req.user._id;
  const updatedLoan = await InterestLoan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await recalculatePendingEMIs(updatedLoan._id);
  sendResponse(res, 200, "success", "Loan updated successfully", null, updatedLoan);
});

// Get Interest Followup Loans
exports.getInterestFollowupLoans = asyncHandler(async (req, res, next) => {
  const { customerName, loanNumber, mobileNumber, nextFollowUpDate, startDate, endDate, page = 1, limit = 25 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const query = {};
  if (customerName) query.customerName = { $regex: customerName, $options: "i" };
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (mobileNumber) query.mobileNumbers = { $regex: mobileNumber, $options: "i" };

  if (startDate && endDate) {
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    query.nextFollowUpDate = { $gte: start, $lte: end };
  } else {
    const dateToFilter = nextFollowUpDate || new Date().toISOString().split("T")[0];
    const start = new Date(dateToFilter); start.setHours(0, 0, 0, 0);
    const end = new Date(dateToFilter); end.setHours(23, 59, 59, 999);
    query.nextFollowUpDate = { $gte: start, $lte: end };
  }

  const result = await InterestLoan.aggregate([
    { $match: { ...query, status: { $ne: "Closed" } } },
    { $lookup: { from: "interestemis", localField: "_id", foreignField: "interestLoanId", as: "emis" } },
    { $addFields: { pendingEmisList: { $filter: { input: "$emis", as: "emi", cond: { $ne: ["$$emi.status", "Paid"] } } } } },
    {
      $project: {
        loanId: "$_id", loanNumber: 1, customerName: 1, mobileNumbers: 1, status: 1,
        unpaidMonths: { $cond: { if: { $gt: [{ $size: "$pendingEmisList" }, 0] }, then: { $size: "$pendingEmisList" }, else: 1 } },
        totalDueAmount: {
          $let: {
            vars: {
              sumOverdue: { $reduce: { input: "$pendingEmisList", initialValue: 0, in: { $add: ["$$value", { $subtract: [{ $toDouble: "$$this.interestAmount" }, { $toDouble: "$$this.amountPaid" }] }] } } },
              nextEmi: { $arrayElemAt: [{ $filter: { input: "$emis", as: "e", cond: { $ne: ["$$e.status", "Paid"] } } }, 0] },
            },
            in: { $cond: { if: { $gt: [{ $size: "$pendingEmisList" }, 0] }, then: "$$sumOverdue", else: { $subtract: [{ $toDouble: { $ifNull: ["$$nextEmi.interestAmount", 0] } }, { $toDouble: { $ifNull: ["$$nextEmi.amountPaid", 0] } }] } } }
          }
        },
        earliestDueDate: { $let: { vars: { overdueMin: { $min: "$pendingEmisList.dueDate" }, anyPending: { $arrayElemAt: [{ $sortArray: { input: { $filter: { input: "$emis", as: "e", cond: { $ne: ["$$e.status", "Paid"] } } }, sortBy: { dueDate: 1 } } }, 0] } }, in: { $ifNull: ["$$overdueMin", "$$anyPending.dueDate"] } } },
        earliestEmiId: { $let: { vars: { overdueMin: { $arrayElemAt: [{ $sortArray: { input: "$pendingEmisList", sortBy: { dueDate: 1 } } }, 0] }, anyPending: { $arrayElemAt: [{ $sortArray: { input: { $filter: { input: "$emis", as: "e", cond: { $ne: ["$$e.status", "Paid"] } } }, sortBy: { dueDate: 1 } } }, 0] } }, in: { $toString: { $ifNull: ["$$overdueMin._id", "$$anyPending._id"] } } } },
        clientResponse: 1, nextFollowUpDate: 1, loanModel: { $literal: "InterestLoan" },
      }
    },
    { $sort: { earliestDueDate: 1 } },
    { $facet: { payments: [{ $skip: skip }, { $limit: Number(limit) }], totalCount: [{ $count: "count" }] } }
  ]);

  const payments = result[0].payments;
  const total = result[0].totalCount[0]?.count || 0;

  sendResponse(res, 200, "success", "Interest follow-up loans fetched successfully", null, {
    payments,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
  });
});

// Delete Interest Loan
exports.deleteInterestLoan = asyncHandler(async (req, res, next) => {
  const loan = await InterestLoan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }
  await InterestEMI.deleteMany({ interestLoanId: loan._id });
  await Payment.deleteMany({ loanId: loan._id, loanModel: "InterestLoan" });
  await loan.deleteOne();
  sendResponse(res, 200, "success", "Interest loan deleted successfully");
});

// Get Interest Pending EMI Details
exports.getInterestPendingEmiDetails = asyncHandler(async (req, res, next) => {
  const emiId = req.params.id;

  // Find the target EMI first to get the loanId
  const targetEmi = await InterestEMI.findById(emiId);
  if (!targetEmi) {
    return next(new ErrorHandler("Installment not found", 404));
  }

  const emiDetails = await InterestEMI.aggregate([
    {
      $match: {
        interestLoanId: targetEmi.interestLoanId,
        status: { $ne: "Paid" },
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
        from: "interestloans",
        localField: "interestLoanId",
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
        loanModel: { $literal: "InterestLoan" },
        loanNumber: "$loan.loanNumber",
        customerName: "$loan.customerName",
        mobileNumbers: "$loan.mobileNumbers",
        guarantorName: "$loan.guarantorName",
        guarantorMobileNumbers: "$loan.guarantorMobileNumbers",
        disbursementAmount: "$loan.initialPrincipalAmount",
        remainingPrincipalAmount: "$loan.remainingPrincipalAmount",
        emiAmount: "$interestAmount",
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
    "Interest EMI details fetched successfully",
    null,
    emiDetails,
  );
});
