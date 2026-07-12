const sendResponse = (res, statusCode, status, message, error = null, data = null) => {
  return res.status(statusCode).json({
    statusCode,
    status,
    message,
    error,
    data,
  });
};

module.exports = sendResponse;
