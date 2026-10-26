// "Tenure over" mark (red circled T) for Weekly, Daily and Vehicle loans.
//
// A loan is flagged when its status counts, its planned tenure has finished (the date of the
// LAST EMI is before today, IST - so the mark appears the day after the last due date),
// and it still has at least one EMI not fully paid. A part-paid EMI counts as unpaid.
//   - Weekly / Daily: status "Active" only (Karthik, 2026-10-26)
//   - Vehicle: "Active", "For Seizing" and "Seized" - a seized or for-seizing vehicle still
//     owes the money, so it keeps the mark (Karthik asked for it on the Seized Vehicles list).
// Checked against the EMI records of every active Weekly/Daily/Vehicle loan on 2026-10-26: the
// loan's own emiEndDate agrees with the EMI records every time.

const ACTIVE_ONLY = ["Active"];
const VEHICLE_STATUSES = ["Active", "For Seizing", "Seized"];

// Midnight at the start of today, IST, as a real instant
const istTodayStart = () => {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 60 * 60 * 1000);
};

// Aggregation expression. `unpaidCountExpr` = an expression giving the number of not-fully-paid EMIs.
// `$gt: ["$emiEndDate", null]` is only true when a date exists (a missing date must not count as "past").
const tenureOverExpr = (unpaidCountExpr, statuses = ACTIVE_ONLY) => ({
  $and: [
    { $in: ["$status", statuses] },
    { $gt: ["$emiEndDate", null] },
    { $lt: ["$emiEndDate", istTodayStart()] },
    { $gt: [unpaidCountExpr, 0] },
  ],
});

// Same rule for a plain loan object (unpaidCount = EMIs not fully paid)
const isTenureOver = (loan, unpaidCount, statuses = ACTIVE_ONLY) => {
  if (!loan || !statuses.includes(loan.status) || !loan.emiEndDate) return false;
  return new Date(loan.emiEndDate) < istTodayStart() && (unpaidCount || 0) > 0;
};

module.exports = { ACTIVE_ONLY, VEHICLE_STATUSES, istTodayStart, tenureOverExpr, isTenureOver };
