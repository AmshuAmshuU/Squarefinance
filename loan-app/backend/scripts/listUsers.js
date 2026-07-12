require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const list = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected\n");

  const users = await User.find({}, "name email role accessKey isActive");
  console.log(`Found ${users.length} users:\n`);
  users.forEach(u => {
    console.log(`Name: ${u.name}`);
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${u.role}`);
    console.log(`Access Key: ${u.accessKey}`);
    console.log(`Active: ${u.isActive}`);
    console.log("---");
  });

  process.exit(0);
};

list().catch(err => { console.error(err); process.exit(1); });
