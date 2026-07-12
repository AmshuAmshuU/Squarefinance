const express = require("express");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const errorMiddleware = require("./middlewares/error");
const authRoutes = require("./routes/authroutes");
const userRoutes = require("./routes/userroutes");
const loanRoutes = require("./routes/loanRoutes");
const customerRoutes = require("./routes/customerroutes");
const emiUtilityRoutes = require("./routes/emiUtilityRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const weeklyLoanRoutes = require("./routes/weeklyLoanRoutes");
const dailyLoanRoutes = require("./routes/dailyLoanRoutes");
const loanEmiRoutes = require("./routes/loanEmiRoutes");
const todoRoutes = require("./routes/todoRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const contactRoutes = require("./routes/contactRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const interestLoanRoutes = require("./routes/interestLoanRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { checkLoanNumberUniqueness } = require("./controllers/loanController");
const compression = require("compression");

const app = express();

// 1. Performance Monitoring Middleware (Global)
app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const duration = (performance.now() - start).toFixed(2);
    console.log(`[PERF] ${req.method} ${req.originalUrl} - ${duration}ms`);
  });
  next();
});

// 2. Global Compression
app.use(compression());

// Health Check & Root
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
});

app.get("/", (req, res) => {
  res.status(200).send("Loan App Backend is running");
});

// Trust proxy for secure cookies in production
app.set("trust proxy", 1);

// Allow multiple origins for CORS
const rawAllowedOrigins = process.env.FRONTEND_URL || "";
const allowedOrigins = rawAllowedOrigins
  .split(",")
  .map((o) => o.trim().replace(/\/$/, "")) // Remove trailing slashes
  .filter((o) => o !== "");

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, "");
      
      // Always allow localhost for development convenience
      const isLocalhost = normalizedOrigin.includes("localhost:") || normalizedOrigin.includes("127.0.0.1:");
      
      if (allowedOrigins.includes(normalizedOrigin) || isLocalhost) {
        return callback(null, true);
      } else {
        console.warn(`[CORS] Rejected Origin: ${origin}`);
        return callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    optionsSuccessStatus: 200,
  }),
);

const User = require("./models/User");
app.get("/api/seed-admin", async (req, res) => {
  try {
    const { key } = req.query;
    if (key !== "admin123") {
      return res.status(403).send("Invalid access key");
    }

    const email = "squarefinance2025@gmail.com";
    const password = "12345678";
    const accessKey = "admin123";

    let user = await User.findOne({ email });
    if (user) {
      user.password = password;
      user.role = "SUPER_ADMIN";
      user.accessKey = accessKey;
      user.isActive = true;
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
        paymentApproval: true,
      };
      await user.save();
      return res.status(200).send("Admin updated successfully");
    } else {
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
          paymentApproval: true,
        },
      });
      return res.status(200).send("Admin created successfully");
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.use(cookieParser());
app.use(express.json());

// Routes
app.get("/api/loans/check-uniqueness/:loanNumber", checkLoanNumberUniqueness);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/emi-utility", emiUtilityRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/weekly-loans", weeklyLoanRoutes);
app.use("/api/daily-loans", dailyLoanRoutes);
app.use("/api/emi-mgmt", loanEmiRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/interest-loans", interestLoanRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/notifications", notificationRoutes);

// Error Middleware
app.use(errorMiddleware);

module.exports = app;
