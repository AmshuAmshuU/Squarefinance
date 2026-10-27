const Session = require("../models/Session");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { clientIp, parseUserAgent } = require("../utils/deviceInfo");
const { lookupIpCity, lookupPlaceName } = require("../utils/geoLookup");
const { forgetSession, forgetSessions } = require("../utils/sessionCache");

const SESSION_DAYS = 10;
const MOVED_FOR_NEW_PLACE_NAME_KM = 0.5;

const distanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDevice = (s, currentSid) => {
  const hasExact = typeof s.lat === "number" && typeof s.lng === "number";
  const approx = [s.approxCity, s.approxRegion && s.approxRegion !== s.approxCity ? s.approxRegion : ""]
    .filter(Boolean)
    .join(", ");
  return {
    id: s._id,
    name: s.name || "",
    deviceType: s.deviceType,
    os: s.os,
    browser: s.browser,
    installedApp: !!s.installedApp,
    isCurrent: !!currentSid && s.sid === currentSid,
    lastActiveAt: s.lastActiveAt,
    loggedInAt: s.createdAt,
    ip: s.ip,
    location: hasExact
      ? {
          type: "exact",
          lat: s.lat,
          lng: s.lng,
          accuracy: s.accuracy,
          at: s.locationAt,
          label: s.placeName || approx || "",
        }
      : approx
        ? { type: "approx", label: approx }
        : { type: "none", label: "" },
    locationStatus: s.locationStatus,
  };
};

// GET /api/devices - this person's logged-in devices
const getMyDevices = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ user: req.user._id, expiresAt: { $gt: new Date() } })
    .sort({ lastActiveAt: -1 })
    .lean();

  const devices = sessions.map((s) => formatDevice(s, req.sid));
  // current device first, then most recently used
  devices.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));

  return sendResponse(res, 200, "success", "Devices fetched", null, {
    count: devices.length,
    currentKnown: !!req.sid,
    devices,
  });
});

// POST /api/devices/ping - called quietly whenever the app is opened / brought
// back to the front. Keeps "last active" and the place of THIS device fresh.
const pingDevice = asyncHandler(async (req, res) => {
  if (!req.sid) {
    // older login with no device id yet; the app renews it and pings again
    return sendResponse(res, 200, "success", "No device session yet", null, { tracked: false });
  }

  const session = await Session.findOne({ sid: req.sid, user: req.user._id });
  if (!session) {
    return sendResponse(res, 200, "success", "No device session", null, { tracked: false });
  }

  const { lat, lng, accuracy, status, standalone } = req.body || {};
  const ip = clientIp(req);
  const ua = String(req.headers["user-agent"] || "").slice(0, 400);

  session.lastActiveAt = new Date();
  session.expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  if (ua && ua !== session.userAgent) {
    session.userAgent = ua;
    Object.assign(session, parseUserAgent(ua));
  }
  if (typeof standalone === "boolean") session.installedApp = standalone;

  const ipChanged = ip && ip !== session.approxForIp;
  session.ip = ip || session.ip;

  const validCoords =
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  let needPlaceName = false;
  if (validCoords) {
    needPlaceName =
      typeof session.placeForLat !== "number" ||
      distanceKm(session.placeForLat, session.placeForLng, lat, lng) > MOVED_FOR_NEW_PLACE_NAME_KM;
    session.lat = lat;
    session.lng = lng;
    session.accuracy = typeof accuracy === "number" && Number.isFinite(accuracy) ? Math.round(accuracy) : undefined;
    session.locationAt = new Date();
    session.locationStatus = "granted";
  } else if (["denied", "skipped", "unsupported"].includes(status)) {
    session.locationStatus = status;
  }

  await session.save();

  // slow lookups run after the reply, so the app never waits for them
  const sid = session.sid;
  if (ipChanged) {
    lookupIpCity(ip)
      .then((place) => (place
        ? Session.updateOne({ sid }, { approxCity: place.city, approxRegion: place.region, approxForIp: ip })
        : Session.updateOne({ sid }, { approxForIp: ip })))
      .catch(() => {});
  }
  if (needPlaceName) {
    lookupPlaceName(lat, lng)
      .then((name) => Session.updateOne({ sid }, { placeName: name || "", placeForLat: lat, placeForLng: lng }))
      .catch(() => {});
  }

  return sendResponse(res, 200, "success", "Device updated", null, { tracked: true });
});

// PATCH /api/devices/:id - give a device a name
const renameDevice = asyncHandler(async (req, res, next) => {
  const name = String((req.body && req.body.name) || "").trim().slice(0, 40);
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { name },
    { new: true },
  );
  if (!session) return next(new ErrorHandler("Device not found", 404));
  return sendResponse(res, 200, "success", "Device renamed", null, formatDevice(session.toObject(), req.sid));
});

// DELETE /api/devices/:id - log one OTHER device out
const logoutDevice = asyncHandler(async (req, res, next) => {
  const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
  if (!session) return next(new ErrorHandler("Device not found", 404));
  if (req.sid && session.sid === req.sid) {
    return next(new ErrorHandler("Use Logout to end this device's login", 400));
  }
  await session.deleteOne();
  forgetSession(session.sid);
  return sendResponse(res, 200, "success", "Device logged out");
});

// POST /api/devices/logout-others - log out everything except this device
const logoutOtherDevices = asyncHandler(async (req, res, next) => {
  if (!req.sid) {
    return next(new ErrorHandler("Close and reopen the app once, then try again", 400));
  }
  const others = await Session.find({ user: req.user._id, sid: { $ne: req.sid } }).select("sid").lean();
  if (others.length) {
    await Session.deleteMany({ user: req.user._id, sid: { $ne: req.sid } });
    forgetSessions(others.map((o) => o.sid));
  }
  return sendResponse(res, 200, "success", "Other devices logged out", null, { loggedOut: others.length });
});

module.exports = { getMyDevices, pingDevice, renameDevice, logoutDevice, logoutOtherDevices };
