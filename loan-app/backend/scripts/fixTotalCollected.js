require("dotenv").config();
const mongoose = require("mongoose");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const EMI = require("../models/EMI");

const fix = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to database");

  // Fix all weekly loans
  const weeklyLoans = await WeeklyLoan.find({});
  console.log(`Found ${weeklyLoans.length} weekly loans`);

  for (const loan of weeklyLoans) {
    const allEmis = await EMI.find({ loanId: loan._id, loanModel: "WeeklyLoan" });
    const paidCount = allEmis.filter(e => e.status === "Paid").length;

    const totalEmiCollected = allEmis.reduce((acc, emi) => {
      const paid = (emi.paymentHistory || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      const od = (emi.overdue || []).reduce((s, ov) => s + (parseFloat(ov.amount) || 0), 0);
      return acc + paid + od;
    }, 0);

    const correctCollected = Math.ceil(totalEmiCollected + (loan.processingFee || 0));
    const correctRemaining = Math.max(0, Math.ceil((loan.disbursementAmount || 0) - (loan.emiAmount || 0) * paidCount));

    console.log(`Weekly ${loan.loanNumber}: totalCollected ${loan.totalCollected} → ${correctCollected}, remainingPrincipal ${loan.remainingPrincipalAmount} → ${correctRemaining}`);
    await WeeklyLoan.findByIdAndUpdate(loan._id, {
      totalCollected: correctCollected,
      remainingPrincipalAmount: correctRemaining,
    });
  }

  // Fix all daily loans
  const dailyLoans = await DailyLoan.find({});
  console.log(`\nFound ${dailyLoans.length} daily loans`);

  for (const loan of dailyLoans) {
    const allEmis = await EMI.find({ loanId: loan._id, loanModel: "DailyLoan" });
    const paidCount = allEmis.filter(e => e.status === "Paid").length;

    const totalEmiCollected = allEmis.reduce((acc, emi) => {
      const paid = (emi.paymentHistory || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      const od = (emi.overdue || []).reduce((s, ov) => s + (parseFloat(ov.amount) || 0), 0);
      return acc + paid + od;
    }, 0);

    const correctCollected = Math.ceil(totalEmiCollected + (loan.processingFee || 0));
    const correctRemaining = Math.max(0, Math.ceil((loan.disbursementAmount || 0) - (loan.emiAmount || 0) * paidCount));

    console.log(`Daily ${loan.loanNumber}: totalCollected ${loan.totalCollected} → ${correctCollected}, remainingPrincipal ${loan.remainingPrincipalAmount} → ${correctRemaining}`);
    await DailyLoan.findByIdAndUpdate(loan._id, {
      totalCollected: correctCollected,
      remainingPrincipalAmount: correctRemaining,
    });
  }

  console.log("\nAll done!");
  process.exit(0);
};

fix().catch(err => { console.error(err); process.exit(1); });
