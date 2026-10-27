// Best-effort place lookups for the "My devices" screen. Both are free public
// services, called rarely (only when a device's address or position changes)
// and never allowed to slow down or break a request: every failure returns null.

const ipCache = new Map(); // ip -> { city, region } | null
const MAX_CACHE = 500;

const isPrivateIp = (ip) =>
  !ip ||
  ip === "::1" ||
  /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) ||
  /^(fc|fd|fe80)/i.test(ip);

const getJson = async (url, ms, headers = {}) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers });
  if (!res.ok) return null;
  return res.json();
};

// City-level guess from the internet address (approximate by nature).
const lookupIpCity = async (ip) => {
  if (isPrivateIp(ip)) return null;
  if (ipCache.has(ip)) return ipCache.get(ip);
  let result = null;
  try {
    const d = await getJson(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region`, 3500);
    if (d && d.success && (d.city || d.region)) {
      result = { city: d.city || "", region: d.region || "" };
    }
  } catch (err) {
    result = null;
  }
  if (ipCache.size >= MAX_CACHE) ipCache.clear();
  ipCache.set(ip, result);
  return result;
};

// Area name for an exact position, e.g. "Koramangala, Bengaluru".
const lookupPlaceName = async (lat, lng) => {
  try {
    const d = await getJson(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lng}`,
      4000,
      { "User-Agent": "SquareFinanceApp/1.0 (device location label)" },
    );
    const a = d && d.address;
    if (!a) return null;
    const area = a.suburb || a.neighbourhood || a.city_district || a.village || a.hamlet || "";
    const city = a.city || a.town || a.state_district || a.county || "";
    const name = [area, city].filter((v, i, arr) => v && arr.indexOf(v) === i).join(", ");
    return name || null;
  } catch (err) {
    return null;
  }
};

module.exports = { lookupIpCity, lookupPlaceName, isPrivateIp };
