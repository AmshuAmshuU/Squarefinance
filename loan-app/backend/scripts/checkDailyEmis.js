require("dotenv").config();
const mongoose = require("mongoose");
const EMI = require("../models/EMI");

const check = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected\n");

  const emis = await EMI.find({ loanModel: "DailyLoan" }).limit(5);
  console.log(`Found ${emis.length} daily loan EMIs`);
  emis.forEach(e => {
    console.log(`EMI #${e.emiNumber} - loanModel: ${e.loanModel}, status: ${e.status}, loanNumber: ${e.loanNumber}`);
  });

  // Also check if any EMIs exist without loanModel
  const noModel = await EMI.find({ loanModel: { $exists: false } }).limit(5);
  console.log(`\nEMIs without loanModel: ${noModel.length}`);
  noModel.forEach(e => {
    console.log(`  EMI #${e.emiNumber}, loanNumber: ${e.loanNumber}, status: ${e.status}`);
  });

  process.exit(0);
};

check().catch(err => { console.error(err); process.exit(1); });
