const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const ErrorHandler = require("../utils/ErrorHandler");

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT_EMAIL || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

const getPublicKey = asyncHandler(async (req, res, next) => {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return next(new ErrorHandler("Push notifications are not configured on this server", 503));
  }
  sendResponse(res, 200, "success", "VAPID public key", null, {
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
});

// Saves (or refreshes) this device's subscription for the logged-in user.
// endpoint is globally unique per device+browser, so re-subscribing the
// same device just updates its keys rather than creating a duplicate.
const subscribe = asyncHandler(async (req, res, next) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return next(new ErrorHandler("Invalid push subscription", 400));
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user._id, endpoint, keys },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  sendResponse(res, 200, "success", "Subscribed to push notifications", null, null);
});

const unsubscribe = asyncHandler(async (req, res, next) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return next(new ErrorHandler("Endpoint is required", 400));
  }
  await PushSubscription.deleteOne({ endpoint, user: req.user._id });
  sendResponse(res, 200, "success", "Unsubscribed from push notifications", null, null);
});

// Whether THIS device (identified by its own endpoint, not just the
// account) currently has a saved subscription - lets the toggle reflect
// the real per-device state on page load instead of guessing from
// Notification.permission alone (which stays "granted" even after the
// user has unsubscribed this specific device from the backend).
const getStatus = asyncHandler(async (req, res, next) => {
  const { endpoint } = req.query;
  let subscribed = false;
  if (endpoint) {
    subscribed = !!(await PushSubscription.exists({ endpoint, user: req.user._id }));
  }
  sendResponse(res, 200, "success", "Push subscription status", null, { subscribed });
});

// Sends a push message to every device a user has subscribed. Called from
// notificationController.sendNotification() - the single place every
// in-app notification (approval requests, approve/reject results) already
// flows through, so this needs no extra call sites anywhere else.
const sendPushToUser = async (userId, { title, message, url }) => {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  const subs = await PushSubscription.find({ user: userId });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body: message, url: url || "/admin/dashboard" });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
        );
      } catch (err) {
        // 404/410 = the browser/OS has invalidated this subscription
        // (app uninstalled, phone reset, etc.) - clean it up rather than
        // retrying it forever.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("Push send failed:", err.message);
        }
      }
    }),
  );
};

module.exports = { getPublicKey, subscribe, unsubscribe, getStatus, sendPushToUser };
