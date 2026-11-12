// Which single payment mode to record on a loan when it is foreclosed.
//
// The foreclosure screens collect the real mode(s) per row in the "payment breakdown" (CASH / ONLINE / CHEQUE),
// but they also carry a separate top-level paymentMode that stays on its default ("Online") because nothing on
// the screen changes it. The loan used to be saved with that default, so a foreclosure paid in CASH showed as
// Online on the Collections page (found 2026-11-12, loan W62). The breakdown is the truth, so the loan's mode
// is now taken from it: the mode that carries the most money (a split payment records its main mode - one
// loan field can hold only one). Falls back to the old top-level value when there is no breakdown.
const LABEL = { CASH: "Cash", ONLINE: "Online", CHEQUE: "Cheque" };

const foreclosureModeFromBreakdown = (paymentBreakdown, fallbackMode, fallbackChequeNumber) => {
  const rows = (Array.isArray(paymentBreakdown) ? paymentBreakdown : []).filter((p) => parseFloat(p?.amount) > 0);
  if (!rows.length) {
    return { paymentMode: fallbackMode || "Online", chequeNumber: fallbackChequeNumber };
  }
  const totals = new Map();
  for (const p of rows) {
    const label = LABEL[String(p.mode || "").trim().toUpperCase()] || "Online"; // PhonePe, GPay, UPI... are online
    totals.set(label, (totals.get(label) || 0) + parseFloat(p.amount));
  }
  let best = null;
  for (const [label, total] of totals) if (best === null || total > totals.get(best)) best = label;
  const chequeRow = rows.find((p) => String(p.mode || "").toUpperCase() === "CHEQUE" && p.chequeNumber);
  return { paymentMode: best, chequeNumber: chequeRow ? chequeRow.chequeNumber : fallbackChequeNumber };
};

module.exports = { foreclosureModeFromBreakdown };
