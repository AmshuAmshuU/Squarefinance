const mongoose = require("mongoose");

// One document per logged-in device (browser). Created at login, ended at
// logout / "Log out" on the My devices screen / when the account is
// deactivated or deleted. Each device keeps its own refresh token, so logging
// in on a second device no longer replaces the first one.
const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Random id carried inside this device's access + refresh tokens.
    sid: { type: String, required: true, unique: true },

    // Only a hash of the current / previous refresh token is stored.
    refreshTokenHash: { type: String, required: true },
    previousRefreshTokenHash: { type: String },
    previousRefreshTokenExpiresAt: { type: Date },

    // Set by the person with the pencil on the My devices screen.
    name: { type: String, trim: true, maxlength: 40, default: "" },

    userAgent: { type: String, default: "" },
    deviceType: { type: String, enum: ["phone", "tablet", "computer"], default: "computer" },
    os: { type: String, default: "" },
    browser: { type: String, default: "" },
    // true when the site was opened as an installed / home-screen app
    installedApp: { type: Boolean, default: false },

    ip: { type: String, default: "" },
    // Approximate place worked out from the internet address (city level).
    approxCity: { type: String, default: "" },
    approxRegion: { type: String, default: "" },
    approxForIp: { type: String, default: "" },

    // Exact location from the device's own GPS / Wi-Fi, when the person allowed it.
    lat: { type: Number },
    lng: { type: Number },
    accuracy: { type: Number },
    locationAt: { type: Date },
    placeName: { type: String, default: "" },
    placeForLat: { type: Number },
    placeForLng: { type: Number },
    // "granted" | "denied" | "skipped" | "unsupported" | "unknown"
    locationStatus: { type: String, default: "unknown" },

    lastActiveAt: { type: Date, default: Date.now },
    // Rolling expiry: pushed forward every time the device is used. The TTL
    // index below removes the document (= ends the login) once it passes.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Session", sessionSchema);
