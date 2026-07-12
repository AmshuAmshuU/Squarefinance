const RtoWork = require("../models/RtoWork");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const ErrorHandler = require("../utils/ErrorHandler");

const getRtoWorks = asyncHandler(async (req, res, next) => {
  let works = await RtoWork.find().sort({ name: 1 });

  // Seed if empty
  if (works.length === 0) {
    const defaults = [
      "DL",
      "DL Badge",
      "Fresh Permit",
      "HPA",
      "HPT",
      "Insurance – 1st Party",
      "Insurance – 3rd Party",
      "NOC",
      "Permit Renewal",
      "TO (Name Transfer)",
    ];
    await RtoWork.insertMany(
      defaults.map((name) => ({ name, isDefault: true })),
    );
    works = await RtoWork.find().sort({ name: 1 });
  }

  sendResponse(res, 200, "success", "RTO works fetched", null, works);
});

const createRtoWork = asyncHandler(async (req, res, next) => {
  const { name } = req.body;
  if (!name) return next(new ErrorHandler("Name is required", 400));

  try {
    const work = await RtoWork.create({ name });
    sendResponse(res, 201, "success", "RTO work added", null, work);
  } catch (err) {
    if (err.code === 11000) {
      const existing = await RtoWork.findOne({ name });
      return sendResponse(
        res,
        200,
        "success",
        "RTO work already exists",
        null,
        existing,
      );
    }
    next(err);
  }
});

module.exports = { getRtoWorks, createRtoWork };
