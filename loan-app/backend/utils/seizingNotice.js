const mongoose = require("mongoose");
const ErrorHandler = require("./ErrorHandler");

// Proof that the customer was told their vehicle is going for seizing (a
// government compliance requirement). The employee's own phone sends the real
// WhatsApp/SMS, so the app can only record what the employee ticked: who, when,
// which number, and on which channel (or that the channel was skipped).
const channelSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["sent", "skipped"], required: true },
    number: { type: String }, // 10 digits, only when status is "sent"
    typed: { type: Boolean, default: false }, // number typed by hand, not one saved on the loan
  },
  { _id: false },
);

const seizingNoticeSchema = new mongoose.Schema(
  {
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sentByName: { type: String },
    sentAt: { type: Date, default: Date.now },
    whatsapp: { type: channelSchema, required: true },
    sms: { type: channelSchema, required: true },
  },
  { _id: false },
);

const tenDigits = (value) => String(value ?? "").replace(/\D/g, "").slice(-10);

const normalizeChannel = (raw, label) => {
  if (!raw || (raw.status !== "sent" && raw.status !== "skipped")) {
    throw new ErrorHandler(`Please finish the ${label} step of the seizing notice`, 400);
  }
  if (raw.status === "skipped") return { status: "skipped" };
  const number = tenDigits(raw.number);
  if (number.length !== 10) {
    throw new ErrorHandler(`The ${label} number in the seizing notice is not a valid 10-digit number`, 400);
  }
  return { status: "sent", number, typed: raw.typed === true };
};

// Validates the notice the popup sends along and stamps who/when on the server
// (never trusted from the browser). Throws a 400 when it is missing/incomplete.
const buildSeizingNotice = (raw, user) => {
  if (!raw || typeof raw !== "object") {
    throw new ErrorHandler("The customer must be sent the seizing notice before a vehicle is marked For Seizing", 400);
  }
  return {
    sentBy: user._id,
    sentByName: user.name,
    sentAt: new Date(),
    whatsapp: normalizeChannel(raw.whatsapp, "WhatsApp"),
    sms: normalizeChannel(raw.sms, "SMS"),
  };
};

// Flags the loan For Seizing and keeps the Seized Vehicles record in step - the
// same effect the Pending list's "Seize Vehicle" button always had. Used both
// for an immediate seize (Super Admin) and when a request is approved.
// `notice` is only passed when it has not been saved on the loan yet.
const applyForSeizing = async (loan, userId, notice) => {
  const SeizedVehicle = require("../models/SeizedVehicle");
  loan.isSeized = true;
  // Status starts at "For Seizing" (not "Seized") - the vehicle is only
  // flagged for it; updateSeizedStatus moves it to "Seized" later.
  loan.status = "For Seizing";
  loan.seizedStatus = "For Seizing";
  if (notice) loan.seizingNotices = [...(loan.seizingNotices || []), notice];
  await loan.save();
  await SeizedVehicle.findOneAndUpdate(
    { loanId: loan._id },
    {
      loanId: loan._id,
      loanModel: "Loan",
      seizedDate: new Date(),
      status: "For Seizing",
      remarks: "Status toggled to Seized",
      createdBy: userId,
    },
    { upsert: true, new: true },
  );
};

module.exports = { seizingNoticeSchema, buildSeizingNotice, applyForSeizing };
