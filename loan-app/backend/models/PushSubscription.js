const mongoose = require("mongoose");

// One document per device a staff member has turned the "Push
// notifications" toggle on for - a person with 2 phones has 2 of these.
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);
