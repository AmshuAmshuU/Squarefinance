const Approval = require("../models/Approval");
const EMI = require("../models/EMI");
const InterestEMI = require("../models/InterestEMI");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const InterestLoan = require("../models/InterestLoan");
const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const { addMonths } = require("date-fns");
const { sendNotification } = require("./notificationController");

// Mirrors loanController.js's calculateEMI (flat interest) so approved
// LOAN_EDIT changes can recompute monthlyEMI/totalInterestAmount the same way.
const calculateEMI = (principal, roi, tenureMonths) => {
  const p = parseFloat(principal);
  const r = parseFloat(roi);
  const n = parseInt(tenureMonths);
  if (!p || !n) return 0;
  const monthlyInterest = p * (r / 100);
  const monthlyPrincipal = p / n;
  return Math.ceil(monthlyPrincipal + monthlyInterest);
};

// List all pending approvals (Super Admin only)
const getPendingApprovals = asyncHandler(async (req, res, next) => {
  const approvals = await Approval.find({ status: "Pending" })
    .populate("requestedBy", "name")
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "success", "Pending approvals fetched", null, approvals);
});

// Process an approval request
const processApproval = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, remarks } = req.body; // status: "Approved" or "Rejected"

  if (!["Approved", "Rejected"].includes(status)) {
    return next(new ErrorHandler("Invalid status provided", 400));
  }

  const approval = await Approval.findById(id);
  if (!approval) {
    return next(new ErrorHandler("Approval request not found", 404));
  }

  if (approval.status !== "Pending") {
    return next(new ErrorHandler("Approval request already processed", 400));
  }

  approval.status = status;
  approval.remarks = remarks;
  approval.processedBy = req.user._id;
  approval.processedAt = Date.now();

  if (status === "Approved") {
    const { targetId, targetModel, requestedData, requestType } = approval;
    const Payment = require("../models/Payment");

    if (requestType === "EMI_PAYMENT") {
      const emi = await EMI.findById(targetId);
      if (emi) {
        const { remarks, dateGroups, overdue } = requestedData;
        const oldHistory = emi.paymentHistory ? JSON.parse(JSON.stringify(emi.paymentHistory)) : [];
        
        if (dateGroups && Array.isArray(dateGroups)) {
          emi.paymentHistory = [];
          for (const group of dateGroups) {
            if (group.date && group.payments) {
              for (const p of group.payments) {
                const amount = parseFloat(p.amount);
                if (amount > 0) {
                  const paymentDate = new Date(group.date);
                  
                  // Check if this specific payment entry already exists in history to avoid duplicates in Payment collection
                  const isAlreadyRecorded = oldHistory.some(oh => 
                    oh.mode === p.mode && 
                    parseFloat(oh.amount) === amount && 
                    new Date(oh.date).toISOString().split('T')[0] === group.date
                  );

                  emi.paymentHistory.push({
                    amount,
                    mode: p.mode || "Cash",
                    chequeNumber: p.chequeNumber || "",
                    date: paymentDate,
                    addedBy: approval.requestedBy,
                  });

                  // ONLY create a Payment record if it's new
                  if (!isAlreadyRecorded) {
                    let pType = "Monthly";
                    if (emi.loanModel === "DailyLoan") pType = "Daily";
                    else if (emi.loanModel === "WeeklyLoan") pType = "Weekly";

                    await Payment.create({
                      emiId: emi._id,
                      loanId: emi.loanId,
                      loanModel: emi.loanModel || "Loan",
                      amount: amount,
                      emiAmount: amount, // Categorize as EMI amount
                      totalAmount: amount,
                      mode: p.mode || "Cash",
                      chequeNumber: p.chequeNumber || "",
                      paymentDate: paymentDate,
                      paymentType: pType,
                      status: "Success",
                      remarks: remarks || "",
                      collectedBy: approval.requestedBy,
                    });
                  }
                }
              }
            }
          }
        }

        if (overdue !== undefined && Array.isArray(overdue)) {
            const oldOverdue = emi.overdue ? JSON.parse(JSON.stringify(emi.overdue)) : [];
            
            // Create Payment records for new overdue entries
            for (const ov of overdue) {
              const amount = parseFloat(ov.amount);
              if (amount > 0 && ov.date) {
                const ovDateStr = new Date(ov.date).toISOString().split('T')[0];
                const isAlreadyRecorded = oldOverdue.some(oov => 
                   oov.mode === ov.mode && 
                   parseFloat(oov.amount) === amount && 
                   new Date(oov.date).toISOString().split('T')[0] === ovDateStr
                );

                if (!isAlreadyRecorded) {
                   await Payment.create({
                      emiId: emi._id,
                      loanId: emi.loanId,
                      loanModel: emi.loanModel || "Loan",
                      amount: amount,
                      overdueAmount: amount, // Categorize as Overdue amount
                      totalAmount: amount,
                      mode: ov.mode || "Cash",
                      chequeNumber: ov.chequeNumber || "",
                      paymentDate: new Date(ov.date),
                      paymentType: "Overdue",
                      status: "Success",
                      remarks: "Overdue Payment Approved",
                      collectedBy: approval.requestedBy,
                   });
                }
              }
            }
            emi.overdue = overdue;
        }

        const newAmountPaid = emi.paymentHistory.reduce((acc, curr) => acc + curr.amount, 0);
        emi.amountPaid = newAmountPaid;
        emi.paymentMode = [...new Set(emi.paymentHistory.map(ph => ph.mode))].filter(Boolean).join(", ");

        if (emi.amountPaid >= emi.emiAmount) {
          emi.status = "Paid";
          emi.paymentDate = emi.paymentHistory.length > 0 ? emi.paymentHistory[emi.paymentHistory.length - 1].date : new Date();
        } else if (emi.amountPaid > 0) {
          emi.status = "Partially Paid";
        } else {
          emi.status = "Pending";
        }

        emi.remarks = remarks;
        emi.approvedBy = req.user._id;
        emi.approvedAt = Date.now();
        // timestamps:false — updatedBy/updatedAt already correctly reflect the
        // staff member's original submission (set when they submitted for
        // approval); approvedBy/approvedAt are the separate, correct place to
        // record this approval action, so updatedAt must not be bumped here.
        await emi.save({ timestamps: false });

        // Sync WeeklyLoan/DailyLoan counters after approval, derived from
        // actual EMI records (ground truth) - not just totalCollected.
        if (emi.loanModel === "WeeklyLoan" || emi.loanModel === "DailyLoan") {
          const LoanModel = emi.loanModel === "WeeklyLoan" ? WeeklyLoan : DailyLoan;
          const allEmis = await EMI.find({ loanId: emi.loanId, loanModel: emi.loanModel });
          const totalEmiCollected = allEmis.reduce((acc, e) => {
            const emiPaid = (e.paymentHistory || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            const emiOd = (e.overdue || []).reduce((s, ov) => s + (parseFloat(ov.amount) || 0), 0);
            return acc + emiPaid + emiOd;
          }, 0);
          const paidEmisCount = allEmis.filter((e) => e.status === "Paid").length;
          const isAllPaid = allEmis.length > 0 && allEmis.every((e) => e.status === "Paid");
          const parentLoan = await LoanModel.findById(emi.loanId);
          if (parentLoan) {
            const processingFee = parentLoan.processingFee || 0;
            parentLoan.totalCollected = Math.ceil(totalEmiCollected + processingFee);
            parentLoan.paidEmis = paidEmisCount;
            parentLoan.remainingEmis = Math.max(0, (parentLoan.totalEmis || 0) - paidEmisCount);
            const emiAmountForType = parentLoan.emiAmount || 0;
            parentLoan.remainingPrincipalAmount = Math.max(
              0,
              Math.ceil((parentLoan.disbursementAmount || 0) - emiAmountForType * paidEmisCount)
            );

            const shouldClose = isAllPaid && parentLoan.remainingPrincipalAmount === 0;
            if (shouldClose) {
              parentLoan.status = "Closed";
            } else if (parentLoan.status === "Closed" && !shouldClose) {
              parentLoan.status = "Active";
            }
            await parentLoan.save();
          }
        } else if (emi.loanModel === "Loan" || !emi.loanModel) {
          // Sync the parent Vehicle Loan the same way customercontroller.js's
          // direct-save updateEMI path already does - this branch was missing
          // entirely, so a Vehicle EMI payment applied via the approval
          // workflow (as opposed to a direct Super Admin edit) marked the EMI
          // "Paid" but never closed the loan even when every EMI was Paid.
          const allEmis = await EMI.find({ loanId: emi.loanId, loanModel: "Loan" });
          const isAllPaid = allEmis.length > 0 && allEmis.every((e) => e.status === "Paid");
          const isAnyPaid = allEmis.some((e) => e.status === "Paid" || e.status === "Partially Paid");

          const parentLoan = await Loan.findById(emi.loanId);
          if (parentLoan) {
            if (isAllPaid) {
              parentLoan.paymentStatus = "Paid";
              parentLoan.status = "Closed";
            } else if (isAnyPaid) {
              parentLoan.paymentStatus = "Partially Paid";
              if (parentLoan.status === "Closed") {
                parentLoan.status = "Active";
              }
            } else {
              parentLoan.paymentStatus = "Pending";
              if (parentLoan.status === "Closed") {
                parentLoan.status = "Active";
              }
            }
            const totalOdAmount = allEmis.reduce((acc, currentEmi) => {
              if (Array.isArray(currentEmi.overdue)) {
                return acc + currentEmi.overdue.reduce((oAcc, ov) => oAcc + (parseFloat(ov.amount) || 0), 0);
              }
              return acc + (parseFloat(currentEmi.overdue) || 0);
            }, 0);
            parentLoan.odAmount = totalOdAmount;

            await parentLoan.save();
          }
        }
      }
    } else if (requestType === "INTEREST_PAYMENT") {
      const emi = await InterestEMI.findById(targetId);
      if (emi) {
        const { remarks, dateGroups, overdue } = requestedData;
        const oldHistory = emi.paymentHistory ? JSON.parse(JSON.stringify(emi.paymentHistory)) : [];

        if (dateGroups && Array.isArray(dateGroups)) {
          emi.paymentHistory = [];
          for (const group of dateGroups) {
            if (group.date && group.payments) {
              for (const p of group.payments) {
                const amount = parseFloat(p.amount);
                if (amount > 0) {
                  const paymentDate = new Date(group.date);

                  // Check if this specific payment entry already exists in history to avoid duplicates in Payment collection
                  const isAlreadyRecorded = oldHistory.some(oh => 
                    oh.mode === p.mode && 
                    parseFloat(oh.amount) === amount && 
                    new Date(oh.date).toISOString().split('T')[0] === group.date
                  );

                  emi.paymentHistory.push({
                    amount,
                    mode: p.mode || "Cash",
                    chequeNumber: p.chequeNumber || "",
                    date: paymentDate,
                    addedBy: approval.requestedBy,
                  });

                  if (!isAlreadyRecorded) {
                    await Payment.create({
                      emiId: emi._id,
                      loanId: emi.interestLoanId,
                      loanModel: "InterestLoan",
                      amount: amount,
                      emiAmount: amount, // Categorize as EMI amount (Interest)
                      totalAmount: amount,
                      mode: p.mode || "Cash",
                      chequeNumber: p.chequeNumber || "",
                      paymentDate: paymentDate,
                      paymentType: "Interest",
                      status: "Success",
                      remarks: remarks || "",
                      collectedBy: approval.requestedBy,
                    });
                  }
                }
              }
            }
          }
        }

        if (overdue !== undefined && Array.isArray(overdue)) {
            const oldOverdue = emi.overdue ? JSON.parse(JSON.stringify(emi.overdue)) : [];
            
            for (const ov of overdue) {
              const amount = parseFloat(ov.amount);
              if (amount > 0 && ov.date) {
                const ovDateStr = new Date(ov.date).toISOString().split('T')[0];
                const isAlreadyRecorded = oldOverdue.some(oov => 
                   oov.mode === ov.mode && 
                   parseFloat(oov.amount) === amount && 
                   new Date(oov.date).toISOString().split('T')[0] === ovDateStr
                );

                if (!isAlreadyRecorded) {
                   await Payment.create({
                      emiId: emi._id,
                      loanId: emi.interestLoanId,
                      loanModel: "InterestLoan",
                      amount: amount,
                      overdueAmount: amount,
                      totalAmount: amount,
                      mode: ov.mode || "Cash",
                      chequeNumber: ov.chequeNumber || "",
                      paymentDate: new Date(ov.date),
                      paymentType: "Overdue",
                      status: "Success",
                      remarks: "Overdue Interest Payment Approved",
                      collectedBy: approval.requestedBy,
                   });
                }
              }
            }
            emi.overdue = overdue;
        }

        const newAmountPaid = emi.paymentHistory.reduce((acc, curr) => acc + curr.amount, 0);
        emi.paymentMode = [...new Set(emi.paymentHistory.map(ph => ph.mode))].filter(Boolean).join(", ");
        emi.amountPaid = newAmountPaid;

        if (emi.amountPaid >= emi.interestAmount) {
          emi.status = "Paid";
          emi.paymentDate = emi.paymentHistory.length > 0 ? emi.paymentHistory[emi.paymentHistory.length - 1].date : new Date();
        } else if (emi.amountPaid > 0) {
          emi.status = "Partially Paid";
        } else {
          emi.status = "Pending";
        }
        
        emi.remarks = remarks;
        emi.approvedBy = req.user._id;
        emi.approvedAt = Date.now();
        // timestamps:false — same reasoning as the EMI_PAYMENT branch above:
        // don't let this approval save overwrite the staff member's original
        // updatedAt with the approval time.
        await emi.save({ timestamps: false });
      }
    } else if (requestType === "FORECLOSURE") {
      const loan = await Loan.findById(targetId);
      if (loan) {
        const { remainingPrincipal, totalAmount, paymentBreakdown, paymentDate, remarks, paymentMode, chequeNumber, foreclosureChargePercent, foreclosureChargeAmount, od, miscellaneousFee } = requestedData;
        const pDate = paymentDate ? new Date(paymentDate) : new Date();

        loan.status = "Closed";
        loan.paymentStatus = "Closed";
        loan.remarks = remarks || `Foreclosed on ${pDate.toLocaleDateString()}`;
        loan.foreclosedBy = approval.requestedBy;
        loan.foreclosureDate = pDate;
        loan.foreclosureAmount = totalAmount;
        loan.foreclosureChargePercent = foreclosureChargePercent || 0;
        loan.foreclosureChargeAmount = foreclosureChargeAmount || 0;
        loan.odAmount = od || 0;
        loan.miscellaneousFee = miscellaneousFee || 0;
        loan.remainingPrincipal = 0;
        loan.paymentMode = paymentMode || "Cash";
        loan.chequeNumber = paymentMode === "Cheque" ? chequeNumber : undefined;
        
        loan.approvedBy = req.user._id;
        loan.approvedAt = Date.now();
        await loan.save();

        if (paymentBreakdown && Array.isArray(paymentBreakdown)) {
          for (const p of paymentBreakdown) {
            await Payment.create({
              loanId: loan._id,
              loanModel: loan.loanModel || "Loan",
              amount: parseFloat(p.amount),
              mode: p.mode,
              paymentDate: pDate,
              paymentType: "Foreclosure",
              status: "Success",
              remarks: `Foreclosure Split-Payment (${p.mode}) Approved`,
              collectedBy: approval.requestedBy,
            });
          }
        }
      }
    } else if (requestType === "LOAN_EDIT") {
      // Apply the approved changes to the loan document
      const { newValues } = approval.requestedData || {};
      if (newValues && targetModel) {
        if (targetModel === "Loan") {
          // Vehicle/Monthly loans submit a nested payload (customerDetails,
          // loanTerms, vehicleInformation, status) - the same shape used by
          // the direct-edit endpoint (loanController.updateLoan). This must
          // be flattened onto the flat schema fields the same way that
          // endpoint does it, otherwise Mongoose tries to cast whole nested
          // objects onto flat fields (e.g. the "status" object onto the
          // plain string "status" field), which throws a CastError.
          const loan = await Loan.findById(targetId);
          if (loan) {
            const { customerDetails, loanTerms, vehicleInformation, status: statusObj } = newValues;
            const foreclosureDetails = statusObj?.foreclosureDetails;

            const currentPrincipal = loanTerms?.principalAmount !== undefined ? loanTerms.principalAmount : loan.principalAmount;
            const currentRoi = loanTerms?.annualInterestRate !== undefined ? loanTerms.annualInterestRate : loan.annualInterestRate;
            const currentTenure = loanTerms?.tenureMonths !== undefined ? loanTerms.tenureMonths : loan.tenureMonths;

            const monthlyEMI = calculateEMI(currentPrincipal, currentRoi, currentTenure);
            const calculatedTotalInterest = Math.ceil(
              parseFloat(currentPrincipal) * (parseFloat(currentRoi) / 100) * parseInt(currentTenure)
            );

            const extractIdValue = (val) => (val && typeof val === "object" ? val._id || val : val);

            const updateData = {
              ...(customerDetails && {
                customerName: customerDetails.customerName,
                address: customerDetails.address,
                ownRent: customerDetails.ownRent,
                mobileNumbers: customerDetails.mobileNumbers,
                panNumber: customerDetails.panNumber,
                aadharNumber: customerDetails.aadharNumber,
                guarantorName: customerDetails.guarantorName,
                guarantorMobileNumbers: customerDetails.guarantorMobileNumbers,
              }),
              ...(loanTerms && {
                loanNumber: loanTerms.loanNumber,
                principalAmount: loanTerms.disbursement?.length > 0
                  ? loanTerms.disbursement.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                  : loanTerms.principalAmount,
                processingFeeRate: loanTerms.processingFeeRate,
                processingFee: loanTerms.processingFee,
                tenureMonths: loanTerms.tenureMonths,
                annualInterestRate: loanTerms.annualInterestRate,
                dateLoanDisbursed: loanTerms.dateLoanDisbursed,
                emiStartDate: loanTerms.emiStartDate,
                emiEndDate: loanTerms.emiEndDate,
                paymentMode: loanTerms.paymentMode,
                chequeNumber: loanTerms.chequeNumber,
                disbursement: loanTerms.disbursement || loan.disbursement,
              }),
              ...(vehicleInformation && {
                vehicleNumber: vehicleInformation.vehicleNumber,
                chassisNumber: vehicleInformation.chassisNumber,
                engineNumber: vehicleInformation.engineNumber,
                modelYear: vehicleInformation.modelYear,
                typeOfVehicle: vehicleInformation.typeOfVehicle,
                ywBoard: vehicleInformation.ywBoard,
                dealerName: vehicleInformation.dealerName,
                dealerNumber: vehicleInformation.dealerNumber,
                fcDate: vehicleInformation.fcDate,
                insuranceDate: vehicleInformation.insuranceDate,
                rtoWorkPending: vehicleInformation.rtoWorkPending,
                hpEntry: vehicleInformation.hpEntry || loan.hpEntry,
              }),
              status:
                statusObj?.status ||
                (foreclosureDetails?.foreclosureDate
                  ? "Closed"
                  : statusObj?.isSeized || loan.isSeized
                    ? "Seized"
                    : loan.status),
              paymentStatus: statusObj?.paymentStatus || loan.paymentStatus,
              isSeized: statusObj?.isSeized !== undefined ? statusObj.isSeized : loan.isSeized,
              docChecklist: statusObj?.docChecklist || loan.docChecklist,
              remarks: statusObj?.remarks || loan.remarks,
              clientResponse: statusObj?.clientResponse !== undefined ? statusObj.clientResponse : loan.clientResponse,
              nextFollowUpDate: statusObj?.nextFollowUpDate !== undefined ? (statusObj.nextFollowUpDate || null) : loan.nextFollowUpDate,
              foreclosedBy: extractIdValue(foreclosureDetails?.foreclosedBy) || loan.foreclosedBy,
              foreclosureDate: foreclosureDetails?.foreclosureDate || loan.foreclosureDate,
              foreclosureAmount:
                foreclosureDetails?.foreclosureAmount !== undefined && foreclosureDetails?.foreclosureAmount !== ""
                  ? foreclosureDetails.foreclosureAmount
                  : loan.foreclosureAmount,
              monthlyEMI,
              totalInterestAmount: calculatedTotalInterest,
              updatedBy: req.user._id,
            };

            await Loan.findByIdAndUpdate(targetId, updateData, { runValidators: true });

            // Synchronize the EMI schedule, same as the direct-edit path.
            // This also covers the case where the loan has zero EMIs yet
            // (e.g. it was created before principal/rate/tenure were filled
            // in) - the "Tenure Increase" branch below generates the full
            // schedule from scratch in that case.
            if (loanTerms || customerDetails || (statusObj && statusObj.status)) {
              const emis = await EMI.find({ loanId: targetId, loanModel: "Loan" }).sort({ emiNumber: 1 });
              const oldTenure = emis.length;
              const newTenure = parseInt(currentTenure);
              const newEmiStartDate = loanTerms?.emiStartDate
                ? new Date(loanTerms.emiStartDate)
                : new Date(updateData.emiStartDate || loan.emiStartDate);
              const finalCustomerName = updateData.customerName || loan.customerName;
              const finalLoanNumber = updateData.loanNumber || loan.loanNumber;

              // 1. Update existing EMIs
              const updatePromises = emis.map((emi, index) => {
                const emiNum = index + 1;
                const updates = {};
                let hasChanges = false;

                if (emi.customerName !== finalCustomerName) {
                  updates.customerName = finalCustomerName;
                  hasChanges = true;
                }
                if (emi.loanNumber !== finalLoanNumber) {
                  updates.loanNumber = finalLoanNumber;
                  hasChanges = true;
                }
                if (emi.status !== "Paid" && emi.emiAmount !== monthlyEMI) {
                  updates.emiAmount = monthlyEMI;
                  hasChanges = true;
                }
                const newDueDate = addMonths(new Date(newEmiStartDate), emiNum - 1);
                if (!emi.dueDate || new Date(emi.dueDate).getTime() !== new Date(newDueDate).getTime()) {
                  updates.dueDate = newDueDate;
                  hasChanges = true;
                }

                return hasChanges ? EMI.findByIdAndUpdate(emi._id, updates) : null;
              });
              await Promise.all(updatePromises.filter((p) => p !== null));

              // 2. Handle Tenure Increase (also covers generating the
              // schedule for the first time, when oldTenure is 0)
              if (newTenure > oldTenure) {
                const extraEmis = [];
                for (let i = oldTenure + 1; i <= newTenure; i++) {
                  extraEmis.push({
                    loanId: targetId,
                    loanModel: "Loan",
                    loanNumber: finalLoanNumber,
                    customerName: finalCustomerName,
                    emiNumber: i,
                    dueDate: addMonths(new Date(newEmiStartDate), i - 1),
                    emiAmount: monthlyEMI,
                    status: "Pending",
                  });
                }
                if (extraEmis.length > 0) {
                  await EMI.insertMany(extraEmis);
                }
              }
              // 3. Handle Tenure Decrease
              else if (newTenure < oldTenure) {
                await EMI.deleteMany({
                  loanId: targetId,
                  loanModel: "Loan",
                  emiNumber: { $gt: newTenure },
                  status: "Pending",
                });
              }
            }
          }
        } else {
          // WeeklyLoan / DailyLoan / InterestLoan submit an already-flat
          // payload, so the direct $set continues to work correctly here.
          let LoanModel;
          if (targetModel === "WeeklyLoan") LoanModel = require("../models/WeeklyLoan");
          else if (targetModel === "DailyLoan") LoanModel = require("../models/DailyLoan");
          else if (targetModel === "InterestLoan") LoanModel = require("../models/InterestLoan");

          if (LoanModel) {
            // Remove fields that shouldn't be directly set
            const { _id, __v, createdAt, updatedAt, paidEmis, totalCollected, remainingPrincipalAmount, ...safeValues } = newValues;
            await LoanModel.findByIdAndUpdate(targetId, { $set: safeValues });
          }
        }
      }
    } else if (requestType === "PRINCIPAL_PAYMENT") {
      const loan = await InterestLoan.findById(targetId);
      if (loan) {
        const { amount, paymentMode, paymentDate, remarks } = requestedData;
        const pAmount = parseFloat(amount);

        const pDate = paymentDate ? new Date(paymentDate) : new Date();

        loan.principalPayments.push({
          amount: pAmount,
          paymentMode: paymentMode || "Cash",
          paymentDate: pDate,
          remarks,
          addedBy: approval.requestedBy,
        });

        // Add to collections
        await Payment.create({
          loanId: loan._id,
          loanModel: "InterestLoan",
          amount: pAmount,
          mode: paymentMode || "Cash",
          paymentDate: pDate,
          paymentType: "Monthly", // Categorize as Monthly for collections summary to include it in standard loan repayments
          status: "Success",
          remarks: remarks || "Principal Payment Approved",
          collectedBy: approval.requestedBy,
        });

        loan.remainingPrincipalAmount -= pAmount;
        if (loan.remainingPrincipalAmount <= 0) {
          loan.status = "Closed";
          loan.remainingPrincipalAmount = 0;
        }

        loan.approvedBy = req.user._id;
        loan.approvedAt = Date.now();
        await loan.save();

        // Recalculate future EMIs
        const pendingEmis = await InterestEMI.find({
          interestLoanId: loan._id,
          status: { $in: ["Pending", "Partially Paid"] },
        });

        for (const emi of pendingEmis) {
          const newInterestAmount = Math.ceil(
            loan.remainingPrincipalAmount * (loan.interestRate / 100)
          );
          emi.interestAmount = newInterestAmount;
          if (emi.amountPaid >= emi.interestAmount) emi.status = "Paid";
          else if (emi.amountPaid > 0) emi.status = "Partially Paid";
          else emi.status = "Pending";
          await emi.save();
        }
      }
    }
  } else {
    // If rejected, revert status back for all loan/EMI types
    const { targetId, targetModel, requestType } = approval;

    if (targetModel === "EMI") {
      // Revert EMI - determine previous status from amountPaid
      const emi = await EMI.findById(targetId);
      if (emi) {
        let revertStatus = "Pending";
        if (emi.amountPaid > 0 && emi.amountPaid < emi.emiAmount) {
          revertStatus = "Partially Paid";
        } else if (emi.amountPaid >= emi.emiAmount) {
          revertStatus = "Paid";
        }
        await EMI.findByIdAndUpdate(targetId, { status: revertStatus });
      }
    } else if (targetModel === "InterestEMI") {
      const emi = await InterestEMI.findById(targetId);
      if (emi) {
        let revertStatus = "Pending";
        if (emi.amountPaid > 0 && emi.amountPaid < emi.interestAmount) {
          revertStatus = "Partially Paid";
        } else if (emi.amountPaid >= emi.interestAmount) {
          revertStatus = "Paid";
        }
        await InterestEMI.findByIdAndUpdate(targetId, { status: revertStatus });
      }
    } else if (targetModel === "Loan") {
      if (requestType === "FORECLOSURE") {
        await Loan.findByIdAndUpdate(targetId, { status: "Active" });
      }
    } else if (targetModel === "WeeklyLoan") {
      if (requestType === "FORECLOSURE") {
        await WeeklyLoan.findByIdAndUpdate(targetId, { status: "Active" });
      }
    } else if (targetModel === "DailyLoan") {
      if (requestType === "FORECLOSURE") {
        await DailyLoan.findByIdAndUpdate(targetId, { status: "Active" });
      }
    } else if (targetModel === "InterestLoan") {
      if (requestType === "FORECLOSURE") {
        await InterestLoan.findByIdAndUpdate(targetId, { status: "Active" });
      }
    }
  }

  await approval.save();

  let totalApprovedAmount = parseFloat(approval.requestedData.amount) || parseFloat(approval.requestedData.totalAmount) || parseFloat(approval.requestedData.addedAmount) || 0;

  if (totalApprovedAmount === 0 && approval.requestedData) {
    const { dateGroups, overdue } = approval.requestedData;
    if (dateGroups && Array.isArray(dateGroups)) {
      dateGroups.forEach(group => {
        if (group.payments && Array.isArray(group.payments)) {
          group.payments.forEach(p => {
            totalApprovedAmount += parseFloat(p.amount) || 0;
          });
        }
      });
    }
    if (overdue && Array.isArray(overdue)) {
      overdue.forEach(ov => {
        totalApprovedAmount += parseFloat(ov.amount) || 0;
      });
    }
  }

  // Notify the employee who requested it
  await sendNotification({
    recipientId: approval.requestedBy,
    senderId: req.user._id,
    type: status === "Approved" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
    title: `Payment Request ${status}`,
    message: `Payment of ₹${totalApprovedAmount} for loan ${approval.loanNumber} (${approval.customerName}) has been ${status.toLowerCase()} by ${req.user.name}.`,
    data: {
      loanNumber: approval.loanNumber,
      customerName: approval.customerName,
      amount: totalApprovedAmount,
      employeeName: req.user.name,
      loanId: approval.targetId,
      loanType: approval.targetModel,
      approvalId: approval._id
    }
  });

  const { notifyApprovalCountChange } = require("./notificationController");
  await notifyApprovalCountChange();

  sendResponse(res, 200, "success", `Request ${status} successfully`, null, approval);
});

module.exports = {
  getPendingApprovals,
  processApproval,
};
