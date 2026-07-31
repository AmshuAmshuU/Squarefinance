// Shared helper for keeping the Payment collection (source of truth for the
// Collections tab) in sync with an EMI's own paymentHistory/overdue arrays
// (source of truth for what was actually paid).
//
// Replaces two different, both-buggy approaches that used to live separately
// in each of the 4 payment-recording code paths (delta/bucket math in the
// direct-save paths, "isAlreadyRecorded" exact-match checks in the approval
// paths). Both approaches tried to add only what was "new" relative to the
// prior state, and both ended up creating spurious extra Payment records
// whenever an edit/correction didn't exactly match the prior entry - because
// neither one ever removed the now-superseded Payment record.
//
// This helper sidesteps that whole class of bug: every time an EMI's
// payment/overdue data changes, wipe out its EMI-derived Payment records
// (never touches Foreclosure/Vehicle Sale/Processing Fee records, which
// aren't derived from paymentHistory at all) and recreate them fresh from
// whatever paymentHistory/overdue currently say - grouped by date, matching
// how the app has always displayed one Collections entry per payment date.
const Payment = require("../models/Payment");

/**
 * @param {Object} params
 * @param {Object} params.emi - the EMI/InterestEMI document (or plain object) AFTER
 *   paymentHistory/overdue have been finalized for this save.
 * @param {String} params.loanId
 * @param {String} params.loanModel - "Loan" | "WeeklyLoan" | "DailyLoan" | "InterestLoan"
 * @param {String} params.emiPaymentType - "Monthly" | "Weekly" | "Daily" | "Interest"
 * @param {String} params.collectedBy - user id to attribute fresh Payment records to
 * @param {String} [params.remarks]
 */
async function syncEmiPayments({ emi, loanId, loanModel, emiPaymentType, collectedBy, remarks }) {
  // 1. Wipe existing EMI-derived Payment records for this EMI (leaves any
  // Foreclosure/Vehicle Sale/Processing Fee Payment records untouched).
  await Payment.deleteMany({ emiId: emi._id, paymentType: { $in: [emiPaymentType, "Overdue"] } });

  // 2. Recreate EMI payment records, grouped by date.
  const emiGroups = {};
  (emi.paymentHistory || []).forEach((p) => {
    const amount = parseFloat(p.amount) || 0;
    if (amount <= 0) return;
    const key = new Date(p.date).toISOString().split("T")[0];
    if (!emiGroups[key]) emiGroups[key] = { date: p.date, amount: 0, modes: new Set(), chequeNumbers: new Set() };
    emiGroups[key].amount += amount;
    if (p.mode) emiGroups[key].modes.add(p.mode);
    if (p.chequeNumber) emiGroups[key].chequeNumbers.add(p.chequeNumber);
  });
  for (const key in emiGroups) {
    const g = emiGroups[key];
    await Payment.create({
      emiId: emi._id,
      loanId,
      loanModel,
      amount: g.amount,
      emiAmount: g.amount,
      totalAmount: g.amount,
      mode: g.modes.size > 0 ? Array.from(g.modes).join(", ") : "Cash",
      chequeNumber: g.chequeNumbers.size > 0 ? Array.from(g.chequeNumbers).join(", ") : "",
      paymentDate: g.date,
      paymentType: emiPaymentType,
      status: "Success",
      remarks: remarks || "",
      collectedBy,
    });
  }

  // 3. Recreate overdue payment records, grouped by date.
  const overdueGroups = {};
  (emi.overdue || []).forEach((p) => {
    const amount = parseFloat(p.amount) || 0;
    if (amount <= 0) return;
    const key = new Date(p.date).toISOString().split("T")[0];
    if (!overdueGroups[key]) overdueGroups[key] = { date: p.date, amount: 0, modes: new Set(), chequeNumbers: new Set() };
    overdueGroups[key].amount += amount;
    if (p.mode) overdueGroups[key].modes.add(p.mode);
    if (p.chequeNumber) overdueGroups[key].chequeNumbers.add(p.chequeNumber);
  });
  for (const key in overdueGroups) {
    const g = overdueGroups[key];
    await Payment.create({
      emiId: emi._id,
      loanId,
      loanModel,
      amount: g.amount,
      overdueAmount: g.amount,
      totalAmount: g.amount,
      mode: g.modes.size > 0 ? Array.from(g.modes).join(", ") : "Cash",
      chequeNumber: g.chequeNumbers.size > 0 ? Array.from(g.chequeNumbers).join(", ") : "",
      paymentDate: g.date,
      paymentType: "Overdue",
      status: "Success",
      remarks: remarks || "Overdue Payment",
      collectedBy,
    });
  }
}

module.exports = { syncEmiPayments };
