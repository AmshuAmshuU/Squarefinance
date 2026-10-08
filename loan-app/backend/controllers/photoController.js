const mongoose = require("mongoose");
const multer = require("multer");
const Loan = require("../models/Loan");
const WeeklyLoan = require("../models/WeeklyLoan");
const DailyLoan = require("../models/DailyLoan");
const InterestLoan = require("../models/InterestLoan");
const Approval = require("../models/Approval");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const photos = require("../utils/cloudinaryPhotos");

// Customer photo of a loan (all four loan types): shown in the 2cm icon of the
// locked top bar, full size in a pop-up. Pictures live in Cloudinary (private,
// signed addresses); MongoDB only keeps `customerPhoto` {publicId, version, ...}.
//   - Super Admin changes/deletes take effect straight away.
//   - Anyone else's change/delete becomes a PHOTO_CHANGE approval; the proposed
//     picture waits in a "pending" spot in Cloudinary until it is approved.
//   - While a loan is being created, the picture is uploaded first as a temp
//     file and attached to the loan once it exists (adoptTempPhoto) - creating a
//     loan needs no approval, so neither does its photo.

const MODELS = { Loan, WeeklyLoan, DailyLoan, InterestLoan };
const PERMISSION_KEY = { Loan: "loans", WeeklyLoan: "weeklyLoans", DailyLoan: "dailyLoans", InterestLoan: "interestLoans" };
const LABEL = { Loan: "Vehicle", WeeklyLoan: "Weekly", DailyLoan: "Daily", InterestLoan: "Interest" };

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: photos.MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new ErrorHandler("Only JPEG, PNG or WebP pictures are accepted", 400));
  },
});

// Turns multer's own errors (e.g. file too big) into normal 400 responses.
const receivePhoto = (req, res, next) =>
  memoryUpload.single("photo")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new ErrorHandler(`Photo is too big - it must be under ${Math.round(photos.MAX_PHOTO_BYTES / 1024)} KB`, 400));
    }
    next(err instanceof ErrorHandler ? err : new ErrorHandler(err.message || "Could not read the photo", 400));
  });

const modelFor = (name, next) => {
  const Model = MODELS[name];
  if (!Model) {
    next(new ErrorHandler("Invalid loan type", 400));
    return null;
  }
  return Model;
};

const can = (user, loanModel, action) => {
  if (user.role === "SUPER_ADMIN") return true;
  return user.permissions?.[PERMISSION_KEY[loanModel]]?.[action] === true;
};

const requireConfigured = (next) => {
  if (!photos.isConfigured()) {
    next(new ErrorHandler("Photo storage is not set up on the server yet", 503));
    return false;
  }
  return true;
};

const urlsFor = (photo) =>
  photo?.publicId
    ? { thumbUrl: photos.thumbUrl(photo.publicId, photo.version), fullUrl: photos.fullUrl(photo.publicId, photo.version) }
    : null;

const notifySuperAdmins = async (req, title, message, data) => {
  const { sendNotification, notifyApprovalCountChange } = require("./notificationController");
  const superAdmins = await User.find({ role: "SUPER_ADMIN", _id: { $ne: req.user._id } });
  for (const admin of superAdmins) {
    await sendNotification({
      recipientId: admin._id,
      senderId: req.user._id,
      type: "PAYMENT_REQUEST",
      title,
      message,
      data,
    });
  }
  await notifyApprovalCountChange();
};

// Sets the loan's photo note without touching updatedAt / "last updated by".
const saveNote = (Model, loanId, note) =>
  Model.updateOne({ _id: loanId }, note ? { $set: { customerPhoto: note } } : { $unset: { customerPhoto: 1 } }, { timestamps: false });

const pendingApprovalFor = (loanId) =>
  Approval.findOne({ requestType: "PHOTO_CHANGE", targetId: loanId, status: "Pending" }).populate("requestedBy", "name");

// ---------------------------------------------------------------- GET photo
const getPhoto = asyncHandler(async (req, res, next) => {
  const { loanModel, loanId } = req.params;
  const Model = modelFor(loanModel, next);
  if (!Model) return;
  if (!mongoose.Types.ObjectId.isValid(loanId)) return next(new ErrorHandler("Invalid loan", 400));

  const loan = await Model.findById(loanId).select("customerPhoto").populate("customerPhoto.uploadedBy", "name").lean();
  if (!loan) return next(new ErrorHandler("Loan not found", 404));

  const pending = await pendingApprovalFor(loanId);
  const photo = loan.customerPhoto?.publicId ? loan.customerPhoto : null;

  sendResponse(res, 200, "success", "Photo fetched", null, {
    hasPhoto: !!photo,
    ...(urlsFor(photo) || {}),
    uploadedAt: photo?.uploadedAt || null,
    uploadedByName: photo?.uploadedBy?.name || null,
    canChange: can(req.user, loanModel, "edit"),
    pending: pending
      ? { action: pending.requestedData?.action, requestedByName: pending.requestedBy?.name || null, requestedAt: pending.createdAt }
      : null,
  });
});

// ---------------------------------------------------------------- SET / replace
const setPhoto = asyncHandler(async (req, res, next) => {
  const { loanModel, loanId } = req.params;
  const Model = modelFor(loanModel, next);
  if (!Model) return;
  if (!requireConfigured(next)) return;
  if (!mongoose.Types.ObjectId.isValid(loanId)) return next(new ErrorHandler("Invalid loan", 400));
  if (!req.file) return next(new ErrorHandler("Please choose a photo", 400));
  if (!can(req.user, loanModel, "edit")) return next(new ErrorHandler("You do not have permission to change this photo", 403));

  const loan = await Model.findById(loanId).select("loanNumber customerName customerPhoto");
  if (!loan) return next(new ErrorHandler("Loan not found", 404));

  // Super Admin: replace straight away (same address, new version).
  if (req.user.role === "SUPER_ADMIN") {
    const up = await photos.uploadBuffer(req.file.buffer, photos.finalPublicId(loanModel, loan._id));
    await saveNote(Model, loan._id, {
      publicId: up.public_id,
      version: up.version,
      bytes: up.bytes,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });
    return sendResponse(res, 200, "success", "Photo saved", null, { applied: true });
  }

  if (await pendingApprovalFor(loan._id)) {
    return next(new ErrorHandler("A photo change for this loan is already waiting for approval", 400));
  }

  const token = photos.newToken();
  const pendingId = photos.pendingPublicId(loanModel, loan._id, token);
  const up = await photos.uploadBuffer(req.file.buffer, pendingId);

  await Approval.create({
    requestType: "PHOTO_CHANGE",
    targetId: loan._id,
    targetModel: loanModel,
    loanNumber: loan.loanNumber,
    customerName: loan.customerName || "—",
    requestedBy: req.user._id,
    requestedData: {
      action: "set",
      pendingPublicId: up.public_id,
      pendingVersion: up.version,
      pendingBytes: up.bytes,
      changes: [
        { label: "Customer photo", oldValue: loan.customerPhoto?.publicId ? "Current photo" : "No photo", newValue: "New photo (preview below)" },
      ],
    },
  });

  await notifySuperAdmins(
    req,
    "Customer Photo Approval Request",
    `${req.user.name} wants to ${loan.customerPhoto?.publicId ? "change" : "add"} the photo of ${LABEL[loanModel]} loan ${loan.loanNumber} (${loan.customerName || "—"}).`,
    { loanNumber: loan.loanNumber, customerName: loan.customerName, employeeName: req.user.name },
  );

  sendResponse(res, 200, "success", "Photo sent to Super Admin for approval", null, { applied: false, pendingApproval: true });
});

// ---------------------------------------------------------------- DELETE
const deletePhoto = asyncHandler(async (req, res, next) => {
  const { loanModel, loanId } = req.params;
  const Model = modelFor(loanModel, next);
  if (!Model) return;
  if (!requireConfigured(next)) return;
  if (!mongoose.Types.ObjectId.isValid(loanId)) return next(new ErrorHandler("Invalid loan", 400));
  if (!can(req.user, loanModel, "edit")) return next(new ErrorHandler("You do not have permission to delete this photo", 403));

  const loan = await Model.findById(loanId).select("loanNumber customerName customerPhoto");
  if (!loan) return next(new ErrorHandler("Loan not found", 404));
  if (!loan.customerPhoto?.publicId) return next(new ErrorHandler("This loan has no photo", 400));

  if (req.user.role === "SUPER_ADMIN") {
    await photos.destroyAsset(loan.customerPhoto.publicId);
    await saveNote(Model, loan._id, null);
    return sendResponse(res, 200, "success", "Photo deleted", null, { applied: true });
  }

  if (await pendingApprovalFor(loan._id)) {
    return next(new ErrorHandler("A photo change for this loan is already waiting for approval", 400));
  }

  await Approval.create({
    requestType: "PHOTO_CHANGE",
    targetId: loan._id,
    targetModel: loanModel,
    loanNumber: loan.loanNumber,
    customerName: loan.customerName || "—",
    requestedBy: req.user._id,
    requestedData: {
      action: "delete",
      changes: [{ label: "Customer photo", oldValue: "Current photo", newValue: "Delete the photo" }],
    },
  });

  await notifySuperAdmins(
    req,
    "Customer Photo Approval Request",
    `${req.user.name} wants to delete the photo of ${LABEL[loanModel]} loan ${loan.loanNumber} (${loan.customerName || "—"}).`,
    { loanNumber: loan.loanNumber, customerName: loan.customerName, employeeName: req.user.name },
  );

  sendResponse(res, 200, "success", "Delete request sent to Super Admin for approval", null, { applied: false, pendingApproval: true });
});

// ---------------------------------------------------------------- temp upload (while creating a loan)
const uploadTempPhoto = asyncHandler(async (req, res, next) => {
  const { loanModel } = req.params;
  if (!modelFor(loanModel, next)) return;
  if (!requireConfigured(next)) return;
  if (!req.file) return next(new ErrorHandler("Please choose a photo", 400));
  if (!can(req.user, loanModel, "create")) return next(new ErrorHandler("You do not have permission to create loans", 403));

  const token = photos.newToken();
  const up = await photos.uploadBuffer(req.file.buffer, photos.tempPublicId(token));
  sendResponse(res, 200, "success", "Photo uploaded", null, {
    token,
    version: up.version,
    thumbUrl: photos.thumbUrl(up.public_id, up.version),
  });
});

// ---------------------------------------------------------------- hooks used by other controllers
// Attaches a temp photo (uploaded earlier in the Add Loan form) to a freshly
// created loan. Never throws - a photo problem must not undo a created loan.
const adoptTempPhoto = async (token, loanModel, loan, user) => {
  if (!token || !photos.isValidToken(token) || !photos.isConfigured()) return;
  try {
    const moved = await photos.renameAsset(photos.tempPublicId(token), photos.finalPublicId(loanModel, loan._id));
    await saveNote(MODELS[loanModel], loan._id, {
      publicId: moved.public_id,
      version: moved.version,
      bytes: moved.bytes,
      uploadedBy: user?._id,
      uploadedAt: new Date(),
    });
  } catch (err) {
    console.error("Could not attach the customer photo to the new loan:", err.message || err);
  }
};

// Removes a deleted loan's picture from Cloudinary (frees space).
const removeLoanPhoto = async (loan) => {
  if (loan?.customerPhoto?.publicId) await photos.destroyAsset(loan.customerPhoto.publicId);
};

module.exports = {
  receivePhoto,
  getPhoto,
  setPhoto,
  deletePhoto,
  uploadTempPhoto,
  adoptTempPhoto,
  removeLoanPhoto,
  saveNote,
  MODELS,
};
