const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Loan = require("../models/Loan");
const EMI = require("../models/EMI");

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const count = await EMI.countDocuments();
    console.log(`Total EMIs in database: ${count}`);

    const loans = await Loan.find();
    for (const loan of loans) {
      const emiCount = await EMI.countDocuments({ loanId: loan._id });
      console.log(`Loan ${loan.loanNumber}: ${emiCount} EMIs`);
      if (emiCount > 0) {
        const sample = await EMI.findOne({ loanId: loan._id });
        console.log(
          `  Sample EMI: Number ${sample.emiNumber}, Amount ${sample.emiAmount}, Status ${sample.status}`
        );
      }
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

check();
