require("dotenv").config();
const mongoose = require("mongoose");
const Payment = require("../models/Payment");

const fix = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected");

  // Find payments with foreclosure in remarks but wrong paymentType
  const result = await Payment.updateMany(
    { remarks: { $regex: /foreclosure/i }, paymentType: { $ne: "Foreclosure" } },
    { $set: { paymentType: "Foreclosure" } }
  );

  console.log(`Fixed ${result.modifiedCount} foreclosure payment records`);
  process.exit(0);
};

fix().catch(err => { console.error(err); process.exit(1); });
