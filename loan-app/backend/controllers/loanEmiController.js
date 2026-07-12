const loanEmiService = require("../services/loanEmiService");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

const getPendingLoans = asyncHandler(async (req, res) => {
  const data = await loanEmiService.getPendingLoans();
  sendResponse(res, 200, "success", "Pending loans fetched successfully", null, data);
});

const getPartialLoans = asyncHandler(async (req, res) => {
  const data = await loanEmiService.getPartialLoans();
  sendResponse(res, 200, "success", "Partial loans fetched successfully", null, data);
});

const getFollowups = asyncHandler(async (req, res) => {
  const data = await loanEmiService.getFollowups();
  sendResponse(res, 200, "success", "Follow-up loans fetched successfully", null, data);
});

const updateClientResponse = asyncHandler(async (req, res) => {
  const { loanId } = req.params;
  const { loanType, clientResponse, followUpDate } = req.body;
  
  if (!loanType) {
    return sendResponse(res, 400, "error", "loanType is required");
  }

  const data = await loanEmiService.updateClientResponse(loanId, loanType, clientResponse, followUpDate);
  sendResponse(res, 200, "success", "Client response updated successfully", null, data);
});

const completeFollowup = asyncHandler(async (req, res) => {
  const { loanId } = req.params;
  const { loanType } = req.body;

  if (!loanType) {
     return sendResponse(res, 400, "error", "loanType is required");
  }

  const data = await loanEmiService.completeFollowup(loanId, loanType);
  sendResponse(res, 200, "success", "Follow-up completed successfully", null, data);
});

module.exports = {
  getPendingLoans,
  getPartialLoans,
  getFollowups,
  updateClientResponse,
  completeFollowup,
};
