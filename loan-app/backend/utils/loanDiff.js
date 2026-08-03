// Fields to track for loan edit approvals - human readable labels
const LOAN_FIELDS = {
  customerName: "Customer Name",
  mobileNumbers: "Mobile Numbers",
  guarantorName: "Guarantor Name",
  guarantorMobileNumbers: "Guarantor Mobile Numbers",
  address: "Address",
  ownRent: "Own/Rent",
  panNumber: "PAN Number",
  aadharNumber: "Aadhar Number",
  pledgedItemDetails: "Pledged Item Details",
  disbursementAmount: "Disbursement Amount",
  principalAmount: "Principal Amount",
  interestRate: "Interest Rate (%)",
  annualInterestRate: "Annual Interest Rate (%)",
  processingFeeRate: "Processing Fee Rate (%)",
  tenureMonths: "Tenure (Months)",
  totalEmis: "Tenure (Days/Weeks)",
  dateLoanDisbursed: "Date Loan Disbursed",
  emiStartDate: "EMI Start Date",
  vehicleNumber: "Vehicle Number",
  typeOfVehicle: "Type of Vehicle",
  modelYear: "Model Year",
  chassisNumber: "Chassis Number",
  engineNumber: "Engine Number",
  hpEntry: "HP Entry",
  fcDate: "FC Date",
  insuranceDate: "Insurance Date",
  rtoWorkPending: "RTO Work Pending",
  rtoWorkStatus: "RTO Work Status",
  rtoDocsSubmittedDate: "RTO Docs Submitted Date",
  rtoCompletedDate: "RTO Completed Date",
  rtoNotes: "RTO Notes",
  remarks: "Remarks",
  // NOTE: clientResponse and nextFollowUpDate are intentionally excluded
  // They are handled freely by employees via the updateFollowup endpoint
};

const formatValue = (val) => {
  if (val === null || val === undefined || val === "") return "—";
  if (Array.isArray(val)) return val.join(", ");
  if (val instanceof Date || (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/))) {
    const d = new Date(val);
    if (!isNaN(d)) return d.toLocaleDateString("en-IN");
  }
  return String(val);
};

const computeLoanDiff = (oldLoan, newData) => {
  const changes = [];
  for (const [field, label] of Object.entries(LOAN_FIELDS)) {
    const oldVal = formatValue(oldLoan[field]);
    const newVal = formatValue(newData[field]);
    if (oldVal !== newVal && newData[field] !== undefined) {
      changes.push({ field, label, oldValue: oldVal, newValue: newVal });
    }
  }
  return changes;
};

// Fields to track for Interest loan edit approvals. Separate from
// LOAN_FIELDS/computeLoanDiff above (which is Vehicle-loan-specific field
// names) - reusing that function for Interest loans always reported "no
// changes" for genuine edits, since none of its tracked fields exist on an
// InterestLoan, including the one field that actually matters here:
// principalPayments (an array of payment objects, which needs its own
// length-based check rather than the simple value-formatting comparison
// used for scalar fields below).
const INTEREST_LOAN_FIELDS = {
  customerName: "Customer Name",
  mobileNumbers: "Mobile Numbers",
  guarantorName: "Guarantor Name",
  guarantorMobileNumbers: "Guarantor Mobile Numbers",
  address: "Address",
  ownRent: "Own/Rent",
  panNumber: "PAN Number",
  aadharNumber: "Aadhar Number",
  pledgedItemDetails: "Pledged Item Details",
  initialPrincipalAmount: "Principal Amount",
  interestRate: "Interest Rate (%)",
  processingFeeRate: "Processing Fee Rate (%)",
  startDate: "Date Loan Disbursed",
  emiStartDate: "EMI Start Date",
  remarks: "Remarks",
  // clientResponse/nextFollowUpDate intentionally excluded - handled freely
  // by employees via updateFollowup, same as the Vehicle-loan equivalent.
};

const computeInterestLoanDiff = (oldLoan, newData) => {
  const changes = [];
  for (const [field, label] of Object.entries(INTEREST_LOAN_FIELDS)) {
    const oldVal = formatValue(oldLoan[field]);
    const newVal = formatValue(newData[field]);
    if (oldVal !== newVal && newData[field] !== undefined) {
      changes.push({ field, label, oldValue: oldVal, newValue: newVal });
    }
  }

  const oldPayments = oldLoan.principalPayments || [];
  const newPayments = newData.principalPayments;
  if (Array.isArray(newPayments) && newPayments.length > oldPayments.length) {
    const added = newPayments.slice(oldPayments.length);
    const addedTotal = added.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    changes.push({
      field: "principalPayments",
      label: "Principal Payment",
      oldValue: "—",
      newValue: `₹${addedTotal.toLocaleString("en-IN")}`,
    });
  }

  return changes;
};

module.exports = { computeLoanDiff, computeInterestLoanDiff };
