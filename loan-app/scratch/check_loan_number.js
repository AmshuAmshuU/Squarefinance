const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const InterestLoan = require("../backend/models/InterestLoan");
// I'll also check other loan models if I can find them
const Loan = require("../backend/models/Loan");
const DailyLoan = require("../backend/models/DailyLoan");
const WeeklyLoan = require("../backend/models/WeeklyLoan");

async function checkLoan(loanNumber) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const results = {
      InterestLoan: await InterestLoan.findOne({ loanNumber }),
      MonthlyLoan: await Loan.findOne({ loanNumber }),
      DailyLoan: await DailyLoan.findOne({ loanNumber }),
      WeeklyLoan: await WeeklyLoan.findOne({ loanNumber }),
    };

    console.log(`Results for ${loanNumber}:`);
    for (const [model, loan] of Object.entries(results)) {
      if (loan) {
        console.log(`- Found in ${model}: ID ${loan._id}, Status ${loan.status}`);
      } else {
        console.log(`- Not found in ${model}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

const numToCheck = process.argv[2] || "501";
checkLoan(numToCheck);
