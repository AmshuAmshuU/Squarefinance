const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");

const isAuthenticated = asyncHandler(async (req, res, next) => {
  const startAuth = performance.now();
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ErrorHandler("Please login to access this resource", 401));
  }
  const token = authHeader.split(" ")[1];

  let decodedData;
  try {
    decodedData = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new ErrorHandler("JSON Web Token is expired. Try again", 401),
      );
    }
    return next(new ErrorHandler("Authentication failed", 401));
  }

  // Optimize: Use .lean() to bypass Mongoose hydration
  req.user = await User.findById(decodedData.id).lean();

  if (!req.user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const authDuration = (performance.now() - startAuth).toFixed(2);
  if (authDuration > 100) {
    console.log(`[PERF][WARN] auth.isAuthenticated took ${authDuration}ms`);
  }

  next();
});

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role: ${req.user.role} is not allowed to access this resource`,
          403,
        ),
      );
    }
    next();
  };
};

const authorizePermissions = (permissionPath) => {
  return (req, res, next) => {
    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    const permissions = req.user.permissions;
    if (!permissions) {
      return next(new ErrorHandler("User permissions not found", 403));
    }

    const parts = permissionPath.split(".");
    let current = permissions;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        current = false;
        break;
      }
    }

    if (current !== true) {
      return next(
        new ErrorHandler(
          `You do not have permission to perform this action (${permissionPath})`,
          403,
        ),
      );
    }

    next();
  };
};

module.exports = { isAuthenticated, authorizeRoles, authorizePermissions };
