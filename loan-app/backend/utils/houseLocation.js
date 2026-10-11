const mongoose = require("mongoose");
const ErrorHandler = require("./ErrorHandler");

// The customer's HOUSE location on Google Maps, saved on the loan itself
// (all four loan types). Staff either paste a Google Maps link (copied from
// Google Maps, or from a WhatsApp / SMS the customer sent) or tap "Use my
// current location" while standing at the house. It is unrelated to the
// "Customer location" link the customer taps (lastLocationLat/Lng) - that
// feature is untouched.
//
//   houseLocation: { link, savedBy, savedAt }   (absent = nothing saved)
//
// The link is shown as a clickable "Open in Maps" button, so it is checked
// here: only https Google Maps links (or plain "lat, lng" coordinates, which
// become a Maps link) are ever stored.
const houseLocationSchema = new mongoose.Schema(
  {
    link: { type: String, required: true, trim: true, maxlength: 600 },
    savedBy: { type: String, trim: true, maxlength: 80 },
    savedAt: { type: Date },
  },
  { _id: false },
);

const COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

const isGoogleMapsUrl = (raw) => {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "maps.app.goo.gl") return true;
  // maps.google.com is Google Maps itself, whatever the path
  if (/^maps\.google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return true;
  if (host === "goo.gl" || host === "www.goo.gl") return url.pathname.startsWith("/maps");
  // google.com, google.co.in, maps.google.com ... followed by a /maps path
  if (/(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return url.pathname.startsWith("/maps");
  return false;
};

const coordsToLink = (text) => {
  const m = String(text).match(COORDS);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

// Returns:
//   undefined  - nothing was sent (leave the saved value alone)
//   null       - remove the saved location
//   {link, savedBy, savedAt} - a clean value to store
// Throws a 400 ErrorHandler for something that is not a Google Maps link.
const normalizeHouseLocation = (input) => {
  if (input === undefined) return undefined;
  if (input === null || input === "") return null;

  const rawLink = typeof input === "string" ? input : input.link;
  if (rawLink === undefined || rawLink === null || String(rawLink).trim() === "") return null;

  let link = String(rawLink).trim();
  const fromCoords = coordsToLink(link);
  if (fromCoords) link = fromCoords;
  else if (!isGoogleMapsUrl(link)) {
    throw new ErrorHandler("House location must be a Google Maps link or coordinates", 400);
  }
  if (link.length > 600) throw new ErrorHandler("House location link is too long", 400);

  const savedAt = input.savedAt ? new Date(input.savedAt) : new Date();
  return {
    link,
    savedBy: typeof input.savedBy === "string" ? input.savedBy.slice(0, 80) : undefined,
    savedAt: isNaN(savedAt) ? new Date() : savedAt,
  };
};

module.exports = { houseLocationSchema, normalizeHouseLocation, isGoogleMapsUrl, coordsToLink };
