const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");

const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Log error for debugging
  console.error("Error:", err.message);
  if (err.stack) console.error(err.stack);

  // Mongoose Cast Error (Invalid ID)
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new ErrorHandler(message, 400);
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((value) => value.message);
    err = new ErrorHandler(message.join(", "), 400);
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    const message = "JSON Web Token is invalid. Try again";
    err = new ErrorHandler(message, 401);
  }

  if (err.name === "TokenExpiredError") {
    const message = "JSON Web Token is expired. Try again";
    err = new ErrorHandler(message, 401);
  }

  return sendResponse(res, err.statusCode, "error", err.message, err.message);
};

module.exports = errorMiddleware;
