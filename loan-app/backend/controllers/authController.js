const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Session = require("../models/Session");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const { deviceFromRequest } = require("../utils/deviceInfo");
const { lookupIpCity } = require("../utils/geoLookup");
const { forgetSession } = require("../utils/sessionCache");

const SESSION_DAYS = 10; // rolling: pushed forward each time the device is used
const MAX_SESSIONS_PER_USER = 20;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const newSid = () => crypto.randomBytes(16).toString("hex");
const sessionExpiry = () => new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

// `sid` ties both tokens to one device's session (see models/Session.js).
const generateTokens = (user, sid) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      sid,
      email: user.email,
      role: user.role,
      name: user.name,
      permissions: user.permissions,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" },
  );

  // jwtid keeps two refresh tokens issued in the same second from being identical
  const refreshToken = jwt.sign(
    { id: user._id, sid },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d", jwtid: crypto.randomBytes(8).toString("hex") },
  );

  return { accessToken, refreshToken };
};

// Creates this device's session record; also works out the approximate city in
// the background (never delays the login).
const startSession = async (req, user) => {
  const sid = newSid();
  const tokens = generateTokens(user, sid);
  const device = deviceFromRequest(req);

  await Session.create({
    user: user._id,
    sid,
    refreshTokenHash: hashToken(tokens.refreshToken),
    ...device,
    lastActiveAt: new Date(),
    expiresAt: sessionExpiry(),
  });

  // keep the list sane: drop the oldest sessions beyond the cap
  Session.find({ user: user._id })
    .sort({ lastActiveAt: -1 })
    .skip(MAX_SESSIONS_PER_USER)
    .select("sid")
    .lean()
    .then(async (extra) => {
      if (!extra.length) return;
      await Session.deleteMany({ sid: { $in: extra.map((e) => e.sid) } });
      extra.forEach((e) => forgetSession(e.sid));
    })
    .catch(() => {});

  lookupIpCity(device.ip)
    .then((place) => {
      if (!place) return null;
      return Session.updateOne(
        { sid },
        { approxCity: place.city, approxRegion: place.region, approxForIp: device.ip },
      );
    })
    .catch(() => {});

  return tokens;
};

const setAuthCookies = (res, tokens, { refresh = true } = {}) => {
  if (refresh) {
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
    });
  }
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Please enter email & password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHandler("Email is incorrect", 401));
  }

  if (!(await user.comparePassword(password))) {
    return next(new ErrorHandler("Password is incorrect", 401));
  }

  if (!user.isActive) {
    return next(new ErrorHandler("This account has been deactivated", 403));
  }

  // One session per device: logging in here no longer replaces the login on
  // the user's other devices.
  const tokens = await startSession(req, user);
  setAuthCookies(res, tokens);

  return sendResponse(res, 200, "success", "Login successful", null, {
    token: tokens.accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    },
  });
});

const refreshToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return next(new ErrorHandler("Refresh token not found", 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    );
  } catch (err) {
    console.error("Refresh token verification failed:", err.message);
    return next(new ErrorHandler("Invalid refresh token", 403));
  }

  const user = await User.findById(decoded.id).select(
    "+refreshToken +previousRefreshToken +previousRefreshTokenExpiresAt",
  );

  if (!user) {
    return next(new ErrorHandler("User not found", 403));
  }

  // A deactivated account can no longer renew its login on any device.
  if (user.isActive === false) {
    return next(new ErrorHandler("This account has been deactivated", 403));
  }

  // ---- Device session (every login made after the My devices update) ----
  if (decoded.sid) {
    const hash = hashToken(token);
    const now = new Date();
    const tokens = generateTokens(user, decoded.sid);

    // Rotate in ONE atomic step: only a request still holding the current
    // token can win, so two tabs refreshing at the same moment can't both
    // rotate and leave the browser with a token the server no longer knows.
    const rotated = await Session.findOneAndUpdate(
      { sid: decoded.sid, user: user._id, refreshTokenHash: hash },
      {
        $set: {
          previousRefreshTokenHash: hash,
          // 60 second grace period for concurrency
          previousRefreshTokenExpiresAt: new Date(Date.now() + 60000),
          refreshTokenHash: hashToken(tokens.refreshToken),
          lastActiveAt: now,
          expiresAt: sessionExpiry(),
        },
      },
    );

    if (rotated) {
      setAuthCookies(res, tokens);
      return sendResponse(res, 200, "success", "Token refreshed", null, { token: tokens.accessToken });
    }

    // Not the current token. Allowed only if it is the one rotated a moment ago.
    const session = await Session.findOne({ sid: decoded.sid, user: user._id });
    if (
      session &&
      session.previousRefreshTokenHash === hash &&
      session.previousRefreshTokenExpiresAt &&
      session.previousRefreshTokenExpiresAt > Date.now()
    ) {
      // The request that just rotated already delivered the new refresh token;
      // this one only gets a fresh access token.
      await Session.updateOne({ sid: decoded.sid }, { $set: { lastActiveAt: now, expiresAt: sessionExpiry() } });
      setAuthCookies(res, tokens, { refresh: false });
      return sendResponse(res, 200, "success", "Token refreshed", null, { token: tokens.accessToken });
    }

    if (session) {
      console.warn("Invalid refresh token attempt for user:", user.email, "| session token mismatch");
    }
    return next(new ErrorHandler("Invalid refresh token", 403));
  }

  // ---- Legacy login (made before the My devices update) ----
  // Same check as before: the token must be the one saved on the user. On
  // success this device is moved onto a proper session, so it starts showing
  // up on the My devices screen without anyone having to log in again.
  let isGracePeriod = false;
  if (user.refreshToken !== token) {
    if (
      user.previousRefreshToken === token &&
      user.previousRefreshTokenExpiresAt &&
      user.previousRefreshTokenExpiresAt > Date.now()
    ) {
      isGracePeriod = true;
      console.log("Grace period refresh token used for user:", user.email);
    } else {
      console.warn(
        "Invalid refresh token attempt for user:",
        user.email,
        "| Token mismatch vs stored and no valid grace period found",
      );
      return next(new ErrorHandler("Invalid refresh token", 403));
    }
  }

  const tokens = await startSession(req, user);
  if (!isGracePeriod) {
    user.refreshToken = undefined;
    user.previousRefreshToken = token;
    user.previousRefreshTokenExpiresAt = new Date(Date.now() + 60000);
    await user.save();
  }

  setAuthCookies(res, tokens);
  return sendResponse(res, 200, "success", "Token refreshed", null, { token: tokens.accessToken });
});

const logout = asyncHandler(async (req, res, next) => {
  const token = req.cookies.refreshToken;

  if (token) {
    try {
      // signature must be valid, but an expired token can still end its session
      const decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { ignoreExpiration: true },
      );
      if (decoded.sid) {
        await Session.deleteOne({ sid: decoded.sid, user: decoded.id });
        forgetSession(decoded.sid);
      }
    } catch (err) {
      // unreadable cookie: nothing to end, just clear it below
    }

    // login made before the My devices update
    const user = await User.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return sendResponse(
    res,
    200,
    "success",
    "Logged out successfully",
    null,
    null,
  );
});

const { sendOTP } = require("../utils/emailService");

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return next(new ErrorHandler("User not found", 404));

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpire = Date.now() + 2 * 60 * 1000;
  await user.save();

  const emailStart = performance.now();
  try {
    await sendOTP(email, otp);
    const emailEnd = performance.now();
    console.log(
      `[PERF] OTP email sent to ${email} in ${(emailEnd - emailStart).toFixed(2)}ms`,
    );
    return sendResponse(res, 200, "success", "OTP sent to email", null, null);
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR:", error.message || error);
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    await user.save();
    return next(new ErrorHandler("Email could not be sent", 500));
  }
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;
  const resetStart = performance.now();
  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordOTPExpire: { $gt: Date.now() },
  });

  if (!user) return next(new ErrorHandler("Invalid or expired OTP", 400));

  user.password = newPassword;
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpire = undefined;
  await user.save();

  const resetEnd = performance.now();
  console.log(
    `[PERF] Password reset for ${email} in ${(resetEnd - resetStart).toFixed(2)}ms`,
  );
  return sendResponse(
    res,
    200,
    "success",
    "Password reset successful",
    null,
    null,
  );
});

module.exports = {
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
};
