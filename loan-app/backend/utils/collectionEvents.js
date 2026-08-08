// Single source of truth for "what has been collected" across the whole
// business - built 2026-08-06 to replace the Payment collection as what
// Collections (and now the Excel export + Analytics trend chart) actually
// read from. Every other part of the app (Analytics main stats, Profit,
// Simple Stats, ROI, Company Valuation) already read EMI/Loan data
// directly rather than the separate Payment collection; Collections was
// the one exception, and that gap is exactly what caused a real payment on
// loan 111 to display correctly inside the loan but silently vanish from
// Collections (a Payment record combining two same-day, different-mode
// payments could no longer be matched back to the individual paymentHistory
// entries that produced it). Reading straight from the EMI/Loan documents
// themselves - the same place the loan's own payment schedule reads from -
// makes that whole category of bug structurally impossible: there is only
// one place this data lives, so there is nothing left to fall out of sync.
//
// The Payment collection itself is untouched by this change and keeps
// being written to (attribution/audit trail), it's just no longer what
// Collections, the Excel export, or the trend chart use to decide what to
// display.
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const InterestLoan = require("../models/InterestLoan");
const EMI = require("../models/EMI");
const InterestEMI = require("../models/InterestEMI");
const User = require("../models/User");

const extractId = (val) => {
  if (!val) return null;
  if (typeof val === "object" && val._id) return String(val._id);
  return String(val);
};

// Builds every individual collection event across all 4 loan types:
//   - Vehicle/Weekly/Daily/Interest EMI payments (one event per
//     paymentHistory entry - a same-day payment split across two modes
//     produces TWO events here, exactly matching what the loan's own
//     schedule shows, rather than one combined figure that has to be
//     matched back afterward)
//   - Vehicle/Weekly/Daily/Interest overdue payments (one event per
//     overdue entry)
//   - Vehicle foreclosure settlements
//   - Vehicle sold-vehicle settlements
//   - Interest loan principal repayments
// Processing fees are intentionally excluded - Collections has never shown
// them (Simple Stats / Analytics cover those separately).
async function getAllCollectionEvents({ startDate, endDate } = {}) {
  const [
    vehicleLoans, vehicleEmis,
    weeklyLoans, weeklyEmis,
    dailyLoans, dailyEmis,
    interestLoans, interestEmis,
    users,
  ] = await Promise.all([
    Loan.find({}).select("loanNumber customerName foreclosureDate foreclosureAmount foreclosedBy paymentMode soldDetails").lean(),
    // updatedBy is required here even though paymentHistory entries carry
    // their own addedBy - overdue entries have no per-entry attribution
    // field, so addEmiEvents() below falls back to the EMI's own updatedBy
    // for Overdue-type events. Omitting it here silently made every
    // Overdue row's collector show "System" regardless of who actually
    // collected it (found 2026-08-08, loan 16 EMI 11).
    EMI.find({ loanModel: "Loan" }).select("loanId emiNumber paymentHistory overdue updatedBy").lean(),
    WeeklyLoan.find({}).select("loanNumber customerName").lean(),
    EMI.find({ loanModel: "WeeklyLoan" }).select("loanId emiNumber paymentHistory overdue updatedBy").lean(),
    DailyLoan.find({}).select("loanNumber customerName").lean(),
    EMI.find({ loanModel: "DailyLoan" }).select("loanId emiNumber paymentHistory overdue updatedBy").lean(),
    InterestLoan.find({}).select("loanNumber customerName principalPayments").lean(),
    InterestEMI.find({}).select("interestLoanId emiNumber paymentHistory overdue updatedBy").lean(),
    User.find({}).select("name").lean(),
  ]);

  const userMap = {};
  users.forEach((u) => { userMap[String(u._id)] = u.name; });
  const nameOf = (id) => (id ? userMap[extractId(id)] || "System" : "System");

  const groupBy = (arr, key) => {
    const map = {};
    arr.forEach((e) => {
      const k = String(e[key]);
      (map[k] = map[k] || []).push(e);
    });
    return map;
  };
  const vehicleEmisByLoan = groupBy(vehicleEmis, "loanId");
  const weeklyEmisByLoan = groupBy(weeklyEmis, "loanId");
  const dailyEmisByLoan = groupBy(dailyEmis, "loanId");
  const interestEmisByLoan = groupBy(interestEmis, "interestLoanId");

  const events = [];

  const addEmiEvents = (loan, loanModel, paymentType, emis) => {
    for (const emi of emis) {
      (emi.paymentHistory || []).forEach((ph) => {
        if (!ph.amount) return;
        events.push({
          loanId: loan._id,
          loanModel,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          emiNo: emi.emiNumber,
          emiAmount: ph.amount,
          overdueAmount: 0,
          totalAmount: ph.amount,
          paymentType,
          paymentMode: ph.mode || "",
          date: ph.date,
          updatedBy: nameOf(ph.addedBy),
        });
      });
      (emi.overdue || []).forEach((ov) => {
        if (!ov.amount) return;
        events.push({
          loanId: loan._id,
          loanModel,
          loanNumber: loan.loanNumber,
          customerName: loan.customerName,
          emiNo: emi.emiNumber,
          emiAmount: 0,
          overdueAmount: ov.amount,
          totalAmount: ov.amount,
          paymentType: "Overdue",
          paymentMode: ov.mode || "",
          date: ov.date,
          // overdue entries aren't individually attributed (no addedBy on
          // this sub-schema) - fall back to whoever last touched the EMI.
          updatedBy: nameOf(emi.updatedBy),
        });
      });
    }
  };

  // Vehicle
  for (const loan of vehicleLoans) {
    addEmiEvents(loan, "Loan", "Monthly", vehicleEmisByLoan[String(loan._id)] || []);
    if (loan.foreclosureDate && loan.foreclosureAmount) {
      events.push({
        loanId: loan._id, loanModel: "Loan", loanNumber: loan.loanNumber, customerName: loan.customerName,
        emiNo: "-", emiAmount: 0, overdueAmount: 0, totalAmount: loan.foreclosureAmount,
        paymentType: "Foreclosure", paymentMode: loan.paymentMode || "",
        date: loan.foreclosureDate, updatedBy: nameOf(loan.foreclosedBy),
      });
    }
    if (loan.soldDetails?.totalAmount && loan.soldDetails?.soldDate) {
      events.push({
        loanId: loan._id, loanModel: "Loan", loanNumber: loan.loanNumber, customerName: loan.customerName,
        emiNo: "-", emiAmount: 0, overdueAmount: 0, totalAmount: loan.soldDetails.totalAmount,
        paymentType: "Vehicle Sale", paymentMode: loan.soldDetails.paymentMode || "",
        date: loan.soldDetails.soldDate, updatedBy: nameOf(loan.soldDetails.soldBy),
      });
    }
  }

  // Weekly
  for (const loan of weeklyLoans) {
    addEmiEvents(loan, "WeeklyLoan", "Weekly", weeklyEmisByLoan[String(loan._id)] || []);
  }

  // Daily
  for (const loan of dailyLoans) {
    addEmiEvents(loan, "DailyLoan", "Daily", dailyEmisByLoan[String(loan._id)] || []);
  }

  // Interest - EMI (interest) payments use paymentType "Interest" to match
  // existing behaviour; principal repayments use "Interest Loan Principal"
  // (matches the label introduced earlier this session).
  for (const loan of interestLoans) {
    addEmiEvents(loan, "InterestLoan", "Interest", interestEmisByLoan[String(loan._id)] || []);
    (loan.principalPayments || []).forEach((p) => {
      if (!p.amount) return;
      events.push({
        loanId: loan._id, loanModel: "InterestLoan", loanNumber: loan.loanNumber, customerName: loan.customerName,
        emiNo: "-", emiAmount: 0, overdueAmount: 0, totalAmount: p.amount,
        paymentType: "Interest Loan Principal", paymentMode: p.paymentMode || "",
        date: p.paymentDate, updatedBy: nameOf(p.addedBy),
      });
    });
  }

  let filtered = events;
  if (startDate || endDate) {
    const start = startDate ? new Date(`${startDate}T00:00:00+05:30`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999+05:30`) : null;
    filtered = events.filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  return filtered;
}

module.exports = { getAllCollectionEvents };
