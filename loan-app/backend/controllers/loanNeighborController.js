const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const InterestLoan = require("../models/InterestLoan");
const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");

const MODELS = { Loan, WeeklyLoan, DailyLoan, InterestLoan };

// Finds the loans just above and just below this one in the loans list, so the
// loan view/modify pages can offer PREV / NEXT buttons. Karthik's rule:
//   prevId = the next-older loan (the row below in the newest-first list)
//   nextId = the next-newer loan (the row above in the list)
// Closed loans are included, like the list does when no status filter is set.
// _id breaks ties between loans created at the exact same moment.
const getLoanNeighbors = asyncHandler(async (req, res, next) => {
  const { loanModel, id } = req.params;
  const Model = MODELS[loanModel];
  if (!Model) return next(new ErrorHandler("Invalid loan type", 400));
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Loan ID provided", 400));
  }

  const current = await Model.findById(id).select("_id createdAt").lean();
  if (!current) return next(new ErrorHandler("Loan not found", 404));

  const [newer, older] = await Promise.all([
    Model.findOne({
      $or: [
        { createdAt: { $gt: current.createdAt } },
        { createdAt: current.createdAt, _id: { $gt: current._id } },
      ],
    })
      .sort({ createdAt: 1, _id: 1 })
      .select("_id")
      .lean(),
    Model.findOne({
      $or: [
        { createdAt: { $lt: current.createdAt } },
        { createdAt: current.createdAt, _id: { $lt: current._id } },
      ],
    })
      .sort({ createdAt: -1, _id: -1 })
      .select("_id")
      .lean(),
  ]);

  sendResponse(res, 200, "success", "Loan neighbors fetched", null, {
    prevId: older ? String(older._id) : null,
    nextId: newer ? String(newer._id) : null,
  });
});

module.exports = { getLoanNeighbors };
