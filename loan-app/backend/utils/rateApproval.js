// Vehicle loans: an interest rate below 2.00 (but above 0) may only be used
// with a Super Admin's approval. Blank / 0 means "rate not entered yet" and is
// always allowed (a loan can be created with just a loan number).
const MIN_FREE_RATE = 2;
const APPROVAL_VALID_HOURS = 24;

const needsRateApproval = (rate) => {
  const r = parseFloat(rate);
  return Number.isFinite(r) && r > 0 && r < MIN_FREE_RATE;
};

module.exports = { MIN_FREE_RATE, APPROVAL_VALID_HOURS, needsRateApproval };
