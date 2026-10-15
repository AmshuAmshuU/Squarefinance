const mongoose = require("mongoose");
const LocationUpdate = require("../models/LocationUpdate");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const sendResponse = require("../utils/response");
const socketUtils = require("../utils/socket");
const { sendPushToUser } = require("./pushController");

const LOAN_MODELS = ["Loan", "WeeklyLoan", "DailyLoan", "InterestLoan"];
const MERGE_WINDOW_MS = 60 * 1000; // taps on the same loan within a minute count as one update
const BANNER_WINDOW_MS = 48 * 60 * 60 * 1000; // banners come back after a reload for 48 hours

// Tells every active user - live on screen (socket) and on their phone (push)
// - that a customer just shared a location. The live event carries only an id
// (no names, no coordinates): sockets are not logged-in-only, so the details
// are fetched afterwards through the authenticated API.
const alertEveryone = async (update) => {
  const users = await User.find({ isActive: { $ne: false } }).select("_id").lean();
  let io = null;
  try {
    io = socketUtils.getIO();
  } catch (err) {
    // Socket not running (e.g. scripts) - push still goes out below.
  }
  for (const u of users) {
    if (io) io.to(String(u._id)).emit("location_updated", { id: String(update._id) });
    sendPushToUser(u._id, {
      title: `📍 LOCATION UPDATED - ${update.loanNumber || "loan"}`,
      message: `${update.customerName || "A customer"} shared a new location. Tap to open.`,
      url: `/admin/location-updates?highlight=${update._id}`,
      urgent: true,
      tag: `loc-${update.loanId}`,
    }).catch(() => {});
  }
};

// Called by the public customer endpoint right after the loan's latest
// location was saved. Never throws - the customer's request must not fail
// because of a staff alert problem.
const recordLocationUpdate = async ({ loanId, loanModel, loanNumber, customerName, lat, lng }) => {
  try {
    const now = new Date();
    const recent = await LocationUpdate.findOne({
      loanId,
      loanModel,
      at: { $gte: new Date(now.getTime() - MERGE_WINDOW_MS) },
    });
    if (recent) {
      // Same customer tapping again within a minute: keep the newest spot on
      // the existing row, alert nobody a second time.
      recent.lat = lat;
      recent.lng = lng;
      recent.at = now;
      await recent.save();
      return { merged: true };
    }
    const update = await LocationUpdate.create({ loanId, loanModel, loanNumber, customerName, lat, lng, at: now });
    await alertEveryone(update);
    return { created: true, id: String(update._id) };
  } catch (err) {
    console.error("Location alert failed:", err.message);
    return { failed: true };
  }
};

const unseenFilter = (userId) => ({ backfilled: { $ne: true }, "seenBy.user": { $ne: userId } });

const shape = (u, userId) => ({
  _id: u._id,
  loanId: u.loanId,
  loanModel: u.loanModel,
  loanNumber: u.loanNumber,
  customerName: u.customerName,
  lat: u.lat,
  lng: u.lng,
  at: u.at,
  backfilled: !!u.backfilled,
  seenByMe: !!u.backfilled || (u.seenBy || []).some((s) => String(s.user) === String(userId)),
});

// Everything not yet seen by the logged-in person - drives their banner,
// sidebar number and browser-tab flash.
const getUnseen = asyncHandler(async (req, res) => {
  const filter = unseenFilter(req.user._id);
  const [count, recent] = await Promise.all([
    LocationUpdate.countDocuments(filter),
    LocationUpdate.find({ ...filter, at: { $gte: new Date(Date.now() - BANNER_WINDOW_MS) } })
      .sort({ at: -1 })
      .limit(10)
      .lean(),
  ]);
  sendResponse(res, 200, "success", "Unseen location updates", null, {
    count,
    items: recent.map((u) => shape(u, req.user._id)),
  });
});

// The "Location Updates" page: every update, newest first, with who has and
// hasn't seen each one.
const getUpdates = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
  const [users, total, rows] = await Promise.all([
    User.find({ isActive: { $ne: false } }).select("name").lean(),
    LocationUpdate.countDocuments({}),
    LocationUpdate.find({}).sort({ at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  const items = rows.map((u) => {
    const seenIds = new Set((u.seenBy || []).map((s) => String(s.user)));
    return {
      ...shape(u, req.user._id),
      seenBy: (u.seenBy || []).map((s) => ({ name: s.userName, at: s.at })),
      notSeenBy: u.backfilled ? [] : users.filter((x) => !seenIds.has(String(x._id))).map((x) => x.name),
    };
  });
  sendResponse(res, 200, "success", "Location updates", null, { items, total, page, pages: Math.ceil(total / limit) });
});

const stampSeen = (req) => ({ $push: { seenBy: { user: req.user._id, userName: req.user.name, at: new Date() } } });

const markSeen = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next(new ErrorHandler("Invalid id", 400));
  await LocationUpdate.updateOne({ _id: req.params.id, "seenBy.user": { $ne: req.user._id } }, stampSeen(req));
  sendResponse(res, 200, "success", "Marked seen", null, null);
});

const markAllSeen = asyncHandler(async (req, res) => {
  await LocationUpdate.updateMany(unseenFilter(req.user._id), stampSeen(req));
  sendResponse(res, 200, "success", "All marked seen", null, null);
});

// "Location history" button on a loan page: every time this customer shared.
const getLoanHistory = asyncHandler(async (req, res, next) => {
  const { loanModel, loanId } = req.params;
  if (!LOAN_MODELS.includes(loanModel) || !mongoose.Types.ObjectId.isValid(loanId)) {
    return next(new ErrorHandler("Invalid loan", 400));
  }
  const rows = await LocationUpdate.find({ loanId, loanModel }).sort({ at: -1 }).limit(100).lean();
  sendResponse(res, 200, "success", "Location history", null, {
    items: rows.map((u) => ({ _id: u._id, at: u.at, lat: u.lat, lng: u.lng })),
  });
});

module.exports = { recordLocationUpdate, getUnseen, getUpdates, markSeen, markAllSeen, getLoanHistory };
