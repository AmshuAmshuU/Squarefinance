const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("../models/User");

// Load .env
dotenv.config({ path: path.join(__dirname, "../.env") });

const createSuperAdmin = async () => {
  try {
    const uri = "mongodb+srv://subscription_db_user:6OwTMIkJCHpappWK@loan-app.vx0zkkt.mongodb.net/?appName=Loan-app";
    console.log("Using hardcoded URI for connection...");

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected successfully.");

    const email = "squarefinance2025@gmail.com";
    const password = "12345678";
    const accessKey = "admin123";

    let user = await User.findOne({ email });

    if (user) {
      console.log("User already exists. Updating to SUPER_ADMIN...");
      user.password = password;
      user.role = "SUPER_ADMIN";
      user.accessKey = accessKey;
      user.isActive = true;
      // Grant all permissions for Super Admin
      user.permissions = {
        loans: { view: true, create: true, edit: true, delete: true },
        weeklyLoans: { view: true, create: true, edit: true, delete: true },
        dailyLoans: { view: true, create: true, edit: true, delete: true },
        emis: { view: true, create: true, edit: true, delete: true },
        vehicles: { view: true, create: true, edit: true, delete: true },
        payments: { view: true, create: true, edit: true, delete: true },
        documents: { view: true, create: true, edit: true, delete: true },
        analytics: { view: true, create: true, edit: true, delete: true },
        dashboard: { view: true, create: true, edit: true, delete: true },
        expenses: { view: true, create: true, edit: true, delete: true },
      };
      await user.save();
      console.log("Super Admin updated successfully.");
    } else {
      console.log("Creating new Super Admin...");
      await User.create({
        name: "Square Finance Admin",
        email,
        password,
        role: "SUPER_ADMIN",
        accessKey,
        isActive: true,
        permissions: {
          loans: { view: true, create: true, edit: true, delete: true },
          weeklyLoans: { view: true, create: true, edit: true, delete: true },
          dailyLoans: { view: true, create: true, edit: true, delete: true },
          emis: { view: true, create: true, edit: true, delete: true },
          vehicles: { view: true, create: true, edit: true, delete: true },
          payments: { view: true, create: true, edit: true, delete: true },
          documents: { view: true, create: true, edit: true, delete: true },
          analytics: { view: true, create: true, edit: true, delete: true },
          dashboard: { view: true, create: true, edit: true, delete: true },
          expenses: { view: true, create: true, edit: true, delete: true },
        },
      });
      console.log("Super Admin created successfully.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error creating Super Admin:");
    console.error(error);
    process.exit(1);
  }
};

createSuperAdmin();
