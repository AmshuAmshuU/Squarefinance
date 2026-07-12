const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const EMI = require("../models/EMI");
const SeizedVehicle = require("../models/SeizedVehicle");
const ClosedLoan = require("../models/ClosedLoan");
const Followup = require("../models/Followup");
const DailyLoan = require("../models/DailyLoan");
const WeeklyLoan = require("../models/WeeklyLoan");
const Payment = require("../models/Payment");
const InterestLoan = require("../models/InterestLoan");
const ErrorHandler = require("../utils/ErrorHandler");
const { addMonths } = require("date-fns");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { formatLoanResponse } = require("../utils/loanFormatter");
const { notifyAdmins } = require("./notificationController");

const extractId = (val) => {
  if (!val) return null;
  if (typeof val === "object" && val._id) return val._id;
  if (typeof val === "string" && mongoose.Types.ObjectId.isValid(val))
    return val;
  return null;
};

const calculateEMI = (principal, roi, tenureMonths) => {
  const p = parseFloat(principal);
  const r = parseFloat(roi);
  const n = parseInt(tenureMonths);
  if (!p || !n) return 0;

  // Flat Interest Calculation: EMI = (Principal / Tenure) + (Principal * Rate / 100)
  const monthlyInterest = p * (r / 100);
  const monthlyPrincipal = p / n;
  const emi = monthlyPrincipal + monthlyInterest;

  return Math.ceil(emi);
};

const calculateEMIApi = asyncHandler(async (req, res, next) => {
  const { principalAmount, annualInterestRate, tenureMonths } = req.body;

  if (!principalAmount || !annualInterestRate || !tenureMonths) {
    return next(
      new ErrorHandler("Please provide principal, rate and tenure", 400),
    );
  }

  const emi = calculateEMI(principalAmount, annualInterestRate, tenureMonths);

  sendResponse(res, 200, "success", "EMI calculated successfully", null, {
    emi,
  });
});
// create loan
const createLoan = asyncHandler(async (req, res, next) => {
  const {
    customerDetails,
    loanTerms,
    vehicleInformation,
    status: statusObj,
  } = req.body;

  if (!loanTerms?.loanNumber) {
    return next(new ErrorHandler("Loan number is required", 400));
  }

  const existingLoan = await Promise.all([
    Loan.findOne({ loanNumber: loanTerms.loanNumber }),
    WeeklyLoan.findOne({ loanNumber: loanTerms.loanNumber }),
    DailyLoan.findOne({ loanNumber: loanTerms.loanNumber }),
  ]);

  if (existingLoan.some((loan) => loan !== null)) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  const p = parseFloat(loanTerms?.principalAmount) || 0;
  const r = parseFloat(loanTerms?.annualInterestRate) || 0;
  const t = parseInt(loanTerms?.tenureMonths) || 0;

  let monthlyEMI = 0;
  if (p > 0 && r >= 0 && t > 0) {
    monthlyEMI = calculateEMI(p, r, t);
  } else if (p > 0 && r === 0 && t > 0) {
    monthlyEMI = Math.ceil(p / t);
  }

  const calculatedTotalInterest = Math.ceil(p * (r / 100) * t);

  const loan = await Loan.create({
    // customerDetails
    customerName: customerDetails.customerName,
    address: customerDetails.address,
    ownRent: customerDetails.ownRent,
    mobileNumbers: customerDetails.mobileNumbers,
    panNumber: customerDetails.panNumber,
    aadharNumber: customerDetails.aadharNumber,
    guarantorName: customerDetails.guarantorName,
    guarantorMobileNumbers: customerDetails.guarantorMobileNumbers,

    // loanTerms
    loanNumber: loanTerms.loanNumber,
    principalAmount: loanTerms.disbursement?.length > 0
      ? loanTerms.disbursement.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
      : parseFloat(loanTerms?.principalAmount) || 0,
    processingFeeRate: parseFloat(loanTerms?.processingFeeRate) || 0,
    processingFee: Math.ceil(parseFloat(loanTerms?.processingFee)) || 0,
    tenureMonths: parseInt(loanTerms?.tenureMonths) || 0,
    annualInterestRate: parseFloat(loanTerms?.annualInterestRate) || 0,
    dateLoanDisbursed: loanTerms.dateLoanDisbursed,
    emiStartDate: loanTerms.emiStartDate,
    emiEndDate: loanTerms.emiEndDate,
    monthlyEMI,
    totalInterestAmount: calculatedTotalInterest,
    paymentMode: loanTerms.paymentMode || "Cash",
    chequeNumber: loanTerms.chequeNumber,
    disbursement: loanTerms.disbursement || [],

    // vehicleInformation
    vehicleNumber: vehicleInformation?.vehicleNumber,
    chassisNumber: vehicleInformation?.chassisNumber,
    engineNumber: vehicleInformation?.engineNumber,
    modelYear: vehicleInformation?.modelYear,
    typeOfVehicle: vehicleInformation?.typeOfVehicle,
    ywBoard: vehicleInformation?.ywBoard,
    dealerName: vehicleInformation?.dealerName,
    dealerNumber: vehicleInformation?.dealerNumber,
    fcDate: vehicleInformation?.fcDate,
    insuranceDate: vehicleInformation?.insuranceDate,
    rtoWorkPending: vehicleInformation?.rtoWorkPending,
    hpEntry: vehicleInformation?.hpEntry || "Not done",

    // status
    status: statusObj?.status || "Active",
    paymentStatus: statusObj?.paymentStatus || "Pending",
    docChecklist: statusObj?.docChecklist,
    remarks: statusObj?.remarks,
    clientResponse: statusObj?.clientResponse,
    nextFollowUpDate: statusObj?.nextFollowUpDate,
    createdBy: req.user._id,
  });

  // Generate EMIs
  const emis = [];
  const baseDate = loan.emiStartDate || loan.dateLoanDisbursed;
  if (baseDate) {
    let currentEmiDate = new Date(baseDate);

    for (let i = 1; i <= t; i++) {
      emis.push({
        loanId: loan._id,
        loanNumber: loan.loanNumber,
        customerName: loan.customerName,
        emiNumber: i,
        dueDate: addMonths(new Date(currentEmiDate), i - 1),
        emiAmount: monthlyEMI,
        status: "Pending",
        overdue: [],
      });
    }
  }

  if (emis.length > 0) {
    await EMI.insertMany(emis);
  }

  // Create Payment record for processing fee if applicable
  if (loan.processingFee && parseFloat(loan.processingFee) > 0) {
    try {
      await Payment.create({
        loanId: loan._id,
        loanModel: "Loan",
        amount: parseFloat(loan.processingFee),
        mode: "CASH", // Default to CASH for processing fee
        paymentDate: loan.dateLoanDisbursed || new Date(),
        paymentType: "Processing Fee",
        status: "Success",
        remarks: "Loan Processing Fee",
        collectedBy: req.user._id,
      });
    } catch (err) {
      console.error("Error creating processing fee payment record:", err);
      // We don't want to fail the whole loan creation if just the payment record fails,
      // but in a production app we might want more robust handling.
    }
  }

  sendResponse(
    res,
    201,
    "success",
    "Loan created and EMIs generated successfully",
    null,
    formatLoanResponse(loan),
  );
});

const getAllLoans = asyncHandler(async (req, res, next) => {
  const startTotal = performance.now();
  const {
    loanNumber,
    customerName,
    mobileNumber,
    vehicleNumber,
    tenureMonths,
    status,
  } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25; // Increased to 25 for standardized pagination
  const skip = (page - 1) * limit;

  const query = {};

  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (vehicleNumber)
    query.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
  if (mobileNumber) {
    query.$or = [
      { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
      { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
    ];
  }
  if (tenureMonths) query.tenureMonths = tenureMonths;
  if (status) {
    const statusLower = status.toLowerCase();
    if (statusLower === "seized") {
      query.isSeized = true;
    } else if (statusLower === "active") {
      query.status = { $regex: /^active$/i };
      query.isSeized = { $ne: true };
    } else {
      query.status = { $regex: new RegExp(`^${status}$`, "i") };
    }
  }

  // Handle Expired Loans filter
  if (req.query.isExpired === "true") {
    query.status = { $regex: /^active$/i };
    query.emiEndDate = { $lt: new Date() };
  }

  // 1. Performance: Count documents (Fast)
  const countStart = performance.now();
  const total = await Loan.countDocuments(query);
  const countTime = (performance.now() - countStart).toFixed(2);

  // Check if we need extended data for export
  const forExport = req.query.forExport === "true";

  let loans;
  const dbStart = performance.now();
  let sortConfig = { createdAt: -1 };
  let collationConfig = null;

  if (loanNumber) {
    sortConfig = { loanNumber: 1 };
    collationConfig = { locale: "en", numericOrdering: true };
  }

  if (forExport) {
    // Advanced aggregation for export with repayment stats
    const pipeline = [
      { $match: query },
      { $sort: sortConfig },
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
            nextEmiDueDate: {
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
      {
        $addFields: {
          "repaymentStats.remainingPrincipal": {
            $multiply: [
              {
                $divide: [
                  { $ifNull: ["$principalAmount", 0] },
                  {
                    $cond: [{ $gt: ["$tenureMonths", 0] }, "$tenureMonths", 1],
                  },
                ],
              },
              "$repaymentStats.remainingTenure",
            ],
          },
        },
      },
      { $project: { emis: 0 } },
    ];

    if (collationConfig) {
      loans = await Loan.aggregate(pipeline).collation(collationConfig);
    } else {
      loans = await Loan.aggregate(pipeline);
    }
  } else {
    const findQuery = Loan.find(query)
      .select(
        "loanNumber customerName mobileNumbers guarantorName guarantorMobileNumbers monthlyEMI tenureMonths status isSeized clientResponse createdBy updatedBy createdAt principalAmount vehicleNumber chassisNumber engineNumber typeOfVehicle modelYear ywBoard dealerName dealerNumber hpEntry fcDate insuranceDate rtoWorkPending annualInterestRate processingFee emiStartDate emiEndDate",
      )
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    if (collationConfig) {
      loans = await findQuery.collation(collationConfig);
    } else {
      loans = await findQuery;
    }
  }
  const dbTime = (performance.now() - dbStart).toFixed(2);

  // 2. Performance: Serialization & Formatting
  const serStart = performance.now();
  const formattedLoans = loans.map((loan) => {
    // RESTORE NESTED STRUCTURE: Frontend expects these specific paths
    return {
      _id: loan._id,
      customerDetails: {
        customerName: loan.customerName,
        address: loan.address,
        ownRent: loan.ownRent,
        mobileNumbers: loan.mobileNumbers || [],
        panNumber: loan.panNumber,
        aadharNumber: loan.aadharNumber,
        guarantorName: loan.guarantorName,
        guarantorMobileNumbers: loan.guarantorMobileNumbers || [],
      },
      loanTerms: {
        loanNumber: loan.loanNumber,
        principalAmount: loan.principalAmount,
        annualInterestRate: loan.annualInterestRate,
        processingFee: loan.processingFee,
        tenureType: loan.tenureType,
        tenureMonths: loan.tenureMonths,
        emiStartDate: loan.emiStartDate,
        emiEndDate: loan.emiEndDate,
        monthlyEMI: loan.monthlyEMI,
      },
      vehicleInformation: {
        vehicleNumber: loan.vehicleNumber,
        chassisNumber: loan.chassisNumber,
        engineNumber: loan.engineNumber,
        typeOfVehicle: loan.typeOfVehicle,
        modelYear: loan.modelYear,
        ywBoard: loan.ywBoard,
        dealerName: loan.dealerName,
        dealerNumber: loan.dealerNumber,
        hpEntry: loan.hpEntry,
        fcDate: loan.fcDate,
        insuranceDate: loan.insuranceDate,
        rtoWorkPending: loan.rtoWorkPending,
      },
      status: {
        status: loan.status,
        isSeized: loan.isSeized,
        clientResponse: loan.clientResponse,
        docChecklist: loan.docChecklist,
        remarks: loan.remarks,
      },
      createdAt: loan.createdAt,
      repaymentStats: loan.repaymentStats || null,
    };
  });

  const responseData = {
    loans: formattedLoans,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    performance: {
      dbTime: `${dbTime}ms`,
      countTime: `${countTime}ms`,
      totalTime: `${(performance.now() - startTotal).toFixed(2)}ms`,
    },
  };

  const serTime = (performance.now() - serStart).toFixed(2);
  const totalTime = (performance.now() - startTotal).toFixed(2);

  console.log(
    `[PERF] getAllLoans - DB: ${dbTime}ms, Ser: ${serTime}ms, Total: ${totalTime}ms, Size: ${JSON.stringify(responseData).length} bytes`,
  );

  // Use the standard sendResponse utility to ensure status: "success" wrapper
  sendResponse(
    res,
    200,
    "success",
    "Loans fetched successfully",
    null,
    responseData,
  );
});

const populateLoanDetails = (query) => {
  return query
    .populate("createdBy", "name")
    .populate("foreclosedBy", "name")
    .populate("updatedBy", "name")
    .populate("approvedBy", "name")
    .populate("soldDetails.soldBy", "name")
    .populate("seizedDetails")
    .populate("closureDetails")
    .populate("followupHistory");
};

const getLoanByLoanNumber = asyncHandler(async (req, res, next) => {
  const loan = await populateLoanDetails(
    Loan.findOne({ loanNumber: req.params.loanNumber }),
  );

  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Calculate remaining principal accurately including partial payments
  const emisData = await EMI.find({ loanId: loan._id }).sort({ emiNumber: 1 });
  const Approval = require("../models/Approval");

  const emis = await Promise.all(
    emisData.map(async (emi) => {
      const pendingApproval = await Approval.findOne({
        targetId: emi._id,
        status: "Pending",
      });
      const emiObj = emi.toObject();
      if (pendingApproval) {
        emiObj.pendingApproval = pendingApproval.requestedData;
      }
      return emiObj;
    })
  );

  let remainingTenureCount = 0;

  if (emis && emis.length > 0) {
    emis.forEach((emi) => {
      const emiAmount = parseFloat(emi.emiAmount) || 0;
      const amountPaid = parseFloat(emi.amountPaid) || 0;
      if (emiAmount > 0) {
        let remainingPortion = (emiAmount - amountPaid) / emiAmount;
        if (remainingPortion < 0) remainingPortion = 0;
        remainingTenureCount += remainingPortion;
      }
    });
  } else {
    remainingTenureCount = loan.tenureMonths || 0;
  }

  const principalPerMonth =
    (loan.principalAmount || 0) / (loan.tenureMonths || 1);
  const remainingPrincipalAmount = Math.ceil(
    remainingTenureCount * principalPerMonth,
  );

  const formattedLoan = formatLoanResponse(loan);
  formattedLoan.loanTerms.remainingPrincipalAmount = remainingPrincipalAmount;

  // Aggressive recovery logic for foreclosureDetails for older loans
  if (
    loan.status?.toLowerCase() === "closed" &&
    remainingPrincipalAmount > 0 && // Only recover if it wasn't a standard 'Full Pay'
    !loan.foreclosureAmount && // Trigger if 0, null, or undefined
    !loan.soldDetails?.sellAmount // Don't trigger if it's a sold vehicle
  ) {
    // 1. Search for explicit foreclosure/settlement EMI (using both ID and loanNumber)
    const foreclosureEmi = await EMI.findOne({
      $or: [{ loanId: loan._id }, { loanNumber: loan.loanNumber }],
      $or: [
        { paymentMode: { $regex: /foreclosure|settlement|closed/i } },
        { remarks: { $regex: /foreclosure|settlement|closed|final/i } },
      ],
    }).sort({ createdAt: -1 });

    // 2. Fallback to the absolute last paid EMI
    const targetEmi =
      foreclosureEmi ||
      (await EMI.findOne({
        $or: [{ loanId: loan._id }, { loanNumber: loan.loanNumber }],
        status: "Paid",
      }).sort({ dueDate: -1, createdAt: -1 }));

    if (targetEmi) {
      if (!formattedLoan.status.foreclosureDetails) {
        formattedLoan.status.foreclosureDetails = {};
      }

      if (targetEmi.remarks) {
        // Updated regex to prioritize currency symbols/terms and exclude date-like patterns
        const amtMatch =
          targetEmi.remarks.match(
            /(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i,
          ) ||
          targetEmi.remarks.match(/[₹]\s*([\d,.]+)/) ||
          targetEmi.remarks.match(/(?<![\/\d])\b([\d,.]+)(?!\s*[\/\d])/); // Avoid numbers surrounded by slashes (dates)
        if (amtMatch) {
          formattedLoan.status.foreclosureDetails.foreclosureAmount =
            parseFloat(amtMatch[1].replace(/,/g, ""));
        }
      }

      if (!formattedLoan.status.foreclosureDetails.foreclosureAmount) {
        formattedLoan.status.foreclosureDetails.foreclosureAmount =
          targetEmi.amountPaid || targetEmi.emiAmount;
      }

      formattedLoan.status.foreclosureDetails.foreclosureDate =
        targetEmi.paymentDate || targetEmi.createdAt;
    }

    // Final fallback for amount: check loan's own remarks
    if (
      !formattedLoan.status.foreclosureDetails?.foreclosureAmount &&
      loan.remarks
    ) {
      const loanAmtMatch =
        loan.remarks.match(/(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i) ||
        loan.remarks.match(/[₹]\s*([\d,.]+)/) ||
        loan.remarks.match(/(?<![\/\d])\b([\d,.]+)(?!\s*[\/\d])/);
      if (loanAmtMatch) {
        if (!formattedLoan.status.foreclosureDetails)
          formattedLoan.status.foreclosureDetails = {};
        formattedLoan.status.foreclosureDetails.foreclosureAmount = parseFloat(
          loanAmtMatch[1].replace(/,/g, ""),
        );
      }
    }

    // Processed By Fallback: Use creator if specific's processor is unknown
    if (
      !formattedLoan.status.foreclosureDetails?.foreclosedBy &&
      !loan.foreclosedBy
    ) {
      if (!formattedLoan.status.foreclosureDetails)
        formattedLoan.status.foreclosureDetails = {};
      formattedLoan.status.foreclosureDetails.foreclosedBy =
        loan.createdBy?.name || "System";
    }

    // Ensure we ALWAYS have a date for closed loans (using updatedAt as absolute fallback)
    if (!formattedLoan.status.foreclosureDetails?.foreclosureDate) {
      if (!formattedLoan.status.foreclosureDetails)
        formattedLoan.status.foreclosureDetails = {};
      formattedLoan.status.foreclosureDetails.foreclosureDate =
        loan.foreclosureDate || loan.updatedAt;
    }
  }

  sendResponse(res, 200, "success", "Loan found", null, formattedLoan);
});

const getLoanById = asyncHandler(async (req, res, next) => {
  if (
    !mongoose.Types.ObjectId.isValid(req.params.id) ||
    req.params.id === "undefined"
  ) {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }
  const loan = await populateLoanDetails(Loan.findById(req.params.id));
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Calculate remaining principal accurately including partial payments
  const emisData = await EMI.find({ loanId: loan._id }).sort({ emiNumber: 1 });
  const Approval = require("../models/Approval");

  const emis = await Promise.all(
    emisData.map(async (emi) => {
      const pendingApproval = await Approval.findOne({
        targetId: emi._id,
        status: "Pending",
      });
      const emiObj = emi.toObject();
      if (pendingApproval) {
        emiObj.pendingApproval = pendingApproval.requestedData;
      }
      return emiObj;
    })
  );

  let remainingTenureCount = 0;

  if (emis && emis.length > 0) {
    emis.forEach((emi) => {
      const emiAmount = parseFloat(emi.emiAmount) || 0;
      const amountPaid = parseFloat(emi.amountPaid) || 0;
      if (emiAmount > 0) {
        let remainingPortion = (emiAmount - amountPaid) / emiAmount;
        if (remainingPortion < 0) remainingPortion = 0;
        remainingTenureCount += remainingPortion;
      }
    });
  } else {
    remainingTenureCount = loan.tenureMonths || 0;
  }

  const principalPerMonth =
    (loan.principalAmount || 0) / (loan.tenureMonths || 1);
  const remainingPrincipalAmount = Math.ceil(
    remainingTenureCount * principalPerMonth,
  );

  const formattedLoan = formatLoanResponse(loan);
  formattedLoan.loanTerms.remainingPrincipalAmount = remainingPrincipalAmount;

  // Aggressive recovery logic for foreclosureDetails for older loans
  if (
    loan.status?.toLowerCase() === "closed" &&
    remainingPrincipalAmount > 0 && // Only recover if it wasn't a standard 'Full Pay'
    !loan.foreclosureAmount && // Trigger if 0, null, or undefined
    !loan.soldDetails?.sellAmount // Don't trigger if it's a sold vehicle
  ) {
    // 1. Search for explicit foreclosure/settlement EMI
    const foreclosureEmi = await EMI.findOne({
      $or: [{ loanId: loan._id }, { loanNumber: loan.loanNumber }],
      $or: [
        { paymentMode: { $regex: /foreclosure|settlement|closed/i } },
        { remarks: { $regex: /foreclosure|settlement|closed|final/i } },
      ],
    }).sort({ createdAt: -1 });

    // 2. Fallback to the absolute last paid EMI
    const targetEmi =
      foreclosureEmi ||
      (await EMI.findOne({
        $or: [{ loanId: loan._id }, { loanNumber: loan.loanNumber }],
        status: "Paid",
      }).sort({ dueDate: -1, createdAt: -1 }));

    if (targetEmi) {
      if (!formattedLoan.status.foreclosureDetails) {
        formattedLoan.status.foreclosureDetails = {};
      }

      if (targetEmi.remarks) {
        // Updated regex to prioritize currency symbols/terms and exclude date-like patterns
        const amtMatch =
          targetEmi.remarks.match(
            /(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i,
          ) ||
          targetEmi.remarks.match(/[₹]\s*([\d,.]+)/) ||
          targetEmi.remarks.match(/(?<![\/\d])\b([\d,.]+)(?!\s*[\/\d])/); // Avoid numbers surrounded by slashes (dates)
        if (amtMatch) {
          formattedLoan.status.foreclosureDetails.foreclosureAmount =
            parseFloat(amtMatch[1].replace(/,/g, ""));
        }
      }

      if (!formattedLoan.status.foreclosureDetails.foreclosureAmount) {
        formattedLoan.status.foreclosureDetails.foreclosureAmount =
          targetEmi.amountPaid || targetEmi.emiAmount;
      }

      formattedLoan.status.foreclosureDetails.foreclosureDate =
        targetEmi.paymentDate || targetEmi.createdAt;
    }

    // Final fallback for amount: check loan's own remarks
    if (
      !formattedLoan.status.foreclosureDetails?.foreclosureAmount &&
      loan.remarks
    ) {
      const loanAmtMatch =
        loan.remarks.match(/(?:Amount|Settlement|₹|Rs\.?)\s*([\d,.]+)/i) ||
        loan.remarks.match(/[₹]\s*([\d,.]+)/) ||
        loan.remarks.match(/(?<![\/\d])\b([\d,.]+)(?!\s*[\/\d])/);
      if (loanAmtMatch) {
        if (!formattedLoan.status.foreclosureDetails)
          formattedLoan.status.foreclosureDetails = {};
        formattedLoan.status.foreclosureDetails.foreclosureAmount = parseFloat(
          loanAmtMatch[1].replace(/,/g, ""),
        );
      }
    }

    // Processed By Fallback: Use creator if specific's processor is unknown
    if (
      !formattedLoan.status.foreclosureDetails?.foreclosedBy &&
      !loan.foreclosedBy
    ) {
      if (!formattedLoan.status.foreclosureDetails)
        formattedLoan.status.foreclosureDetails = {};
      formattedLoan.status.foreclosureDetails.foreclosedBy =
        loan.createdBy?.name || "System";
    }

    // Ensure we ALWAYS have a date for closed loans (using updatedAt as absolute fallback)
    if (!formattedLoan.status.foreclosureDetails?.foreclosureDate) {
      if (!formattedLoan.status.foreclosureDetails)
        formattedLoan.status.foreclosureDetails = {};
      formattedLoan.status.foreclosureDetails.foreclosureDate =
        loan.foreclosureDate || loan.updatedAt;
    }
  }

  sendResponse(res, 200, "success", "Loan found", null, formattedLoan);
});

const updateLoan = asyncHandler(async (req, res, next) => {
  if (
    !mongoose.Types.ObjectId.isValid(req.params.id) ||
    req.params.id === "undefined"
  ) {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }
  let loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  const {
    customerDetails,
    loanTerms,
    vehicleInformation,
    status: statusObj,
    clientResponse: topLevelClientResponse,
    nextFollowUpDate: topLevelNextFollowUpDate,
  } = req.body;

  // Global Loan Number Uniqueness Check
  if (loanTerms?.loanNumber && loanTerms.loanNumber !== loan.loanNumber) {
    const existingLoanWithNumber = await Promise.all([
      Loan.findOne({ loanNumber: loanTerms.loanNumber }),
      WeeklyLoan.findOne({ loanNumber: loanTerms.loanNumber }),
      DailyLoan.findOne({ loanNumber: loanTerms.loanNumber }),
    ]);

    if (existingLoanWithNumber.some((l) => l !== null)) {
      return next(new ErrorHandler("Loan number already exists", 400));
    }
  }

  // Support nested foreclosureDetails in status object
  const foreclosureDetails = statusObj?.foreclosureDetails;

  const currentPrincipal =
    loanTerms?.principalAmount !== undefined
      ? loanTerms.principalAmount
      : loan.principalAmount;
  const currentRoi =
    loanTerms?.annualInterestRate !== undefined
      ? loanTerms.annualInterestRate
      : loan.annualInterestRate;
  const currentTenure =
    loanTerms?.tenureMonths !== undefined
      ? loanTerms.tenureMonths
      : loan.tenureMonths;

  const monthlyEMI = calculateEMI(currentPrincipal, currentRoi, currentTenure);
  const calculatedTotalInterest = Math.ceil(
    parseFloat(currentPrincipal) *
      (parseFloat(currentRoi) / 100) *
      parseInt(currentTenure),
  );

  const updateData = {
    // Flatten customerDetails
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
    // Flatten loanTerms
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
    // Flatten vehicleInformation
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
    // Automatic Status Derivation
    status:
      statusObj?.status ||
      (foreclosureDetails?.foreclosureDate
        ? "Closed"
        : statusObj?.isSeized || loan.isSeized
          ? "Seized"
          : "Active"),

    paymentStatus: statusObj?.paymentStatus || loan.paymentStatus,
    isSeized:
      statusObj?.isSeized !== undefined ? statusObj.isSeized : loan.isSeized,
    docChecklist: statusObj?.docChecklist || loan.docChecklist,
    remarks: statusObj?.remarks || loan.remarks,
    clientResponse:
      statusObj?.clientResponse !== undefined
        ? statusObj.clientResponse
        : topLevelClientResponse !== undefined
          ? topLevelClientResponse
          : loan.clientResponse,
    nextFollowUpDate:
      statusObj?.nextFollowUpDate !== undefined
        ? statusObj.nextFollowUpDate || null
        : topLevelNextFollowUpDate !== undefined
          ? topLevelNextFollowUpDate || null
          : loan.nextFollowUpDate,

    // Flatten foreclosureDetails with sanitization
    foreclosedBy:
      extractId(foreclosureDetails?.foreclosedBy) || loan.foreclosedBy,
    foreclosureDate:
      foreclosureDetails?.foreclosureDate || loan.foreclosureDate,
    foreclosureAmount:
      foreclosureDetails?.foreclosureAmount !== undefined &&
      foreclosureDetails?.foreclosureAmount !== ""
        ? foreclosureDetails.foreclosureAmount
        : loan.foreclosureAmount,

    monthlyEMI,
    totalInterestAmount: calculatedTotalInterest,
    updatedBy: req.user._id,
  };

  loan = await Loan.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  // Handle SeizedVehicle, ClosedLoan, and Followup records after update
  if (updateData.status === "Seized" || updateData.isSeized) {
    await SeizedVehicle.findOneAndUpdate(
      { loanId: loan._id },
      {
        loanId: loan._id,
        loanModel: "Loan",
        seizedDate: loan.seizedDate || new Date(),
        status: loan.seizedStatus || "For Seizing",
        remarks: `Auto-created/updated via Loan sync. ${loan.remarks || ""}`,
        createdBy: req.user._id,
      },
      { upsert: true, new: true },
    );
  }

  if (
    updateData.status === "Closed" &&
    (updateData.foreclosureDate || loan.foreclosureDate)
  ) {
    await ClosedLoan.findOneAndUpdate(
      { loanId: loan._id },
      {
        loanId: loan._id,
        loanModel: "Loan",
        closureType: loan.soldDetails?.sellAmount ? "Sold" : "Foreclosure",
        closureDate: loan.foreclosureDate || new Date(),
        amount: loan.foreclosureAmount || 0,
        processedBy: loan.foreclosedBy || req.user._id,
        soldDetails: loan.soldDetails,
        remarks: `Auto-created/updated via Loan sync. ${loan.remarks || ""}`,
      },
      { upsert: true, new: true },
    );
  }

  if (
    topLevelClientResponse ||
    topLevelNextFollowUpDate ||
    statusObj?.clientResponse
  ) {
    await Followup.create({
      loanId: loan._id,
      loanModel: "Loan",
      loanType: "Monthly",
      followupDate: new Date(),
      clientResponse:
        topLevelClientResponse ||
        statusObj?.clientResponse ||
        loan.clientResponse,
      remarks: loan.remarks,
      nextFollowupDate: topLevelNextFollowUpDate || statusObj?.nextFollowUpDate,
      followedUpBy: req.user._id,
    });
  }

  // Refetch to include virtuals
  loan = await populateLoanDetails(Loan.findById(loan._id));

  // Synchronize EMIs if relevant terms changed
  if (loanTerms || customerDetails || (statusObj && statusObj.status)) {
    const emis = await EMI.find({ loanId: loan._id }).sort({ emiNumber: 1 });
    const oldTenure = emis.length;
    const newTenure = parseInt(currentTenure);
    const newEmiStartDate = loanTerms?.emiStartDate
      ? new Date(loanTerms.emiStartDate)
      : new Date(loan.emiStartDate);

    // 1. Update existing EMIs
    const updatePromises = emis.map((emi, index) => {
      const emiNum = index + 1;
      const updates = {};
      let hasChanges = false;

      // Update denormalized info only if different
      if (emi.customerName !== loan.customerName) {
        updates.customerName = loan.customerName;
        hasChanges = true;
      }
      if (emi.loanNumber !== loan.loanNumber) {
        updates.loanNumber = loan.loanNumber;
        hasChanges = true;
      }

      // Update EMI amount for pending/partially paid EMIs
      if (emi.status !== "Paid") {
        if (emi.emiAmount !== monthlyEMI) {
          updates.emiAmount = monthlyEMI;
          hasChanges = true;
        }
      }

      // Update due dates based on new emiStartDate
      const newDueDate = addMonths(new Date(newEmiStartDate), emiNum - 1);
      if (
        !emi.dueDate ||
        new Date(emi.dueDate).getTime() !== new Date(newDueDate).getTime()
      ) {
        updates.dueDate = newDueDate;
        hasChanges = true;
      }

      if (hasChanges) {
        // Maintain audit trail
        updates.updatedBy = req.user._id;
        return EMI.findByIdAndUpdate(emi._id, updates);
      }

      return null;
    });

    await Promise.all(updatePromises.filter((p) => p !== null));

    // 2. Handle Tenure Increase
    if (newTenure > oldTenure) {
      const extraEmis = [];
      for (let i = oldTenure + 1; i <= newTenure; i++) {
        extraEmis.push({
          loanId: loan._id,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
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
      // Remove extra EMIs only if they are Pending
      await EMI.deleteMany({
        loanId: loan._id,
        emiNumber: { $gt: newTenure },
        status: "Pending",
      });
    }
  }

  sendResponse(
    res,
    200,
    "success",
    "Loan updated and EMIs synchronized successfully",
    null,
    formatLoanResponse(loan),
  );
});

const toggleSeizedStatus = asyncHandler(async (req, res, next) => {
  if (
    !mongoose.Types.ObjectId.isValid(req.params.id) ||
    req.params.id === "undefined"
  ) {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }
  const loan = await Loan.findById(req.params.id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  loan.isSeized = !loan.isSeized;

  // Simultaneously update the status field to match isSeized
  if (loan.isSeized) {
    loan.status = "Seized";
    // loan.seizedDate = new Date(); // Removed to defer countdown
    loan.seizedStatus = "For Seizing";
  } else {
    // If we are un-seizing, revert to Active.
    loan.status = "Active";
    loan.seizedDate = undefined;
    loan.seizedStatus = undefined;
  }

  await loan.save();

  if (loan.isSeized) {
    await SeizedVehicle.findOneAndUpdate(
      { loanId: loan._id },
      {
        loanId: loan._id,
        loanModel: "Loan",
        seizedDate: new Date(),
        status: "For Seizing",
        remarks: "Status toggled to Seized",
        createdBy: req.user._id,
      },
      { upsert: true, new: true },
    );
  } else {
    // If un-seizing, we could update the SeizedVehicle status to Re-activate or delete it
    await SeizedVehicle.findOneAndUpdate(
      { loanId: loan._id },
      { status: "Re-activate", remarks: "Status toggled back to Active" },
    );
  }

  sendResponse(
    res,
    200,
    "success",
    `Loan ${loan.isSeized ? "seized" : "unseized"} successfully`,
    null,
    formatLoanResponse(loan),
  );
});
// export all values
const getPendingPayments = asyncHandler(async (req, res, next) => {
  const {
    customerName,
    loanNumber,
    vehicleNumber,
    mobileNumber,
    status,
    nextFollowUpDate,
    loanType: queryLoanType,
  } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const skip = (page - 1) * limit;

  let query = { status: { $ne: "Closed" } };

  if (customerName) {
    query.customerName = { $regex: customerName, $options: "i" };
  }
  if (loanNumber) {
    query.loanNumber = { $regex: loanNumber, $options: "i" };
  }
  if (vehicleNumber) {
    query.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
  }
  if (nextFollowUpDate) {
    const start = new Date(nextFollowUpDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(nextFollowUpDate);
    end.setHours(23, 59, 59, 999);
    query.nextFollowUpDate = { $gte: start, $lte: end };
  }

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const getPipeline = (modelName, loanType) => {
    let matchQuery = { ...query };

    if (mobileNumber) {
      if (modelName === "Loan") {
        matchQuery.$or = [
          { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
          { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
        ];
      } else {
        matchQuery.mobileNumber = { $regex: mobileNumber, $options: "i" };
      }
    }

    let pipeline = [
      { $match: matchQuery },
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
          pendingEmisList: {
            $filter: {
              input: "$emis",
              as: "emi",
              cond: {
                $and: [
                  { $ne: ["$$emi.status", "Paid"] },
                  // For "Partially Paid" status, we include them even if dueDate is in the future
                  // because they are already "Partial" records. For others (Pending/Overdue), we check dueDate.
                  {
                    $or: [
                      { $eq: ["$$emi.status", "Partially Paid"] },
                      { $lte: ["$$emi.dueDate", now] },
                    ],
                  },
                  status === "Pending"
                    ? { $in: ["$$emi.status", ["Pending", "Overdue"]] }
                    : status
                      ? { $eq: ["$$emi.status", status] }
                      : {
                          $in: [
                            "$$emi.status",
                            ["Pending", "Partially Paid", "Overdue"],
                          ],
                        },
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
          guarantorName: modelName === "Loan" ? 1 : { $literal: "—" },
          status: 1,
          mobileNumbers: modelName === "Loan" ? 1 : ["$mobileNumber"],
          guarantorMobileNumbers: modelName === "Loan" ? 1 : { $literal: [] },
          vehicleNumber: 1,
          model: 1,
          principalAmount: {
            $ifNull: [
              "$principalAmount",
              { $ifNull: ["$disbursementAmount", "$initialPrincipalAmount"] },
            ],
          },
          unpaidMonths: { $size: "$pendingEmisList" },
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
          updatedBy: { _id: 1, name: 1 },
          updatedAt: 1,
          paymentStatus: 1,
          loanModel: { $literal: modelName },
          loanType: { $literal: loanType },
        },
      },
    ];
    pipeline.push({
      $sort: loanNumber ? { loanNumber: 1 } : { createdAt: -1 }
    });
    return pipeline;
  };

  const getResultsWithCollation = async (model, pipeline) => {
    if (loanNumber) {
      return await model.aggregate(pipeline).collation({ locale: "en", numericOrdering: true });
    }
    return await model.aggregate(pipeline);
  };

  const promises = [];
  if (!queryLoanType || queryLoanType.toLowerCase() === "monthly") {
    promises.push(getResultsWithCollation(Loan, getPipeline("Loan", "Monthly")));
  } else {
    promises.push(Promise.resolve([]));
  }

  if (!queryLoanType || queryLoanType.toLowerCase() === "daily") {
    promises.push(getResultsWithCollation(DailyLoan, getPipeline("DailyLoan", "Daily")));
  } else {
    promises.push(Promise.resolve([]));
  }

  if (!queryLoanType || queryLoanType.toLowerCase() === "weekly") {
    promises.push(getResultsWithCollation(WeeklyLoan, getPipeline("WeeklyLoan", "Weekly")));
  } else {
    promises.push(Promise.resolve([]));
  }

  const [monthlyResult, dailyResult, weeklyResult] =
    await Promise.all(promises);

  let allResults = [...monthlyResult, ...dailyResult, ...weeklyResult].sort(
    (a, b) => {
      if (loanNumber) {
        // Numeric sort by loanNumber
        return a.loanNumber.localeCompare(b.loanNumber, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (!a.earliestDueDate) return 1;
      if (!b.earliestDueDate) return -1;
      return new Date(a.earliestDueDate) - new Date(b.earliestDueDate);
    },
  );

  const total = allResults.length;
  const paginatedResults = allResults.slice(skip, skip + limit);

  sendResponse(
    res,
    200,
    "success",
    "Pending payments fetched successfully",
    null,
    {
      payments: paginatedResults,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

const getPendingEmiDetails = asyncHandler(async (req, res, next) => {
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

  // Determine which collection to join with
  let fromCollection = "loans";
  if (currentEmi.loanModel === "DailyLoan") fromCollection = "dailyloans";
  if (currentEmi.loanModel === "WeeklyLoan") fromCollection = "weeklyloans";

  const emiDetails = await EMI.aggregate([
    {
      $match: {
        loanId: new mongoose.Types.ObjectId(currentEmi.loanId),
        status: { $ne: "Paid" },
        // Relax dueDate check for Partially Paid or the specific EMI being viewed
        $or: [
          { dueDate: { $lte: now } },
          { status: "Partially Paid" },
          { _id: new mongoose.Types.ObjectId(id) },
        ],
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
        from: fromCollection,
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
        loanModel: { $literal: currentEmi.loanModel || "Loan" },
        loanNumber: "$loan.loanNumber",
        customerName: "$loan.customerName",
        mobileNumbers: {
          $ifNull: [
            "$loan.mobileNumbers",
            {
              $cond: [
                { $ifNull: ["$loan.mobileNumber", false] },
                ["$loan.mobileNumber"],
                [],
              ],
            },
          ],
        },
        address: "$loan.address",
        guarantorName: { $ifNull: ["$loan.guarantorName", "—"] },
        guarantorMobileNumbers: {
          $ifNull: ["$loan.guarantorMobileNumbers", []],
        },
        vehicleNumber: "$loan.vehicleNumber",
        model: "$loan.model",
        engineNumber: "$loan.engineNumber",
        chassisNumber: "$loan.chassisNumber",
        principalAmount: "$loan.principalAmount",
        monthlyEMI: { $ifNull: ["$loan.monthlyEMI", "$emiAmount"] },
        emiAmount: "$emiAmount",
        amountPaid: "$amountPaid",
        status: "$status",
        dueDate: "$dueDate",
        overdue: "$overdue",
        remarks: "$remarks",
        paymentHistory: "$paymentHistory",
        clientResponse: "$loan.clientResponse",
        nextFollowUpDate: "$loan.nextFollowUpDate",
        updatedAt: "$loan.updatedAt",
        updatedBy: { $ifNull: ["$updatedUserInfo.name", "$loan.updatedBy"] },
        emiNumber: 1,
        paymentRecords: 1,
      },
    },
  ]);

  if (!emiDetails || emiDetails.length === 0) {
    return next(new ErrorHandler(`EMI details not found for ID: ${id}`, 404));
  }

  sendResponse(
    res,
    200,
    "success",
    "EMI details fetched successfully",
    null,
    emiDetails,
  );
});

const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }

  const loan = await Loan.findByIdAndUpdate(
    id,
    { paymentStatus },
    { new: true, runValidators: true },
  );

  if (!loan) {
    return next(new ErrorResponse("Loan not found", 404));
  }

  sendResponse(
    res,
    200,
    "success",
    "Payment status updated successfully",
    null,
    formatLoanResponse(loan),
  );
});

const getFollowupLoans = asyncHandler(async (req, res, next) => {
  const {
    customerName,
    loanNumber,
    vehicleNumber,
    mobileNumber,
    nextFollowUpDate,
    startDate,
    endDate,
    loanType: queryLoanType,
  } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const skip = (page - 1) * limit;

  // Filter for nextFollowUpDate
  let dateFilter = {};
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter = { nextFollowUpDate: { $gte: start, $lte: end } };
  } else {
    const dateToFilter =
      nextFollowUpDate || new Date().toISOString().split("T")[0];
    const start = new Date(dateToFilter);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateToFilter);
    end.setHours(23, 59, 59, 999);
    dateFilter = { nextFollowUpDate: { $gte: start, $lte: end } };
  }

  // Common filters
  let commonQuery = { ...dateFilter, status: { $ne: "Closed" } };
  if (customerName)
    commonQuery.customerName = { $regex: customerName, $options: "i" };
  if (loanNumber)
    commonQuery.loanNumber = { $regex: loanNumber, $options: "i" };
  if (vehicleNumber)
    commonQuery.vehicleNumber = { $regex: vehicleNumber, $options: "i" };

  // Helper function for aggregation pipeline
  const getPipeline = (modelName, loanType, mobileField) => {
    let pipeline = [{ $match: commonQuery }];

    if (mobileNumber) {
      if (modelName === "Loan") {
        pipeline[0].$match.$or = [
          { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
          { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
        ];
      } else {
        pipeline[0].$match.mobileNumber = {
          $regex: mobileNumber,
          $options: "i",
        };
      }
    }

    pipeline.push(
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
                  { $eq: ["$$emi.loanModel", modelName] },
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
          guarantorName: modelName === "Loan" ? 1 : { $literal: "—" },
          status: 1,
          mobileNumbers: modelName === "Loan" ? 1 : ["$mobileNumber"],
          guarantorMobileNumbers: modelName === "Loan" ? 1 : { $literal: [] },
          vehicleNumber: 1,
          model: 1,
          loanType: { $literal: loanType },
          loanModel: { $literal: modelName },
          unpaidMonths: { $size: "$pendingEmisList" },
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
          earliestEmiId: {
            $let: {
              vars: {
                firstPending: {
                  $arrayElemAt: [
                    {
                      $sortArray: {
                        input: "$pendingEmisList",
                        sortBy: { dueDate: 1 },
                      },
                    },
                    0,
                  ],
                },
              },
              in: { $toString: { $ifNull: ["$$firstPending._id", null] } },
            },
          },
          earliestDueDate: {
            $let: {
              vars: {
                sortedEmis: {
                  $sortArray: {
                    input: "$pendingEmisList",
                    sortBy: { dueDate: 1 },
                  },
                },
              },
              in: { $arrayElemAt: ["$$sortedEmis.dueDate", 0] },
            },
          },
          clientResponse: 1,
          nextFollowUpDate: 1,
          updatedBy: {
            _id: 1,
            name: 1,
          },
          updatedAt: 1,
        },
      },
    );
    pipeline.push({
      $sort: loanNumber ? { loanNumber: 1 } : { createdAt: -1 }
    });

    return pipeline;
  };

  const getResultsWithCollation = async (model, pipeline) => {
    if (loanNumber) {
      return await model.aggregate(pipeline).collation({ locale: "en", numericOrdering: true });
    }
    return await model.aggregate(pipeline);
  };

  // Run aggregations for models based on loanType filter
  const promises = [];

  if (!queryLoanType || queryLoanType.toLowerCase() === "monthly") {
    promises.push(getResultsWithCollation(Loan, getPipeline("Loan", "Monthly")));
  } else {
    promises.push(Promise.resolve([]));
  }

  if (!queryLoanType || queryLoanType.toLowerCase() === "daily") {
    promises.push(getResultsWithCollation(DailyLoan, getPipeline("DailyLoan", "Daily")));
  } else {
    promises.push(Promise.resolve([]));
  }

  if (!queryLoanType || queryLoanType.toLowerCase() === "weekly") {
    promises.push(getResultsWithCollation(WeeklyLoan, getPipeline("WeeklyLoan", "Weekly")));
  } else {
    promises.push(Promise.resolve([]));
  }

  if (!queryLoanType || queryLoanType.toLowerCase() === "interest") {
    promises.push(getResultsWithCollation(InterestLoan, getPipeline("InterestLoan", "Interest")));
  } else {
    promises.push(Promise.resolve([]));
  }

  const [monthlyFollowups, dailyFollowups, weeklyFollowups, interestFollowups] =
    await Promise.all(promises);

  // Combine and sort
  let allFollowups = [
    ...monthlyFollowups,
    ...dailyFollowups,
    ...weeklyFollowups,
    ...interestFollowups,
  ].sort((a, b) => {
    if (loanNumber) {
      // Numeric sort by loanNumber
      return a.loanNumber.localeCompare(b.loanNumber, undefined, { numeric: true, sensitivity: 'base' });
    }
    // Sort by earliestDueDate ascending
    if (!a.earliestDueDate) return 1;
    if (!b.earliestDueDate) return -1;
    return new Date(a.earliestDueDate) - new Date(b.earliestDueDate);
  });

  const total = allFollowups.length;
  const paginatedFollowups = allFollowups.slice(skip, skip + limit);

  sendResponse(
    res,
    200,
    "success",
    "Follow-up loans fetched successfully",
    null,
    {
      payments: paginatedFollowups,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

const updateFollowup = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { loanModel, clientResponse, nextFollowUpDate } = req.body;

  let Model;
  if (loanModel === "Loan") Model = Loan;
  else if (loanModel === "DailyLoan") Model = DailyLoan;
  else if (loanModel === "WeeklyLoan") Model = WeeklyLoan;
  else if (loanModel === "InterestLoan") Model = InterestLoan;
  else {
    return next(new ErrorHandler("Invalid loan model provided", 400));
  }

  const loan = await Model.findById(id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Update the loan document
  loan.clientResponse =
    clientResponse !== undefined ? clientResponse : loan.clientResponse;
  loan.nextFollowUpDate =
    nextFollowUpDate !== undefined
      ? nextFollowUpDate
        ? new Date(nextFollowUpDate)
        : null
      : loan.nextFollowUpDate;

  loan.updatedBy = req.user?._id;
  await loan.save();

  // Create follow-up history record
  if (clientResponse || nextFollowUpDate !== undefined) {
    const loanType =
      loanModel === "Loan" ? "Monthly" : loanModel.replace("Loan", "");

    await Followup.create({
      loanId: loan._id,
      loanModel,
      loanType,
      followupDate: new Date(),
      clientResponse: clientResponse || loan.clientResponse,
      nextFollowupDate: loan.nextFollowUpDate,
      followedUpBy: req.user?._id,
    });
  }

  sendResponse(
    res,
    200,
    "success",
    "Follow-up updated successfully",
    null,
    loan,
  );
});

const getFollowupHistory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const history = await Followup.find({ loanId: id })
    .sort({ followupDate: -1 })
    .populate("followedUpBy", "name email");

  sendResponse(
    res,
    200,
    "success",
    "Follow-up history fetched successfully",
    null,
    history,
  );
});

const getForeclosureLoans = asyncHandler(async (req, res, next) => {
  const { loanNumber, customerName, mobileNumber, vehicleNumber } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const skip = (page - 1) * limit;

  const query = {};
  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (vehicleNumber)
    query.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
  if (mobileNumber) {
    query.$or = [
      { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
      { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
    ];
  }

  const result = await Loan.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "emis",
        localField: "_id",
        foreignField: "loanId",
        as: "emis",
      },
    },
    {
      $project: {
        loanId: "$_id",
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        principalAmount: 1,
        tenureMonths: 1,
        monthlyEMI: 1,
        status: 1,
        paidEmis: {
          $size: {
            $filter: {
              input: "$emis",
              as: "e",
              cond: { $eq: ["$$e.status", "Paid"] },
            },
          },
        },
        totalPaidAmount: { $sum: "$emis.amountPaid" },
        clientResponse: 1,
      },
    },
    {
      $addFields: {
        remainingPrincipal: {
          $max: [
            0,
            {
              $subtract: [
                "$principalAmount",
                {
                  $multiply: [
                    "$paidEmis",
                    {
                      $divide: [
                        { $toDouble: "$principalAmount" },
                        { $toInt: "$tenureMonths" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        foreclosureAmount: "$remainingPrincipal",
      },
    },
    { $sort: { loanNumber: 1 } },
    {
      $facet: {
        loans: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const loans = result[0].loans;
  const total = result[0].totalCount[0]?.count || 0;

  sendResponse(
    res,
    200,
    "success",
    "Foreclosure loans fetched successfully",
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

const forecloseLoan = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    remainingPrincipal,
    totalAmount,
    paymentBreakdown, // Array of { mode, amount }
    paymentDate,
    remarks,
    paymentMode,
    chequeNumber,
  } = req.body;

  const loan = await Loan.findById(id);
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Check for Payment Approval Authority
  const isSuperAdmin = req.user.role === "SUPER_ADMIN";
  const hasApprovalAuthority = req.user.permissions?.paymentApproval;

  if (!isSuperAdmin && !hasApprovalAuthority) {
    const Approval = require("../models/Approval");
    const existingApproval = await Approval.findOne({
      targetId: loan._id,
      status: "Pending",
    });

    if (existingApproval) {
      return next(new ErrorHandler("This foreclosure is already waiting for approval", 400));
    }

    await Approval.create({
      requestType: "FORECLOSURE",
      targetId: loan._id,
      targetModel: "Loan",
      loanNumber: loan.loanNumber,
      customerName: loan.customerName || "Customer",
      requestedData: { ...req.body, loanId: loan._id },
      requestedBy: req.user._id,
      status: "Pending",
    });

    // Notify Admins
    const { notifyApprovalCountChange, notifyAdmins } = require("./notificationController");
    await notifyAdmins({
      senderId: req.user._id,
      type: "PAYMENT_REQUEST",
      title: "New Foreclosure Approval Request",
      message: `Employee ${req.user.name} requested approval for Foreclosure of ₹${req.body.totalAmount || 0} for loan ${loan.loanNumber} (${loan.customerName}).`,
      data: {
        loanNumber: loan.loanNumber,
        customerName: loan.customerName,
        amount: req.body.totalAmount || 0,
        employeeName: req.user.name,
        loanId: loan._id,
        loanType: "Loan",
        targetId: loan._id,
      },
    });

    // Notify count change for real-time badge updates
    await notifyApprovalCountChange();

    loan.status = "Waiting for Approval";
    loan.updatedBy = req.user._id;
    await loan.save();

    return sendResponse(res, 200, "success", "Foreclosure submitted for approval", null, loan);
  }

  if (loan.status === "Closed") {
    return next(new ErrorHandler("the loan has been closed already", 400));
  }

  // 0. Amount Validation
  const totalReceived = (paymentBreakdown || []).reduce(
    (acc, curr) => acc + parseFloat(curr.amount || 0),
    0,
  );

  if (totalReceived < parseFloat(totalAmount) - 0.1) {
    return next(
      new ErrorHandler(
        `Received total (₹${totalReceived}) is less than total foreclosure amount (₹${totalAmount})`,
        400,
      ),
    );
  }

  const pDate = paymentDate ? new Date(paymentDate) : new Date();
  const pMode =
    (paymentBreakdown || []).map((p) => p.mode).join(", ") || "CASH";

  // 1. Update Loan status to Closed
  const updatedLoan = await Loan.findByIdAndUpdate(
    id,
    {
      status: "Closed",
      paymentStatus: "Closed",
      remarks: remarks || `Foreclosed on ${pDate.toLocaleDateString()}`,
      foreclosedBy: req.user?._id,
      foreclosureDate: pDate,
      foreclosureAmount: totalAmount,
      remainingPrincipal,
      paymentMode: paymentMode || "Cash",
      chequeNumber: paymentMode === "Cheque" ? chequeNumber : undefined,
    },
    { new: true },
  )
    .populate("createdBy", "name")
    .populate("foreclosedBy", "name")
    .populate("updatedBy", "name");

  // 2. Update all pending/partial EMIs for this loan to "Paid"
  await EMI.updateMany(
    {
      loanId: id,
      status: { $ne: "Paid" },
    },
    {
      $set: {
        status: "Paid",
        paymentDate: pDate,
        paymentMode: pMode,
        remarks: `Loan foreclosed. Total Payment: ₹${totalAmount} via ${pMode}`,
      },
    },
  );

  // 3. Create Payment Records for each mode in breakdown
  let targetEmiId = null;
  const firstJustPaidEmi = await EMI.findOne({
    loanId: id,
    status: "Paid",
    paymentDate: pDate,
  }).sort({ emiNumber: 1 });

  if (firstJustPaidEmi) {
    targetEmiId = firstJustPaidEmi._id;
  } else {
    // Fallback: Get the absolute last EMI for this loan if no pending ones were found to mark as paid
    const lastEmi = await EMI.findOne({ loanId: id }).sort({ emiNumber: -1 });
    if (lastEmi) targetEmiId = lastEmi._id;
  }

  const Payment = require("../models/Payment");
  const paymentRecords = (paymentBreakdown || []).map((p) => ({
    emiId: targetEmiId,
    loanId: id,
    loanModel: loan.loanModel || "Loan",
    amount: parseFloat(p.amount),
    totalAmount: parseFloat(p.amount),
    mode: p.mode,
    paymentDate: pDate,
    paymentType: "Foreclosure",
    status: "Success",
    remarks: `Foreclosure Split-Payment (${p.mode}) for Loan ${loan.loanNumber}`,
    collectedBy: req.user._id,
  }));

  if (paymentRecords.length > 0) {
    await Payment.insertMany(paymentRecords);
  }

  sendResponse(res, 200, "success", "Loan foreclosed successfully", null, {
    loan: formatLoanResponse(updatedLoan),
  });
});

const getSeizedVehicles = asyncHandler(async (req, res, next) => {
  const { loanNumber, customerName, vehicleNumber, mobileNumber } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const skip = (page - 1) * limit;

  const query = { isSeized: true };

  if (loanNumber) query.loanNumber = { $regex: loanNumber, $options: "i" };
  if (customerName)
    query.customerName = { $regex: customerName, $options: "i" };
  if (vehicleNumber)
    query.vehicleNumber = { $regex: vehicleNumber, $options: "i" };
  if (mobileNumber) {
    query.$or = [
      { mobileNumbers: { $regex: mobileNumber, $options: "i" } },
      { guarantorMobileNumbers: { $regex: mobileNumber, $options: "i" } },
    ];
  }

  const result = await Loan.aggregate([
    { $match: query },
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
            cond: { $ne: ["$$emi.status", "Paid"] },
          },
        },
      },
    },
    {
      $project: {
        loanNumber: 1,
        customerName: 1,
        mobileNumbers: 1,
        vehicleNumber: 1,
        seizedDate: 1,
        seizedStatus: 1,
        updatedAt: 1,
        createdAt: 1,
        unpaidMonths: { $size: "$pendingEmisList" },
        totalDueAmount: {
          $reduce: {
            input: "$pendingEmisList",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                {
                  $subtract: [
                    "$$this.emiAmount",
                    { $ifNull: ["$$this.amountPaid", 0] },
                  ],
                },
              ],
            },
          },
        },
        clientResponse: 1,
      },
    },
    { $sort: { seizedDate: -1, updatedAt: -1 } },
    {
      $facet: {
        vehicles: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const vehicles = result[0].vehicles;
  const total = result[0].totalCount[0]?.count || 0;

  sendResponse(
    res,
    200,
    "success",
    "Seized vehicles fetched successfully",
    null,
    {
      vehicles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  );
});

const updateSeizedStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { seizedStatus, soldDetails } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id) || id === "undefined") {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }

  const validStatuses = ["For Seizing", "Seized", "Sold", "Re-activate"];
  if (!validStatuses.includes(seizedStatus)) {
    return next(new ErrorHandler("Invalid seized status", 400));
  }

  const existingLoan = await Loan.findById(id);
  if (!existingLoan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Once status is 'Sold', it cannot be changed back
  if (existingLoan.seizedStatus === "Sold") {
    return next(
      new ErrorHandler(
        "This vehicle has already been sold and the status cannot be changed.",
        400,
      ),
    );
  }

  const updateData = { seizedStatus };

  // If status is changed to 'Seized', set the seizedDate to start countdown
  if (seizedStatus === "Seized") {
    updateData.seizedDate = new Date();
  }

  // If Sold: record sale details and close the loan
  if (seizedStatus === "Sold") {
    if (!soldDetails || !soldDetails.sellAmount) {
      return next(new ErrorHandler("Please provide sale details", 400));
    }
    updateData.status = "Closed";
    updateData.soldDetails = {
      ...soldDetails,
      soldDate: soldDetails.soldDate || new Date(),
      soldBy: req.user._id,
    };
  }

  // If Re-activate: un-seize the loan and revert to Active
  if (seizedStatus === "Re-activate") {
    updateData.isSeized = false;
    updateData.status = "Active";
    updateData.seizedDate = undefined;
    updateData.soldDetails = undefined;
  }

  const loan = await Loan.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: false },
  );

  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  sendResponse(
    res,
    200,
    "success",
    `Seized status updated to ${seizedStatus}`,
    null,
    {
      _id: loan._id,
      seizedStatus: loan.seizedStatus,
      status: loan.status,
      seizedDate: loan.seizedDate,
    },
  );
});

// @desc    Get consolidated to-do list
// @route   GET /api/loans/todo-list
// @access  Private
const getTodoList = asyncHandler(async (req, res, next) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Include everything until end of today

  const [followups, hpEntries, rtoWorks] = await Promise.all([
    // 1. Follow-ups (Loans with nextFollowUpDate <= today and status Active)
    Loan.find({
      status: "Active",
      nextFollowUpDate: { $lte: today },
    })
      .select("loanNumber customerName mobileNumbers nextFollowUpDate")
      .lean(),

    // 2. HP Entry Applications
    Loan.find({
      status: "Active",
      hpEntry: "Applied",
    })
      .select("loanNumber customerName vehicleNumber hpEntry")
      .lean(),

    // 3. RTO Work Pending
    Loan.find({
      status: "Active",
      rtoWorkPending: { $exists: true, $not: { $size: 0 } },
    })
      .select("loanNumber customerName vehicleNumber rtoWorkPending")
      .lean(),
  ]);

  sendResponse(res, 200, "success", "To-do list fetched successfully", null, {
    followups,
    hpEntries,
    rtoWorks,
  });
});

const deleteLoan = asyncHandler(async (req, res, next) => {
  const loan = await Loan.findById(req.params.id);

  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  // Delete associated records
  await Promise.all([
    EMI.deleteMany({ loanId: loan._id, loanModel: "Loan" }),
    Payment.deleteMany({ loanId: loan._id, loanModel: "Loan" }),
    SeizedVehicle.deleteMany({ loanId: loan._id, loanModel: "Loan" }),
    ClosedLoan.deleteMany({ loanId: loan._id, loanModel: "Loan" }),
    Followup.deleteMany({ loanId: loan._id, loanModel: "Loan" }),
  ]);

  await loan.deleteOne();

  sendResponse(
    res,
    200,
    "success",
    "Loan and all associated records deleted successfully",
  );
});

// export all values
const checkLoanNumberUniqueness = asyncHandler(async (req, res, next) => {
  const { loanNumber } = req.params;

  if (!loanNumber) {
    return next(new ErrorHandler("Please provide a loan number", 400));
  }

  const existingLoan = await Promise.all([
    Loan.findOne({ loanNumber: loanNumber.toUpperCase() }),
    WeeklyLoan.findOne({ loanNumber: loanNumber.toUpperCase() }),
    DailyLoan.findOne({ loanNumber: loanNumber.toUpperCase() }),
  ]);

  const exists = existingLoan.some((loan) => loan !== null);

  if (exists) {
    return next(new ErrorHandler("Loan number already exists", 400));
  }

  sendResponse(res, 200, "success", "Loan number is available", null, {
    available: true,
  });
});

module.exports = {
  createLoan,
  getAllLoans,
  getLoanByLoanNumber,
  getLoanById,
  updateLoan,
  toggleSeizedStatus,
  calculateEMIApi,
  getPendingPayments,
  getFollowupLoans,
  getPendingEmiDetails,
  updatePaymentStatus,
  getForeclosureLoans,
  forecloseLoan,
  getSeizedVehicles,
  updateSeizedStatus,
  updateFollowup,
  getFollowupHistory,
  getTodoList,
  deleteLoan,
  checkLoanNumberUniqueness,
};
