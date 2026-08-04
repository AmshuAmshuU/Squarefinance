// Shared ROI calculation utilities (XIRR + absolute return), used by both
// the per-loan ROI card and the business-wide Analytics ROI card.
//
// Methodology, agreed with Karthik (2026-08-04/05): build a dated cash-flow
// ledger - every rupee disbursed is a negative flow on its real date, every
// rupee actually collected is a positive flow on its real date. Two
// annualized (XIRR) numbers and two non-annualized (absolute) numbers:
//   - Realistic XIRR / Absolute (incl. outstanding): outstanding/future
//     money is placed on its own real scheduled due date where one exists
//     (Vehicle/Weekly/Daily loans generate their full EMI schedule with
//     real due dates at creation), or at the "as of" date where no real
//     date exists at all (Interest loan remaining principal - open-ended
//     by design; or anything that was already due but uncollected as of
//     that date).
//   - Liquidation XIRR: same total outstanding amount, collapsed into one
//     lump sum dated at the "as of" date - the "sell the whole book on
//     that date" scenario.
//   - Absolute return so far: only cash actually collected by the "as of"
//     date vs cash disbursed by then, no outstanding counted at all.
// Assumes zero risk / no NPAs (Karthik's explicit instruction) - every
// outstanding rupee is treated as fully collectible.
//
// "As of" date support (2026-08-05): every builder takes an optional
// asOfDate (default: now). A loan that is CURRENTLY Closed contributes
// nothing to future/pending once asOfDate is on/after its "effective
// closure date" (foreclosure/sold date, or the last genuine payment date
// if it just paid off normally) - nothing more was ever actually
// collected on it, so it shouldn't appear "still outstanding" as of a
// date on or after that. If asOfDate is BEFORE that closure date, the
// loan genuinely was still active back then, so its not-yet-collected-by-
// then EMIs correctly count as outstanding as of that historical point.
// This is a reasonable approximation, not a certified historical
// reconstruction - we only have CURRENT EMI status/paymentDate, not a
// full audit trail of every status change.

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function npv(rate, flows, d0) {
  return flows.reduce((sum, f) => sum + f.amount / Math.pow(1 + rate, (f.date - d0) / YEAR_MS), 0);
}
function npvDerivative(rate, flows, d0) {
  return flows.reduce((sum, f) => {
    const years = (f.date - d0) / YEAR_MS;
    if (years === 0) return sum;
    return sum - (years * f.amount) / Math.pow(1 + rate, years + 1);
  }, 0);
}

// Returns the annualized rate (e.g. 0.5325 for 53.25%), or null if it can't
// be solved (all flows on the same day, or no sign change in the cash flows).
function xirr(flows) {
  if (!flows || flows.length < 2) return null;
  const sorted = [...flows].sort((a, b) => a.date - b.date);
  const d0 = sorted[0].date;
  const spanYears = (sorted[sorted.length - 1].date - d0) / YEAR_MS;
  if (spanYears < 1 / 365) return null;

  const hasPositive = sorted.some((f) => f.amount > 0);
  const hasNegative = sorted.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  let rate = 0.2;
  for (let i = 0; i < 200; i++) {
    const f = npv(rate, sorted, d0);
    const fPrime = npvDerivative(rate, sorted, d0);
    if (Math.abs(fPrime) < 1e-9) break;
    let next = rate - f / fPrime;
    if (next <= -0.99) next = -0.99 + 0.001;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }

  let lo = -0.99, hi = 50;
  let fLo = npv(lo, sorted, d0);
  let fHi = npv(hi, sorted, d0);
  if (fLo * fHi > 0) { hi = 500; fHi = npv(hi, sorted, d0); }
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, sorted, d0);
    if (Math.abs(fMid) < 1) return mid;
    if (fLo * fMid < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}

// hist: [{date, amount}] real, already-happened flows (negative = disbursed, positive = collected)
// future: [{date, amount}] real scheduled future flows (positive only), after asOfDate
// pending: number - outstanding amount with no better date than asOfDate itself
//   (either genuinely undated, like Interest loan principal, or was already
//   due by asOfDate but not yet collected by then)
function computeROI(hist, future, pending = 0, asOfDate = new Date()) {
  const futureTotal = (future || []).reduce((s, f) => s + f.amount, 0) + (pending || 0);

  const realisticFlows = [...hist, ...(future || [])];
  if (pending > 0) realisticFlows.push({ date: asOfDate, amount: pending });

  const liquidationFlows = futureTotal > 0
    ? [...hist, { date: asOfDate, amount: futureTotal }]
    : [...hist];

  const disbursed = hist.filter((f) => f.amount < 0).reduce((s, f) => s - f.amount, 0);
  const collectedSoFar = hist.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0);

  return {
    outstanding: futureTotal,
    disbursed,
    collectedSoFar,
    realisticXirr: xirr(realisticFlows),
    liquidationXirr: xirr(liquidationFlows),
    absoluteReturnSoFar: disbursed > 0 ? ((collectedSoFar - disbursed) / disbursed) * 100 : null,
    absoluteReturnInclOutstanding: disbursed > 0 ? ((collectedSoFar + futureTotal - disbursed) / disbursed) * 100 : null,
  };
}

// Latest real date among a loan's genuine (non-phantom) paid EMIs, used as
// a fallback "when did this normally-paid-off loan actually finish" date.
function latestPaidEmiDate(emis) {
  let latest = null;
  for (const emi of emis) {
    if (emi.status === "Paid" && !emi.closedWithoutPayment && emi.paymentDate) {
      const d = new Date(emi.paymentDate);
      if (!latest || d > latest) latest = d;
    }
  }
  return latest;
}

// ---- Cash-flow builders per loan type (pure functions - loan/emis already fetched) ----

function vehicleLoanFlows(loan, emis, asOfDate = new Date()) {
  const hist = [], future = [];
  let pending = 0;
  const disbDate = loan.dateLoanDisbursed ? new Date(loan.dateLoanDisbursed) : null;
  if (disbDate && disbDate > asOfDate) return { hist, future, pending };

  if (Array.isArray(loan.disbursement) && loan.disbursement.length > 0) {
    loan.disbursement.forEach((d) => { if (new Date(d.date) <= asOfDate) hist.push({ date: new Date(d.date), amount: -(d.amount || 0) }); });
  } else if (disbDate) {
    hist.push({ date: disbDate, amount: -(loan.principalAmount || 0) });
  }
  if (loan.processingFee && disbDate && disbDate <= asOfDate) hist.push({ date: disbDate, amount: loan.processingFee });

  for (const emi of emis) {
    const wasPaidByThen = emi.status === "Paid" && !emi.closedWithoutPayment && emi.amountPaid && emi.paymentDate && new Date(emi.paymentDate) <= asOfDate;
    if (wasPaidByThen) hist.push({ date: new Date(emi.paymentDate), amount: emi.amountPaid });
    (emi.overdue || []).forEach((ov) => {
      if (ov.amount && ov.date && new Date(ov.date) <= asOfDate) hist.push({ date: new Date(ov.date), amount: ov.amount });
    });
  }

  const forecloseDate = loan.foreclosureDate ? new Date(loan.foreclosureDate) : null;
  if (forecloseDate && forecloseDate <= asOfDate && loan.foreclosureAmount) {
    hist.push({ date: forecloseDate, amount: loan.foreclosureAmount });
  }
  const soldDate = loan.soldDetails?.soldDate ? new Date(loan.soldDetails.soldDate) : null;
  if (soldDate && soldDate <= asOfDate && loan.soldDetails?.totalAmount) {
    hist.push({ date: soldDate, amount: loan.soldDetails.totalAmount });
  }

  // Nothing more was ever collected once genuinely closed - only compute
  // outstanding-as-of-then if the loan was still open at asOfDate.
  const isClosed = (loan.status || "").toLowerCase() === "closed";
  const effectiveClosureDate = isClosed ? (forecloseDate || soldDate || latestPaidEmiDate(emis)) : null;
  const wasStillOpen = !isClosed || !effectiveClosureDate || asOfDate < effectiveClosureDate;

  if (wasStillOpen) {
    for (const emi of emis) {
      const wasPaidByThen = emi.status === "Paid" && !emi.closedWithoutPayment && emi.amountPaid && emi.paymentDate && new Date(emi.paymentDate) <= asOfDate;
      if (wasPaidByThen || emi.closedWithoutPayment) continue; // already counted, or a phantom bulk-close entry
      // Always use the EMI's own real due date, even if it's already in
      // the past relative to asOfDate (overdue) - that's still a real,
      // known reference point, not something to arbitrarily collapse.
      future.push({ date: emi.dueDate ? new Date(emi.dueDate) : asOfDate, amount: emi.emiAmount || 0 });
    }
  }
  return { hist, future, pending };
}

function weeklyDailyLoanFlows(loan, emis, asOfDate = new Date()) {
  const hist = [], future = [];
  let pending = 0;
  const disbDate = loan.dateLoanDisbursed ? new Date(loan.dateLoanDisbursed) : null;
  if (disbDate && disbDate > asOfDate) return { hist, future, pending };

  if (Array.isArray(loan.disbursement) && loan.disbursement.length > 0) {
    loan.disbursement.forEach((d) => { if (new Date(d.date) <= asOfDate) hist.push({ date: new Date(d.date), amount: -(d.amount || 0) }); });
  } else if (disbDate) {
    hist.push({ date: disbDate, amount: -(loan.disbursementAmount || 0) });
  }
  if (loan.processingFee && disbDate && disbDate <= asOfDate) hist.push({ date: disbDate, amount: loan.processingFee });

  for (const emi of emis) {
    const wasPaidByThen = emi.status === "Paid" && !emi.closedWithoutPayment && emi.amountPaid && emi.paymentDate && new Date(emi.paymentDate) <= asOfDate;
    if (wasPaidByThen) hist.push({ date: new Date(emi.paymentDate), amount: emi.amountPaid });
    (emi.overdue || []).forEach((ov) => {
      if (ov.amount && ov.date && new Date(ov.date) <= asOfDate) hist.push({ date: new Date(ov.date), amount: ov.amount });
    });
  }

  const isClosed = (loan.status || "").toLowerCase() === "closed";
  const effectiveClosureDate = isClosed ? latestPaidEmiDate(emis) : null;
  const wasStillOpen = !isClosed || !effectiveClosureDate || asOfDate < effectiveClosureDate;

  if (wasStillOpen) {
    for (const emi of emis) {
      const wasPaidByThen = emi.status === "Paid" && !emi.closedWithoutPayment && emi.amountPaid && emi.paymentDate && new Date(emi.paymentDate) <= asOfDate;
      if (wasPaidByThen || emi.closedWithoutPayment) continue;
      future.push({ date: emi.dueDate ? new Date(emi.dueDate) : asOfDate, amount: emi.emiAmount || 0 });
    }
  }
  return { hist, future, pending };
}

function interestLoanFlows(loan, emis, asOfDate = new Date()) {
  const hist = [], future = [];
  let pending = 0;
  const startDate = loan.startDate ? new Date(loan.startDate) : null;
  if (startDate && startDate > asOfDate) return { hist, future, pending };

  if (Array.isArray(loan.disbursement) && loan.disbursement.length > 0) {
    loan.disbursement.forEach((d) => { if (new Date(d.date) <= asOfDate) hist.push({ date: new Date(d.date), amount: -(d.amount || 0) }); });
  } else if (startDate) {
    hist.push({ date: startDate, amount: -(loan.initialPrincipalAmount || 0) });
  }

  for (const emi of emis) {
    if (emi.status === "Paid" && emi.interestAmount && emi.paymentDate && new Date(emi.paymentDate) <= asOfDate) {
      hist.push({ date: new Date(emi.paymentDate), amount: emi.interestAmount });
    }
  }
  const paidPrincipalEntries = (loan.principalPayments || []).filter((p) => p.paymentDate && new Date(p.paymentDate) <= asOfDate);
  paidPrincipalEntries.forEach((p) => { if (p.amount) hist.push({ date: new Date(p.paymentDate), amount: p.amount }); });

  const isClosed = (loan.status || "").toLowerCase() === "closed";
  if (!isClosed) {
    // Not-yet-collected interest EMIs (Interest loans don't pre-generate a
    // future schedule, so anything unpaid is either already due or is the
    // one currently-generated EMI - either way, no better date than asOfDate)
    for (const emi of emis) {
      const wasPaidByThen = emi.status === "Paid" && emi.interestAmount && emi.paymentDate && new Date(emi.paymentDate) <= asOfDate;
      if (wasPaidByThen || !emi.interestAmount) continue;
      future.push({ date: emi.dueDate ? new Date(emi.dueDate) : asOfDate, amount: emi.interestAmount });
    }

    // Remaining principal as of asOfDate - no fixed schedule, so genuinely undated
    const principalPaidByThen = paidPrincipalEntries.reduce((s, p) => s + (p.amount || 0), 0);
    const remainingAsOfDate = Math.max(0, (loan.initialPrincipalAmount || 0) - principalPaidByThen);
    if (remainingAsOfDate > 0) pending += remainingAsOfDate;
  }

  return { hist, future, pending };
}

module.exports = { xirr, computeROI, vehicleLoanFlows, weeklyDailyLoanFlows, interestLoanFlows };
