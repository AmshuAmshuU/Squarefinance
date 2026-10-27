// Small helpers for the "My devices" feature: read the device out of the
// browser's User-Agent text and find the caller's internet address.

const parseUserAgent = (ua = "") => {
  const s = String(ua);

  let os = "";
  if (/iPhone|iPod/i.test(s)) os = "iOS";
  else if (/iPad/i.test(s)) os = "iPadOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Windows/i.test(s)) os = "Windows";
  else if (/CrOS/i.test(s)) os = "ChromeOS";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "Mac";
  else if (/Linux/i.test(s)) os = "Linux";

  let browser = "";
  if (/Edg(e|A|iOS)?\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/SamsungBrowser/i.test(s)) browser = "Samsung Internet";
  else if (/Firefox\/|FxiOS/i.test(s)) browser = "Firefox";
  else if (/CriOS|Chrome\//i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s)) browser = "Safari";

  let deviceType = "computer";
  if (/iPad|Tablet/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) deviceType = "tablet";
  else if (/iPhone|iPod|Mobi|Android/i.test(s)) deviceType = "phone";

  return { os, browser, deviceType };
};

const clientIp = (req) => {
  const raw = req.ip || (req.connection && req.connection.remoteAddress) || "";
  return String(raw).replace(/^::ffff:/, "");
};

// What a new / refreshed session should remember about the request.
const deviceFromRequest = (req) => {
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 400);
  return { userAgent, ...parseUserAgent(userAgent), ip: clientIp(req) };
};

module.exports = { parseUserAgent, clientIp, deviceFromRequest };
