// getLoanByLocationToken / updateLoanLocation are public and unauthenticated
// - hit directly by a customer's phone browser via the WhatsApp link, not
// by staff (see routes/locationRoutes.js, which applies isAuthenticated
// only to sendLocationLink below). Keep those two read-only about loan
// data (loanNumber/customerName only) and write-only about location.
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const ErrorHandler = require("../utils/ErrorHandler");
const {
  findLoanByLocationToken,
  updateLocationByToken,
  getPublicAppUrl,
  MODELS,
} = require("../utils/customerLocation");
const { sendLocationLinkMessage } = require("../utils/whatsapp");

const getLoanByLocationToken = asyncHandler(async (req, res, next) => {
  const result = await findLoanByLocationToken(req.params.token);
  if (!result) {
    return next(new ErrorHandler("This link is no longer valid", 404));
  }
  const { loan } = result;
  sendResponse(res, 200, "success", "Loan found", null, {
    loanNumber: loan.loanNumber,
    customerName: loan.customerName,
  });
});

const updateLoanLocation = asyncHandler(async (req, res, next) => {
  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return next(new ErrorHandler("Invalid coordinates", 400));
  }

  const updated = await updateLocationByToken(req.params.token, lat, lng);
  if (!updated) {
    return next(new ErrorHandler("This link is no longer valid", 404));
  }

  sendResponse(res, 200, "success", "Location updated", null, null);
});

// Staff-triggered, authenticated - "Send link to customer" button on a
// loan's page. Manual only, by Karthik's explicit choice (2026-08-13): no
// automatic sending at loan creation or on any schedule.
const sendLocationLink = asyncHandler(async (req, res, next) => {
  const { loanModel, loanId } = req.params;
  const modelEntry = MODELS.find((m) => m.name === loanModel);
  if (!modelEntry) {
    return next(new ErrorHandler("Invalid loan type", 400));
  }

  const loan = await modelEntry.Model.findById(loanId).select(
    "loanNumber customerName mobileNumbers locationToken"
  );
  if (!loan) {
    return next(new ErrorHandler("Loan not found", 404));
  }
  if (!loan.locationToken) {
    return next(new ErrorHandler("This loan doesn't have a location link yet", 400));
  }
  const phone = loan.mobileNumbers?.[0];
  if (!phone) {
    return next(new ErrorHandler("No mobile number on file for this loan", 400));
  }

  const link = `${getPublicAppUrl()}/loan-update/${loan.locationToken}`;

  await sendLocationLinkMessage(phone, link);

  sendResponse(res, 200, "success", "Link sent to customer", null, null);
});

module.exports = { getLoanByLocationToken, updateLoanLocation, sendLocationLink };
