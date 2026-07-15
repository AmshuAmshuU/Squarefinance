const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
const Payment = require("../models/Payment");
const ErrorHandler = require("../utils/ErrorHandler");
const { formatLoanResponse } = require("../utils/loanFormatter");
const asyncHandler = require("../utils/asyncHandler");
const { parseDateInLocalFormat, normalizeToMidnight } = require('../utils/dateUtils');
const sendResponse = require("../utils/response");
const { notifyAdmins } = require("./notificationController");

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

const createCustomerLoan = asyncHandler(async (req, res, next) => {
  const {
    loanNumber,
    customerName,
    mobileNumbers,
    alternateMobile,
    address,
    principalAmount,
    annualInterestRate,
    tenureMonths,
    loanStartDate,
    remarks,
    ownRent,
    panNumber,
    aadharNumber,
    processingFee,
    emiStartDate,
    guarantorName,
    guarantorMobileNumbers,
    status,
  } = req.body;

  if (
    !loanNumber ||
    !customerName ||
    !mobileNumbers ||
    mobileNumbers.length === 0 ||
    !address ||
    !principalAmount ||
    !annualInterestRate ||
    !tenureMonths ||
    !loanStartDate
  ) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const existingLoan = await Loan.findOne({ loanNumber });
  if (existingLoan) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  const monthlyEMI = calculateEMI(
    principalAmount,
    annualInterestRate,
    tenureMonths,
  );

  const calculatedTotalInterest =
    parseFloat(principalAmount) *
    (parseFloat(annualInterestRate) / 100) *
    parseInt(tenureMonths);

  const loan = await Loan.create({
    loanNumber,
    customerName,
    mobileNumbers,
    alternateMobile,
    address,
    ownRent,
    panNumber,
    aadharNumber,
    principalAmount,
    processingFee,
    annualInterestRate,
    tenureMonths,
    monthlyEMI,
    totalInterestAmount: calculatedTotalInterest,
    loanStartDate,
    emiStartDate: emiStartDate || loanStartDate,
    remarks,
    guarantorName,
    guarantorMobileNumbers,
    status,
    createdBy: req.user._id,
  });

  // Generate EMIs
  const emis = [];
  let currentEmiDate = new Date(loan.emiStartDate || loan.loanStartDate);

  for (let i = 1; i <= tenureMonths; i++) {
    emis.push({
      loanId: loan._id,
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      emiNumber: i,
      dueDate: new Date(currentEmiDate),
      emiAmount: monthlyEMI,
      status: "Pending",
      overdue: [],
    });
    currentEmiDate.setMonth(currentEmiDate.getMonth() + 1);
  }

  await EMI.insertMany(emis);

  sendResponse(
    res,
    201,
    "success",
    "Customer, Loan and EMIs created successfully",
    null,
    {
      loan: formatLoanResponse(loan),
      emis,
    },
  );
});

const getAllCustomers = asyncHandler(async (req, res, next) => {
  const customers = await Loan.find().sort({ createdAt: -1 });
  sendResponse(
    res,
    200,
    "success",
    "Customers fetched successfully",
    null,
    customers,
  );
});

const getCustomerByLoanNumber = asyncHandler(async (req, res, next) => {
  const customer = await Loan.findOne({ loanNumber: req.params.loanNumber });
  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  const emis = await EMI.find({ loanId: customer._id })
    .sort({ emiNumber: 1 })
    .populate("updatedBy", "name")
    .populate("approvedBy", "name");

  sendResponse(res, 200, "success", "Customer found", null, {
    customer: formatLoanResponse(customer),
    emis,
  });
});

const updateCustomer = asyncHandler(async (req, res, next) => {
  if (
    !mongoose.Types.ObjectId.isValid(req.params.id) ||
    req.params.id === "undefined"
  ) {
    return next(new ErrorHandler("Invalid Customer ID provided", 400));
  }
  let loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan record not found", 404));
  }

  loan = await Loan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  sendResponse(
    res,
    200,
    "success",
    "Customer updated successfully",
    null,
    formatLoanResponse(loan),
  );
});

const updateEMI = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    amountPaid,
    addedAmount,
    paymentMode,
    paymentDate,
    overdue,
    remarks,
    dateGroups,
  } = req.body;

  let emi = await EMI.findById(id);
  if (!emi) {
    return next(new ErrorHandler("EMI record not found", 404));
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
            hp.mode === (p.mode || "CASH") && 
            new Date(hp.date).toDateString() === new Date(group.date).toDateString()
          );
          if (!match) {
            newPayments.push({ mode: p.mode || "CASH", amount: parseFloat(p.amount) });
          }
        });
      });
    } else if (req.body.addedAmount) {
       newPayments.push({ mode: req.body.paymentMode || "CASH", amount: parseFloat(req.body.addedAmount) });
    }

    // Check if there's already a pending approval for this EMI
    const Approval = require("../models/Approval");
    const existingApproval = await Approval.findOne({
      targetId: emi._id,
      status: "Pending",
    });

    if (existingApproval) {
      existingApproval.requestedData = { 
        ...req.body, 
        emiNumber: emi.emiNumber, 
        loanId: emi.loanId,
        newPayments: newPayments.length > 0 ? newPayments : null
      };
      existingApproval.requestedBy = req.user._id;
      existingApproval.createdAt = Date.now();
      await existingApproval.save();
      return sendResponse(res, 200, "success", "Pending approval request has been updated with new data", null, existingApproval);
    }

    // Create Approval Request
    await Approval.create({
      requestType: "EMI_PAYMENT",
      targetId: emi._id,
      targetModel: "EMI",
      loanNumber: emi.loanNumber,
      customerName: emi.customerName || "Customer",
      requestedData: { 
        ...req.body, 
        emiNumber: emi.emiNumber, 
        loanId: emi.loanId,
        newPayments: newPayments.length > 0 ? newPayments : null
      },
      requestedBy: req.user._id,
      status: "Pending",
    });

    // Calculate total amount from all payment sources (EMI dateGroups + overdue payments)
    let displayAmount = 0;
    let displayMode = "";

    // Sum from EMI dateGroups
    if (req.body.dateGroups && Array.isArray(req.body.dateGroups)) {
      req.body.dateGroups.forEach(group => {
        (group.payments || []).forEach(p => {
          displayAmount += parseFloat(p.amount) || 0;
          if (p.mode && !displayMode.includes(p.mode)) {
            displayMode = displayMode ? `${displayMode}, ${p.mode}` : p.mode;
          }
        });
      });
    }

    // Sum from overdue payments
    if (req.body.overdue && Array.isArray(req.body.overdue)) {
      req.body.overdue.forEach(ov => {
        displayAmount += parseFloat(ov.amount) || 0;
        if (ov.mode && !displayMode.includes(ov.mode)) {
          displayMode = displayMode ? `${displayMode}, ${ov.mode}` : ov.mode;
        }
      });
    }

    // Fallback
    if (displayAmount === 0) {
      displayAmount = req.body.addedAmount || req.body.amountPaid || 0;
    }

    // Notify Admins
    const { notifyApprovalCountChange } = require("./notificationController");
    await notifyAdmins({
      senderId: req.user._id,
      type: "PAYMENT_REQUEST",
      title: "New EMI Payment Approval Request",
      message: `Employee ${req.user.name} requested approval for EMI payment of ₹${displayAmount} for loan ${emi.loanNumber} (${emi.customerName}).`,
      data: {
        loanNumber: emi.loanNumber,
        customerName: emi.customerName,
        amount: displayAmount,
        mode: displayMode,
        employeeName: req.user.name,
        loanId: emi.loanId,
        loanType: emi.loanModel || "Loan",
        targetId: emi._id,
      },
    });

    // Notify count change for real-time badge updates
    await notifyApprovalCountChange();

    // Update EMI status to 'Waiting for Approval'
    emi.status = "Waiting for Approval";
    emi.updatedBy = req.user._id;
    await emi.save();

    return sendResponse(res, 200, "success", "Payment submitted for approval", null, emi);
  }

  // CALCULATE DELTAS FOR IMMUTABLE TRANSACTION RECORDING
  const oldEmiSum = parseFloat(emi.amountPaid) || 0;
  const overdueArray = Array.isArray(emi.overdue) ? emi.overdue : [];
  const oldOverdueSum = overdueArray.reduce((acc, ov) => acc + (parseFloat(ov.amount) || 0), 0);

  // Update properties on the document directly (before bucket logic)
  if (overdue !== undefined) emi.overdue = overdue;
  if (remarks !== undefined) emi.remarks = remarks;

  // Process payments from dateGroups if provided
  if (dateGroups && Array.isArray(dateGroups)) {
    emi.paymentHistory = [];
    dateGroups.forEach((group) => {
      if (group.date && group.payments) {
        group.payments.forEach((p) => {
          const amount = parseFloat(p.amount);
          if (amount > 0) {
            emi.paymentHistory.push({
              amount: amount,
              mode: p.mode || "CASH",
              chequeNumber: p.chequeNumber || "",
              date: new Date(group.date),
              addedBy: req.user._id,
            });
          }
        });
      }
    });
  } else if (addedAmount && parseFloat(addedAmount) > 0) {
    emi.paymentHistory.push({
      amount: parseFloat(addedAmount),
      mode: paymentMode || "CASH",
      date: normalizeToMidnight(parseDateInLocalFormat(paymentDate || new Date())),
    });
  }

  // --- GRANULAR MULTI-TRANSACTION LOGIC ---
  const newEmiSum = emi.paymentHistory.reduce((acc, curr) => acc + curr.amount, 0);
  const currentOverdueArray = Array.isArray(overdue) ? overdue : [];
  const newOverdueSum = currentOverdueArray.reduce((acc, ov) => acc + (parseFloat(ov.amount) || 0), 0);

  // 1. Group Old/New by Date Only (to merge different modes in one row per date)
  const getGroupKey = (date) => {
    const d = normalizeToMidnight(new Date(date));
    return d.toISOString();
  };

  // We need the original EMI to get OLD payments/overdue
  // BUT emi is already modified in memory. Let's get the original values we stored.
  // Wait, I need the original objects to compare. I'll use a snapshot.
  
  // NOTE: I already have oldEmiSum and oldOverdueSum. 
  // To be precise about "every transaction", we compare the arrays.
  const changes = []; // Array of { date, mode, emiDelta, overdueDelta }

  // Strategy: Group everything by (date, mode) and calculate deltas for each bucket.
  const buckets = {};
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
      if (mode) buckets[key].modes.add(mode.toUpperCase());
      if (chequeNumber) buckets[key].chequeNumbers.add(chequeNumber);
    }
  };

  // Process Old state (subtract from buckets)
  // We need the original lists. I'll fetch the original EMI data once more or use the emi object before save.
  // Actually, I can just use the memory emi object since I modified it, but I need what it WAS.
  
  // Let's re-fetch the original to be 100% accurate for deltas
  const originalEmi = await EMI.findById(id).lean();
  
  if (Array.isArray(originalEmi.paymentHistory)) {
    originalEmi.paymentHistory.forEach(p => addToBucket(p.date, p.mode, p.chequeNumber, 'EMI', p.amount, false));
  }
  
  if (Array.isArray(originalEmi.overdue)) {
    originalEmi.overdue.forEach(p => addToBucket(p.date, p.mode, p.chequeNumber, 'Overdue', p.amount, false));
  }

  // Process New state (add to buckets)
  if (Array.isArray(emi.paymentHistory)) {
    emi.paymentHistory.forEach(p => addToBucket(p.date, p.mode, p.chequeNumber, 'EMI', p.amount, true));
  }
  
  if (Array.isArray(emi.overdue)) {
    emi.overdue.forEach(p => addToBucket(p.date, p.mode, p.chequeNumber, 'Overdue', p.amount, true));
  }

  // Create Payment records for each bucket with a non-zero delta
  for (const key in buckets) {
    const { date, modes, emiDelta, overdueDelta } = buckets[key];
    const totalDelta = emiDelta + overdueDelta;

    if (totalDelta !== 0 || emiDelta !== 0 || overdueDelta !== 0) {
      const { date, modes, chequeNumbers } = buckets[key];
      const combinedMode = modes.size > 0 ? Array.from(modes).join(", ") : "CASH";
      const combinedChequeNo = chequeNumbers.size > 0 ? Array.from(chequeNumbers).join(", ") : "";

      await Payment.create({
        emiId: emi._id,
        loanId: emi.loanId,
        loanModel: emi.loanModel,
        emiAmount: emiDelta,
        overdueAmount: overdueDelta,
        totalAmount: totalDelta,
        amount: totalDelta, // Legacy fallback
        mode: combinedMode,
        chequeNumber: combinedChequeNo,
        paymentDate: date,
        paymentType:
          emi.loanModel === "DailyLoan"
            ? "Daily"
            : emi.loanModel === "WeeklyLoan"
              ? "Weekly"
              : "Monthly",
        status: "Success",
        collectedBy: req.user._id,
        remarks: remarks || "",
      });
    }
  }

  // Recalculate amountPaid and paymentMode from full history
  const totalPaidFromHistory = emi.paymentHistory.reduce(
    (acc, curr) => acc + curr.amount,
    0,
  );
  // Final values
  const newAmountPaid = totalPaidFromHistory;
  const totalEmiAmount = parseFloat(emi.emiAmount);
  const modesFromHistory = [...new Set(emi.paymentHistory.map((p) => p.mode))]
    .filter(Boolean)
    .join(", ");
  let newStatus;

  if (newAmountPaid >= totalEmiAmount) {
    newStatus = "Paid";
  } else if (newAmountPaid > 0) {
    newStatus = "Partially Paid";
  } else {
    // Check if there are any overdue entries
    const hasOverdue = overdue && Array.isArray(overdue) && overdue.some(ov => parseFloat(ov.amount) > 0);
    newStatus = hasOverdue ? "Overdue" : "Pending";
  }

  // Update properties on the document indirectly (final sync)
  emi.amountPaid = newAmountPaid;
  emi.paymentMode = modesFromHistory || emi.paymentMode || "CASH";
  emi.paymentDate =
    paymentDate ||
    (emi.paymentHistory.length > 0
      ? emi.paymentHistory[emi.paymentHistory.length - 1].date
      : emi.paymentDate);
  emi.status = newStatus;
  emi.updatedBy = req.user._id;

  // Super Admin directly updating acts as both collector and approver
  if (isSuperAdmin || hasApprovalAuthority) {
    emi.approvedBy = req.user._id;
    emi.approvedAt = new Date();
  }

  // Use save() instead of findByIdAndUpdate for reliability with Mongoose arrays
  await emi.save();
  await emi.populate("updatedBy", "name");
  await emi.populate("approvedBy", "name");

  // Sync with WeeklyLoan if applicable
  if (emi.loanModel === "WeeklyLoan") {
    try {
      const WeeklyLoan = require("../models/WeeklyLoan");
      const allEmis = await EMI.find({
        loanId: emi.loanId,
        loanModel: "WeeklyLoan",
      });
      const paidEmisCount = allEmis.filter((e) => e.status === "Paid").length;
      const isAllPaid = allEmis.length > 0 && allEmis.every((e) => e.status === "Paid");

      const weeklyLoan = await WeeklyLoan.findById(emi.loanId);
      if (weeklyLoan) {
        weeklyLoan.paidEmis = paidEmisCount;
        
        // Update odAmount
        const totalOdAmount = allEmis.reduce((acc, currentEmi) => {
          if (Array.isArray(currentEmi.overdue)) {
            return acc + currentEmi.overdue.reduce((oAcc, ov) => oAcc + (parseFloat(ov.amount) || 0), 0);
          }
          return acc + (parseFloat(currentEmi.overdue) || 0);
        }, 0);
        weeklyLoan.odAmount = totalOdAmount;

        // Recalculate totalCollected from actual EMI payment records + processing fee
        const totalEmiCollected = allEmis.reduce((acc, currentEmi) => {
          const emiPaid = (currentEmi.paymentHistory || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
          const emiOd = (currentEmi.overdue || []).reduce((s, ov) => s + (parseFloat(ov.amount) || 0), 0);
          return acc + emiPaid + emiOd;
        }, 0);
        weeklyLoan.totalCollected = Math.ceil(totalEmiCollected + (weeklyLoan.processingFee || 0));

        // Update remainingPrincipalAmount based on paid EMIs
        const weeklyEmiAmount = weeklyLoan.emiAmount || 0;
        const weeklyPaidCount = paidEmisCount;
        weeklyLoan.remainingPrincipalAmount = Math.max(0, Math.ceil(
          (weeklyLoan.disbursementAmount || 0) - weeklyEmiAmount * weeklyPaidCount
        ));

        // Auto-close only if ALL EMIs are paid AND remaining principal is 0
        const shouldCloseWeekly = isAllPaid && weeklyLoan.remainingPrincipalAmount === 0;
        if (shouldCloseWeekly) {
          weeklyLoan.status = "Closed";
        } else if (weeklyLoan.status === "Closed" && !shouldCloseWeekly) {
          weeklyLoan.status = "Active";
        }
        await weeklyLoan.save();
      }
    } catch (err) {
      console.error("Error syncing WeeklyLoan EMIs:", err);
    }
  }

  // Sync with DailyLoan if applicable
  if (emi.loanModel === "DailyLoan") {
    try {
      const DailyLoan = require("../models/DailyLoan");
      const allEmis = await EMI.find({
        loanId: emi.loanId,
        loanModel: "DailyLoan",
      });
      const paidEmisCount = allEmis.filter((e) => e.status === "Paid").length;
      const isAllPaid = allEmis.length > 0 && allEmis.every((e) => e.status === "Paid");

      const dailyLoan = await DailyLoan.findById(emi.loanId);
      if (dailyLoan) {
        dailyLoan.paidEmis = paidEmisCount;

        // Update odAmount
        const totalOdAmount = allEmis.reduce((acc, currentEmi) => {
          if (Array.isArray(currentEmi.overdue)) {
            return acc + currentEmi.overdue.reduce((oAcc, ov) => oAcc + (parseFloat(ov.amount) || 0), 0);
          }
          return acc + (parseFloat(currentEmi.overdue) || 0);
        }, 0);
        dailyLoan.odAmount = totalOdAmount;

        // Recalculate totalCollected from actual EMI payment records + processing fee
        const totalEmiCollected = allEmis.reduce((acc, currentEmi) => {
          const emiPaid = (currentEmi.paymentHistory || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
          const emiOd = (currentEmi.overdue || []).reduce((s, ov) => s + (parseFloat(ov.amount) || 0), 0);
          return acc + emiPaid + emiOd;
        }, 0);
        dailyLoan.totalCollected = Math.ceil(totalEmiCollected + (dailyLoan.processingFee || 0));

        // Update remainingPrincipalAmount based on paid EMIs
        const dailyEmiAmount = dailyLoan.emiAmount || 0;
        const dailyPaidCount = paidEmisCount;
        dailyLoan.remainingPrincipalAmount = Math.max(0, Math.ceil(
          (dailyLoan.disbursementAmount || 0) - dailyEmiAmount * dailyPaidCount
        ));

        // Auto-close only if ALL EMIs are paid AND remaining principal is 0
        const shouldCloseDaily = isAllPaid && dailyLoan.remainingPrincipalAmount === 0;
        if (shouldCloseDaily) {
          dailyLoan.status = "Closed";
        } else if (dailyLoan.status === "Closed" && !shouldCloseDaily) {
          dailyLoan.status = "Active";
        }
        await dailyLoan.save();
      }
    } catch (err) {
      console.error("Error syncing DailyLoan EMIs:", err);
    }
  }

  // Sync with main Loan if applicable
  if (emi.loanModel === "Loan" || !emi.loanModel) {
    try {
      const Loan = require("../models/Loan");
      const allEmis = await EMI.find({
        loanId: emi.loanId,
        loanModel: "Loan",
      });

      const isAllPaid = allEmis.length > 0 && allEmis.every((e) => e.status === "Paid");
      const isAnyPaid = allEmis.some(
        (e) => e.status === "Paid" || e.status === "Partially Paid",
      );

      const loan = await Loan.findById(emi.loanId);
      if (loan) {
        if (isAllPaid) {
          loan.paymentStatus = "Paid";
          loan.status = "Closed";
        } else if (isAnyPaid) {
          loan.paymentStatus = "Partially Paid";
          if (loan.status === "Closed") {
            loan.status = "Active";
          }
        } else {
          loan.paymentStatus = "Pending";
          if (loan.status === "Closed") {
            loan.status = "Active";
          }
        }
        // Update odAmount
        const totalOdAmount = allEmis.reduce((acc, currentEmi) => {
          if (Array.isArray(currentEmi.overdue)) {
            return acc + currentEmi.overdue.reduce((oAcc, ov) => oAcc + (parseFloat(ov.amount) || 0), 0);
          }
          return acc + (parseFloat(currentEmi.overdue) || 0);
        }, 0);
        loan.odAmount = totalOdAmount;

        await loan.save();
      }
    } catch (err) {
      console.error("Error syncing main Loan EMIs:", err);
    }
  }

  sendResponse(res, 200, "success", "EMI updated successfully", null, emi);
});

const getAllEMIDetails = asyncHandler(async (req, res, next) => {
  const { loanNumber, customerName, status, mobileNumber, vehicleNumber } =
    req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (status) query.status = { $regex: new RegExp(`^${status}$`, "i") };

  // For mobile and vehicle, we MUST find matching loanIds first because these fields
  // do not exist on the EMI model itself.
  if (mobileNumber || vehicleNumber) {
    const loanFilter = {};
    if (mobileNumber) {
      loanFilter.$or = [
        { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
        { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
      ];
    }
    if (vehicleNumber) {
      loanFilter.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
    }

    const matchingLoans = await Loan.find(loanFilter).select("_id");
    const matchingLoanIds = matchingLoans.map((l) => l._id);

    if (matchingLoanIds.length === 0) {
      // If no loans match the mobile/vehicle filter, ensure no EMIs are found
      // We use a non-existent ID to force an empty result
      query.loanId = new mongoose.Types.ObjectId();
    } else {
      query.loanId = { $in: matchingLoanIds };
    }
  }

  const total = await EMI.countDocuments(query);

  let sortConfig = { updatedAt: -1 };
  let collationConfig = null;

  if (loanNumber) {
    sortConfig = { loanNumber: 1 };
    collationConfig = { locale: "en", numericOrdering: true };
  }

  const aggregatePipeline = [
    { $match: query },
    { $sort: sortConfig },
    { $skip: skip },
    { $limit: limit },
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
        from: "loans",
        localField: "loanId",
        foreignField: "_id",
        as: "loan",
      },
    },
    { $unwind: "$loan" },
    {
      $project: {
        _id: 1,
        loanId: 1,
        loanNumber: 1,
        customerName: 1,
        emiNumber: 1,
        dueDate: 1,
        emiAmount: 1,
        amountPaid: 1,
        paymentDate: 1,
        paymentMode: 1,
        overdue: 1,
        status: 1,
        remarks: 1,
        updatedAt: 1,
        mobileNumbers: "$loan.mobileNumbers",
        guarantorMobileNumbers: "$loan.guarantorMobileNumbers",
        guarantorName: "$loan.guarantorName",
        updatedBy: 1,
        approvedBy: 1,
        approvedAt: 1,
        paymentRecords: 1,
        paymentHistory: 1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "updatedBy",
        foreignField: "_id",
        as: "updatedBy",
      },
    },
    {
      $unwind: {
        path: "$updatedBy",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "approvedBy",
        foreignField: "_id",
        as: "approvedBy",
      },
    },
    {
      $unwind: {
        path: "$approvedBy",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        updatedBy: { $ifNull: ["$updatedBy.name", null] },
        approvedBy: { $ifNull: ["$approvedBy.name", null] },
        approvedAt: 1,
        _id: 1,
        loanId: 1,
        loanNumber: 1,
        customerName: 1,
        emiNumber: 1,
        dueDate: 1,
        emiAmount: 1,
        amountPaid: 1,
        paymentDate: 1,
        paymentMode: 1,
        overdue: 1,
        status: 1,
        remarks: 1,
        updatedAt: 1,
        mobileNumbers: 1,
        guarantorMobileNumbers: 1,
        guarantorName: 1,
        paymentRecords: 1,
        paymentHistory: 1,
      },
    },
  ];

  let emis;
  if (collationConfig) {
    emis = await EMI.aggregate(aggregatePipeline).collation(collationConfig);
  } else {
    emis = await EMI.aggregate(aggregatePipeline);
  }

  sendResponse(res, 200, "success", "EMI details fetched successfully", null, {
    emis,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

const getEMIsByLoanId = asyncHandler(async (req, res, next) => {
  const { loanId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(loanId) || loanId === "undefined") {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }
  const emis = await EMI.find({ loanId }).sort({ emiNumber: 1 }).lean()
    .populate("updatedBy", "name")
    .populate("approvedBy", "name")
    .populate("paymentRecords");

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

  emis.forEach((emi) => {
    if (pendingMap[emi._id.toString()]) {
      emi.pendingApproval = pendingMap[emi._id.toString()];
    }
  });

  sendResponse(res, 200, "success", "EMIs fetched successfully", null, emis);
});

module.exports = {
  createCustomerLoan,
  getAllCustomers,
  getCustomerByLoanNumber,
  updateCustomer,
  updateEMI,
  getAllEMIDetails,
  getEMIsByLoanId,
};
