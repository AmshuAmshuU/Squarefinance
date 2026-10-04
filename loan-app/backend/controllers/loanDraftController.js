const mongoose = require("mongoose");
const LoanDraft = require("../models/LoanDraft");
const Approval = require("../models/Approval");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const { needsRateApproval, MIN_FREE_RATE } = require("../utils/rateApproval");

const money = (v) => (v === undefined || v === null || v === "" ? "—" : `₹${Number(v).toLocaleString("en-IN")}`);

// What the Super Admin sees in the Approval Queue (same Current -> Proposed
// card the loan-edit requests use).
const buildChanges = (formData, rate) => [
  { label: "Interest Rate (%)", oldValue: `${MIN_FREE_RATE.toFixed(2)} and above (standard)`, newValue: String(rate) },
  { label: "Loan Number", oldValue: "—", newValue: formData?.loanTerms?.loanNumber || "not entered yet" },
  { label: "Customer", oldValue: "—", newValue: formData?.customerDetails?.customerName || "not entered yet" },
  { label: "Principal Amount", oldValue: "—", newValue: money(formData?.loanTerms?.principalAmount) },
  { label: "Tenure (months)", oldValue: "—", newValue: formData?.loanTerms?.tenureMonths || "—" },
  { label: "Vehicle Number", oldValue: "—", newValue: formData?.vehicleInformation?.vehicleNumber || "—" },
];

const NAME_FIELDS = "createdBy lastUpdatedBy approvedBy rejectedBy completedBy";

const withExpiry = (draft) => {
  const d = draft.toObject ? draft.toObject() : draft;
  d.isExpired = d.status === "Approved" && d.expiresAt && new Date(d.expiresAt) <= new Date();
  return d;
};

const requireValidId = (id, next) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    next(new ErrorHandler("Invalid draft ID provided", 400));
    return false;
  }
  return true;
};

// Save the Add Loan form as a draft and (unless an approval already covers
// this exact rate) ask the Super Admin to approve the rate.
const saveRateDraft = asyncHandler(async (req, res, next) => {
  const { draftId, formData } = req.body;
  const { sendNotification, notifyApprovalCountChange } = require("./notificationController");

  if (!formData || typeof formData !== "object") {
    return next(new ErrorHandler("Loan form details are required", 400));
  }
  if (req.user.role === "SUPER_ADMIN") {
    return next(new ErrorHandler("Super Admin does not need approval for a lower rate", 400));
  }
  const rate = parseFloat(formData?.loanTerms?.annualInterestRate);
  if (!needsRateApproval(rate)) {
    return next(new ErrorHandler(`Only rates below ${MIN_FREE_RATE.toFixed(2)} need approval`, 400));
  }

  const loanNumber = formData?.loanTerms?.loanNumber || "";
  const customerName = formData?.customerDetails?.customerName || "";

  let draft = null;
  if (draftId) {
    if (!requireValidId(draftId, next)) return;
    draft = await LoanDraft.findById(draftId);
    if (!draft || draft.status === "Completed") {
      return next(new ErrorHandler("This draft no longer exists or was already used", 404));
    }
  }

  const now = new Date();
  const sameRate = draft && Number(draft.requestedRate) === rate;
  const approvalStillGood =
    sameRate && draft.status === "Approved" && draft.expiresAt && draft.expiresAt > now;
  const approvalPending = sameRate && draft.status === "Waiting for Approval";

  if (draft) {
    draft.formData = formData;
    draft.loanNumber = loanNumber;
    draft.customerName = customerName;
    draft.lastUpdatedBy = req.user._id;
  } else {
    draft = new LoanDraft({
      formData,
      loanNumber,
      customerName,
      requestedRate: rate,
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id,
    });
  }
  draft.markModified("formData");

  // Just saving more details against an approval that is still in place.
  if (approvalStillGood) {
    await draft.save();
    return sendResponse(res, 200, "success", "Draft saved", null, withExpiry(draft));
  }
  if (approvalPending) {
    await draft.save();
    await Approval.updateOne(
      { _id: draft.approvalId, status: "Pending" },
      {
        loanNumber: loanNumber || "—",
        customerName: customerName || "—",
        requestedData: { draftId: draft._id, requestedRate: rate, changes: buildChanges(formData, rate), summary: `interest rate ${rate}%` },
      },
    );
    return sendResponse(res, 200, "success", "Draft saved - still waiting for approval", null, withExpiry(draft));
  }

  // New rate, rejected, or expired: a fresh approval is needed. Any older
  // request for this draft that is still open is closed first.
  if (draft.approvalId) {
    await Approval.updateOne(
      { _id: draft.approvalId, status: "Pending" },
      { status: "Rejected", remarks: "Replaced by a newer request", processedAt: now },
    );
  }
  draft.requestedRate = rate;
  draft.status = "Waiting for Approval";
  draft.approvedBy = undefined;
  draft.approvedAt = undefined;
  draft.expiresAt = undefined;
  draft.rejectedBy = undefined;
  draft.rejectedAt = undefined;
  draft.rejectRemarks = undefined;
  await draft.save();

  const approval = await Approval.create({
    requestType: "RATE_APPROVAL",
    targetId: draft._id,
    targetModel: "LoanDraft",
    loanNumber: loanNumber || "—",
    customerName: customerName || "—",
    requestedData: {
      draftId: draft._id,
      requestedRate: rate,
      changes: buildChanges(formData, rate),
      summary: `interest rate ${rate}%`,
    },
    requestedBy: req.user._id,
  });
  draft.approvalId = approval._id;
  await draft.save();

  const superAdmins = await User.find({ role: "SUPER_ADMIN", _id: { $ne: req.user._id } });
  for (const admin of superAdmins) {
    await sendNotification({
      recipientId: admin._id,
      senderId: req.user._id,
      type: "PAYMENT_REQUEST",
      title: "Interest Rate Approval Request",
      message: `${req.user.name} requested approval for interest rate ${rate}% on a new vehicle loan ${loanNumber ? `(${loanNumber}${customerName ? ` - ${customerName}` : ""})` : "(loan number not entered yet)"}.`,
      data: { loanNumber, customerName, employeeName: req.user.name },
    });
  }
  await notifyApprovalCountChange();

  sendResponse(res, 200, "success", "Sent to Super Admin for approval", null, withExpiry(draft));
});

// Every open draft (anyone who can create loans may continue any of them),
// plus drafts finished in the last 7 days so it's visible who completed them.
const listLoanDrafts = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const drafts = await LoanDraft.find({
    $or: [{ status: { $ne: "Completed" } }, { status: "Completed", completedAt: { $gte: since } }],
  })
    .select("-formData")
    .populate(NAME_FIELDS, "name")
    .sort({ updatedAt: -1 });

  sendResponse(res, 200, "success", "Drafts fetched", null, drafts.map(withExpiry));
});

const getLoanDraft = asyncHandler(async (req, res, next) => {
  if (!requireValidId(req.params.id, next)) return;
  const draft = await LoanDraft.findById(req.params.id).populate(NAME_FIELDS, "name");
  if (!draft) return next(new ErrorHandler("Draft not found", 404));
  sendResponse(res, 200, "success", "Draft fetched", null, withExpiry(draft));
});

const discardLoanDraft = asyncHandler(async (req, res, next) => {
  const { notifyApprovalCountChange } = require("./notificationController");
  if (!requireValidId(req.params.id, next)) return;
  const draft = await LoanDraft.findById(req.params.id);
  if (!draft) return next(new ErrorHandler("Draft not found", 404));
  if (draft.status === "Completed") {
    return next(new ErrorHandler("This draft was already used to create a loan", 400));
  }
  if (draft.approvalId) {
    await Approval.updateOne(
      { _id: draft.approvalId, status: "Pending" },
      { status: "Rejected", remarks: "Draft was discarded", processedAt: new Date() },
    );
  }
  await draft.deleteOne();
  await notifyApprovalCountChange();
  sendResponse(res, 200, "success", "Draft discarded", null, null);
});

// Called by createLoan after a loan is created from a draft that did not go
// through the approved-rate check (e.g. the rate was changed to 2.00 or more):
// closes the draft and any request still waiting on it.
const closeDraftWithLoan = async (draftId, user, loan) => {
  if (!draftId || !mongoose.Types.ObjectId.isValid(draftId)) return;
  const { notifyApprovalCountChange } = require("./notificationController");
  const draft = await LoanDraft.findOneAndUpdate(
    { _id: draftId, status: { $ne: "Completed" } },
    { status: "Completed", completedBy: user._id, completedAt: new Date(), loanId: loan._id },
    { new: true },
  );
  if (draft?.approvalId) {
    await Approval.updateOne(
      { _id: draft.approvalId, status: "Pending" },
      { status: "Rejected", remarks: "Not needed - loan was created without this rate", processedAt: new Date() },
    );
    await notifyApprovalCountChange();
  }
};

module.exports = { saveRateDraft, listLoanDrafts, getLoanDraft, discardLoanDraft, closeDraftWithLoan };
