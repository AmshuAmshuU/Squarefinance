const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const { isSessionValid } = require("../utils/sessionCache");

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

  // A deactivated account is locked out of every device straight away.
  if (req.user.isActive === false) {
    return next(new ErrorHandler("This account has been deactivated", 403));
  }

  // Logins made after the My devices update carry a device id; if that device
  // was logged out (or its session ended) the token stops working at once.
  // Older logins have no id and keep working until they next renew.
  if (decodedData.sid) {
    if (!(await isSessionValid(decodedData.sid, req.user._id))) {
      return next(new ErrorHandler("This device was logged out. Please login again", 401));
    }
    req.sid = decodedData.sid;
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
