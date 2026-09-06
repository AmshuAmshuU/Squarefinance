const formatLoanResponse = (loanDoc) => {
  if (!loanDoc) return null;

  const loan = loanDoc.toObject ? loanDoc.toObject() : loanDoc;

  return {
    _id: loan._id,
    locationToken: loan.locationToken,
    lastLocationLat: loan.lastLocationLat,
    lastLocationLng: loan.lastLocationLng,
    lastLocationAt: loan.lastLocationAt,
    customerDetails: {
      customerName: loan.customerName,
      address: loan.address,
      ownRent: loan.ownRent,
      panNumber: loan.panNumber,
      aadharNumber: loan.aadharNumber,
      mobileNumbers: loan.mobileNumbers || [],
      guarantorName: loan.guarantorName,
      guarantorMobileNumbers: loan.guarantorMobileNumbers || [],
    },
    // loanTerms
    loanTerms: {
      loanNumber: loan.loanNumber,
      principalAmount: loan.principalAmount,
      annualInterestRate: loan.annualInterestRate,
      tenureMonths: loan.tenureMonths,
      tenureType: loan.tenureType,
      dateLoanDisbursed: loan.dateLoanDisbursed,
      emiStartDate: loan.emiStartDate,
      emiEndDate: loan.emiEndDate,
      monthlyEMI: loan.monthlyEMI,
      totalInterestAmount: loan.totalInterestAmount,
      processingFee: loan.processingFee,
      processingFeeRate: loan.processingFeeRate,
      disbursement: loan.disbursement || [],
    },
    vehicleInformation: {
      vehicleNumber: loan.vehicleNumber,
      chassisNumber: loan.chassisNumber,
      engineNumber: loan.engineNumber,
      modelYear: loan.modelYear,
      typeOfVehicle: loan.typeOfVehicle,
      ywBoard: loan.ywBoard,
      dealerName: loan.dealerName,
      dealerNumber: loan.dealerNumber,
      fcDate: loan.fcDate,
      insuranceDate: loan.insuranceDate,
      rtoWorkPending: loan.rtoWorkPending || [],
      hpEntry: loan.hpEntry || "Not done",
      rtoWorkStatus: loan.rtoWorkStatus || "No work",
      rtoDocsSubmittedDate: loan.rtoDocsSubmittedDate || null,
      rtoCompletedDate: loan.rtoCompletedDate || null,
      rtoNotes: loan.rtoNotes || "",
      rtoWorkUpdatedBy: loan.rtoWorkUpdatedBy || null,
      rtoWorkUpdatedAt: loan.rtoWorkUpdatedAt || null,
    },
    repaymentStats: loan.repaymentStats || null,
    status:
      loan.status?.toLowerCase() === "closed"
        ? {
            status: loan.status,
            paymentStatus: loan.paymentStatus,
            remarks: loan.remarks,
            // foreclosureAmount is 0 (not undefined) for almost every closed
            // loan that was never foreclosed - the edit form saves 0 into it
            // the first time the loan is ever edited for any unrelated
            // reason. Checking > 0 is what actually distinguishes "this loan
            // was genuinely foreclosed" from "this field just defaults to
            // 0" - matches the same > 0 check already used for the
            // Weekly/Daily foreclosure details card. Without this, the card
            // rendered for any edited-at-least-once loan and showed
            // loan.odAmount (a running lifetime OD total, unrelated to
            // foreclosure) as if it were the OD collected AT foreclosure.
            ...(loan.foreclosureAmount !== undefined && loan.foreclosureAmount !== null && loan.foreclosureAmount > 0
              ? {
                  foreclosureDetails: {
                    foreclosedBy: loan.foreclosedBy || null,
                    foreclosureDate: loan.foreclosureDate || null,
                    foreclosureAmount: loan.foreclosureAmount,
                    // Detailed Breakdown
                    foreclosureChargeAmount: loan.foreclosureChargeAmount || 0,
                    foreclosureChargePercent:
                      loan.foreclosureChargePercent || 0,
                    miscellaneousFee: loan.miscellaneousFee || 0,
                    odAmount: loan.odAmount || 0,
                    remainingPrincipal: loan.remainingPrincipal || 0,
                    createdBy: loan.createdBy || null,
                  },
                }
              : {}),
            seizedStatus: loan.seizedStatus,
            seizedDate: loan.seizedDate,
            soldDetails: loan.soldDetails
              ? {
                  ...loan.soldDetails,
                  soldBy: loan.soldDetails.soldBy || null,
                }
              : null,
            createdAt: loan.createdAt,
            updatedAt: loan.updatedAt,
            createdBy: loan.createdBy || null,
            updatedBy: loan.updatedBy || null,
            clientResponse: loan.clientResponse,
          }
        : {
            status: loan.status,
            paymentStatus: loan.paymentStatus,
            isSeized: loan.isSeized || false,
            docChecklist: loan.docChecklist,
            remarks: loan.remarks,
            clientResponse: loan.clientResponse,
            nextFollowUpDate: loan.nextFollowUpDate,
            seizedStatus: loan.seizedStatus,
            seizedDate: loan.seizedDate,
            soldDetails: loan.soldDetails
              ? {
                  ...loan.soldDetails,
                  soldBy: loan.soldDetails.soldBy || null,
                }
              : null,
            createdBy: loan.createdBy || null,
            updatedBy: loan.updatedBy || null,
            createdAt: loan.createdAt,
            updatedAt: loan.updatedAt,
          },
  };
};

module.exports = { formatLoanResponse };
