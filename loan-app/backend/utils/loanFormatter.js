const formatLoanResponse = (loanDoc) => {
  if (!loanDoc) return null;

  const loan = loanDoc.toObject ? loanDoc.toObject() : loanDoc;

  return {
    _id: loan._id,
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
    },
    repaymentStats: loan.repaymentStats || null,
    status:
      loan.status?.toLowerCase() === "closed"
        ? {
            status: loan.status,
            paymentStatus: loan.paymentStatus,
            remarks: loan.remarks,
            ...(loan.foreclosureAmount !== undefined && loan.foreclosureAmount !== null
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
