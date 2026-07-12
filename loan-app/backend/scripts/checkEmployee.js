require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const check = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: "test@gmail.com" });
  console.log("Role:", user.role);
  console.log("Permissions:", JSON.stringify(user.permissions, null, 2));
  process.exit(0);
};

check().catch(err => { console.error(err); process.exit(1); });
