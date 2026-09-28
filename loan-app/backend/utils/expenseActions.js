// Shared expense create/edit/delete logic. Employees' expense changes go
// through Super Admin approval (2026-09-28) - the controller queues an
// Approval request, and approvalController runs these same functions when
// it's approved, so a direct Super Admin save and an approved request always
// produce exactly the same result.
const Expense = require("../models/Expense");
const Loan = require("../models/Loan");
const DailyLoan = require("../models/DailyLoan");
const WeeklyLoan = require("../models/WeeklyLoan");

const findLoanByNumber = async (loanNumber) => {
  if (!loanNumber) return null;
  return (
    (await Loan.findOne({ loanNumber })) ||
    (await DailyLoan.findOne({ loanNumber })) ||
    (await WeeklyLoan.findOne({ loanNumber }))
  );
};

const createExpenseRecord = async (fields, createdBy) => {
  const { loanNumber, vehicleNumber, particulars, date, amount, isOfficeExpense } = fields;
  const loan = !isOfficeExpense ? await findLoanByNumber(loanNumber) : null;

  return Expense.create({
    loanId: loan ? loan._id : null,
    loanNumber: isOfficeExpense ? "OFFICE" : loanNumber,
    vehicleNumber: isOfficeExpense ? "-" : vehicleNumber || (loan ? loan.vehicleNumber : null),
    particulars,
    date: date || Date.now(),
    amount,
    isOfficeExpense: isOfficeExpense || false,
    createdBy,
  });
};

const updateExpenseRecord = async (expense, fields) => {
  const { loanNumber, vehicleNumber, particulars, date, amount, isOfficeExpense } = fields;

  if (loanNumber && loanNumber !== expense.loanNumber) {
    const loan = await findLoanByNumber(loanNumber);
    expense.loanId = loan ? loan._id : null;
    expense.loanNumber = isOfficeExpense ? "OFFICE" : loanNumber;
    expense.vehicleNumber = isOfficeExpense
      ? "-"
      : vehicleNumber || (loan ? loan.vehicleNumber : expense.vehicleNumber);
  }

  if (particulars !== undefined) expense.particulars = particulars;
  if (date !== undefined) expense.date = date;
  if (amount !== undefined) expense.amount = amount;
  if (isOfficeExpense !== undefined) expense.isOfficeExpense = isOfficeExpense;

  await expense.save();
  return expense;
};

// ---- Display helpers for the approval card (same {label, oldValue,
// newValue} shape the Loan Edit request card already renders) ----
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "-");
const fmtAmount = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const describeExpense = (e) => [
  { label: "Loan / Office", value: e.isOfficeExpense ? "Office expense" : e.loanNumber || "-" },
  { label: "Vehicle", value: e.vehicleNumber || "-" },
  { label: "Particulars", value: e.particulars || "-" },
  { label: "Date", value: fmtDate(e.date) },
  { label: "Amount", value: fmtAmount(e.amount) },
];

const changesForAdd = (fields) =>
  describeExpense({
    ...fields,
    loanNumber: fields.isOfficeExpense ? "OFFICE" : fields.loanNumber,
    date: fields.date || new Date(),
  }).map((r) => ({ label: r.label, oldValue: "—", newValue: r.value }));

const changesForDelete = (expense) =>
  describeExpense(expense).map((r) => ({ label: r.label, oldValue: r.value, newValue: "Will be deleted" }));

// Only fields that actually differ from the current record.
const changesForEdit = (expense, fields) => {
  const before = describeExpense(expense);
  const after = describeExpense({
    isOfficeExpense: fields.isOfficeExpense !== undefined ? fields.isOfficeExpense : expense.isOfficeExpense,
    loanNumber: fields.loanNumber !== undefined ? fields.loanNumber : expense.loanNumber,
    vehicleNumber: fields.vehicleNumber !== undefined ? fields.vehicleNumber : expense.vehicleNumber,
    particulars: fields.particulars !== undefined ? fields.particulars : expense.particulars,
    date: fields.date !== undefined ? fields.date : expense.date,
    amount: fields.amount !== undefined ? fields.amount : expense.amount,
  });
  return before
    .map((b, i) => ({ label: b.label, oldValue: b.value, newValue: after[i].value }))
    .filter((c) => c.oldValue !== c.newValue);
};

module.exports = {
  findLoanByNumber,
  createExpenseRecord,
  updateExpenseRecord,
  changesForAdd,
  changesForDelete,
  changesForEdit,
};
