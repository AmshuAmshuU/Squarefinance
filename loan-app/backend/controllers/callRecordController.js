const CallRecord = require("../models/CallRecord");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const InterestLoan = require("../models/InterestLoan");
const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const socketUtils = require("../utils/socket");
const { toPublic } = require("../utils/callRecords");

const MODELS = { Loan, WeeklyLoan, DailyLoan, InterestLoan };

// Tells every connected user's follow-up list to update this loan's call
// record live, so a second employee sees the first one's call without
// refreshing. Best-effort - the lists also load the latest on open.
const broadcast = (loanId, loanModel, record) => {
  try {
    socketUtils.getIO().emit("call_record_updated", { loanId: String(loanId), loanModel, record });
  } catch (err) {
    // Socket not running (e.g. scripts) - nothing to update live.
  }
};

// Any logged-in user can log a call - it's a coordination note, not money,
// so it needs no approval. response "CLEAR" removes the existing record.
const setCallRecord = asyncHandler(async (req, res, next) => {
  const { loanId, loanModel, response } = req.body;

  const Model = MODELS[loanModel];
  if (!Model || !loanId) {
    return next(new ErrorHandler("A valid loan is required", 400));
  }
  if (!["NP", "EOD", "CLEAR"].includes(response)) {
    return next(new ErrorHandler("Response must be NP, EOD or CLEAR", 400));
  }
  if (!(await Model.exists({ _id: loanId }))) {
    return next(new ErrorHandler("Loan not found", 404));
  }

  if (response === "CLEAR") {
    await CallRecord.deleteOne({ loanId, loanModel });
    broadcast(loanId, loanModel, null);
    return sendResponse(res, 200, "success", "Call record cleared", null, { record: null });
  }

  const saved = await CallRecord.findOneAndUpdate(
    { loanId, loanModel },
    { response, calledBy: req.user._id, calledByName: req.user.name, calledAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const record = toPublic(saved);
  broadcast(loanId, loanModel, record);
  sendResponse(res, 200, "success", "Call record saved", null, { record });
});

// Last call on a loan, whenever it was made (used on the loan details page).
const getCallRecord = asyncHandler(async (req, res, next) => {
  const { loanModel, loanId } = req.params;
  if (!MODELS[loanModel]) return next(new ErrorHandler("Invalid loan type", 400));
  const record = await CallRecord.findOne({ loanId, loanModel }).lean();
  sendResponse(res, 200, "success", "Call record fetched", null, { record: record ? toPublic(record) : null });
});

module.exports = { setCallRecord, getCallRecord };
