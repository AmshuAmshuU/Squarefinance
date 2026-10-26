// "Tenure over" mark (red circled T) for Weekly and Daily loans.
//
// A loan is flagged when it is Active, its planned tenure has finished (the date of the
// LAST EMI is before today, IST - so the mark appears the day after the last due date),
// and it still has at least one EMI not fully paid. A part-paid EMI counts as unpaid.
// Checked against the EMI records of every active Weekly/Daily loan on 2026-10-26: the
// loan's own emiEndDate / remainingEmis agree with the EMI records every time.

// Midnight at the start of today, IST, as a real instant
const istTodayStart = () => {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 60 * 60 * 1000);
};

// Aggregation expression. `unpaidCountExpr` = an expression giving the number of not-fully-paid EMIs.
// `$gt: ["$emiEndDate", null]` is only true when a date exists (a missing date must not count as "past").
const tenureOverExpr = (unpaidCountExpr) => ({
  $and: [
    { $eq: ["$status", "Active"] },
    { $gt: ["$emiEndDate", null] },
    { $lt: ["$emiEndDate", istTodayStart()] },
    { $gt: [unpaidCountExpr, 0] },
  ],
});

// Same rule for a plain loan object (unpaidCount = EMIs not fully paid)
const isTenureOver = (loan, unpaidCount) => {
  if (!loan || loan.status !== "Active" || !loan.emiEndDate) return false;
  return new Date(loan.emiEndDate) < istTodayStart() && (unpaidCount || 0) > 0;
};

module.exports = { istTodayStart, tenureOverExpr, isTenureOver };
