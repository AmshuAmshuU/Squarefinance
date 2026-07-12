const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");
const socketUtils = require("../utils/socket");
const User = require("../models/User");

// Helper to send notification (internal use)
const sendNotification = async ({ recipientId, senderId, type, title, message, data }) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      data
    });

    const io = socketUtils.getIO();
    const recipientRoom = recipientId.toString();
    
    // Emit the notification itself
    io.to(recipientRoom).emit("new_notification", notification);
    
    // Emit unread count update
    const unreadCount = await Notification.countDocuments({ recipient: recipientId, isRead: false });
    io.to(recipientRoom).emit("unread_count", unreadCount);
    
    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25, status } = req.query;
  const query = { recipient: req.user._id };

  if (status === "unread") query.isRead = false;
  else if (status === "read") query.isRead = true;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate("sender", "name");

  const count = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

  res.json({
    success: true,
    notifications,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    totalNotifications: count,
    unreadCount
  });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true },
    { new: true }
  );

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  const io = socketUtils.getIO();
  io.to(req.user._id.toString()).emit("unread_count", unreadCount);

  res.json({ success: true, notification });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );

  const io = socketUtils.getIO();
  io.to(req.user._id.toString()).emit("unread_count", 0);

  res.json({ success: true, message: "All notifications marked as read" });
});

exports.deleteNotifications = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: "Invalid notification IDs" });
  }

  await Notification.deleteMany({
    _id: { $in: ids },
    recipient: req.user._id
  });

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  const io = socketUtils.getIO();
  io.to(req.user._id.toString()).emit("unread_count", unreadCount);

  res.json({ success: true, message: "Notifications deleted" });
});

// Clear all notifications for current user
exports.clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });
  const io = socketUtils.getIO();
  io.to(req.user._id.toString()).emit("unread_count", 0);
  res.json({ success: true, message: "All notifications cleared" });
});

// Export sendNotification for use in other controllers
exports.sendNotification = sendNotification;

// Utility to notify all admins
exports.notifyAdmins = async ({ senderId, type, title, message, data }) => {
  // Find all Super Admins and users with paymentApproval permission
  const admins = await User.find({
    $or: [
      { role: "SUPER_ADMIN" },
      { "permissions.paymentApproval": true }
    ],
    _id: { $ne: senderId } // Don't notify the person who made the request
  });

  for (const admin of admins) {
    await sendNotification({
      recipientId: admin._id,
      senderId,
      type,
      title,
      message,
      data,
    });
  }
};

// Utility to notify all admins about pending approval count changes
exports.notifyApprovalCountChange = async () => {
  try {
    const Approval = require("../models/Approval");
    const count = await Approval.countDocuments({ status: "Pending" });
    const io = socketUtils.getIO();

    // Find all Super Admins
    const admins = await User.find({ role: "SUPER_ADMIN" });

    for (const admin of admins) {
      io.to(admin._id.toString()).emit("pending_approvals_count", count);
    }
  } catch (error) {
    console.error("Error notifying approval count change:", error);
  }
};
