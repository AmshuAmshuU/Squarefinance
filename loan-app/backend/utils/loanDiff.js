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

module.exports = { computeLoanDiff };
