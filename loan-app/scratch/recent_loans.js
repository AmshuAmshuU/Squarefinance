const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });

const InterestLoan = require("../backend/models/InterestLoan");

async function listRecentLoans() {
  try {
    console.log("Connecting to:", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const loans = await InterestLoan.find().sort({ createdAt: -1 }).limit(10);
    
    console.log("Recent Interest Loans:");
    loans.forEach(l => {
        console.log(`- ${l.loanNumber}: ID ${l._id}, Customer: ${l.customerName}, CreatedAt: ${l.createdAt}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listRecentLoans();
