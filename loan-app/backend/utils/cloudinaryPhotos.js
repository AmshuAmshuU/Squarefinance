const crypto = require("crypto");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

// Customer photos live in Cloudinary (private "authenticated" delivery, served
// through signed URLs we generate here) - MongoDB only keeps a tiny note about
// each photo (public id + version). See models: customerPhoto on each loan type.
//
// Everything is filed under CLOUDINARY_FOLDER_PREFIX ("staging" locally, "live"
// on Render) so test uploads never mix with real customers' photos.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const PREFIX = (process.env.CLOUDINARY_FOLDER_PREFIX || "staging").replace(/^\/+|\/+$/g, "");
const MAX_PHOTO_BYTES = 300 * 1024; // the browser sends ~100 KB; this is only a safety ceiling

const isConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const newToken = () => crypto.randomBytes(8).toString("hex");

// One photo per loan, filed by loan type + loan id.
const finalPublicId = (loanModel, loanId) => `${PREFIX}/customers/${loanModel}/${loanId}`;
// Uploaded while a loan is being created (the loan has no id yet).
const tempPublicId = (token) => `${PREFIX}/tmp/${token}`;
// A staff member's proposed replacement, waiting for Super Admin approval.
const pendingPublicId = (loanModel, loanId, token) => `${PREFIX}/pending/${loanModel}/${loanId}_${token}`;

const TOKEN_RE = /^[a-f0-9]{16}$/;
const isValidToken = (t) => typeof t === "string" && TOKEN_RE.test(t);

const uploadBuffer = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        asset_folder: path.posix.dirname(publicId),
        type: "authenticated",
        resource_type: "image",
        overwrite: true,
        invalidate: true,
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });

// Move an asset to a new public id (e.g. temp -> final once the loan exists).
const renameAsset = (fromId, toId) =>
  cloudinary.uploader.rename(fromId, toId, {
    type: "authenticated",
    to_type: "authenticated",
    overwrite: true,
    invalidate: true,
  });

const destroyAsset = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { type: "authenticated", invalidate: true });
  } catch (err) {
    console.error("Cloudinary destroy failed for", publicId, err.message || err);
  }
};

// Signed delivery URLs: only addresses WE generate work (guessing one fails),
// yet they are stable, so browsers can cache them.
const signedUrl = (publicId, version, transformation) =>
  cloudinary.url(publicId, {
    type: "authenticated",
    sign_url: true,
    secure: true,
    version,
    transformation,
  });

// 2cm icon (shown at 2x for sharp phone screens) and the full pop-up photo.
const thumbUrl = (publicId, version) =>
  signedUrl(publicId, version, [
    { width: 152, height: 152, crop: "fill", gravity: "face" },
    { fetch_format: "auto", quality: "auto" },
  ]);
const fullUrl = (publicId, version) => signedUrl(publicId, version, [{ fetch_format: "auto", quality: "auto" }]);

// Small passport-shaped picture for the loans lists (47 x 60 px shown, 2x for sharp screens).
const listThumbUrl = (publicId, version) =>
  signedUrl(publicId, version, [
    { width: 94, height: 120, crop: "fill", gravity: "face" },
    { fetch_format: "auto", quality: "auto" },
  ]);

// For list responses: the address of a loan's small photo, or null (no photo, or
// photo storage not set up on this server). Computed locally - no Cloudinary call.
const listPhotoUrl = (note) =>
  note?.publicId && isConfigured() ? listThumbUrl(note.publicId, note.version) : null;

// Adds photoThumbUrl to a loan object and drops the raw photo note.
const withListPhoto = (doc) => {
  const { customerPhoto, ...rest } = doc;
  return { ...rest, photoThumbUrl: listPhotoUrl(customerPhoto) };
};

module.exports = {
  listPhotoUrl,
  withListPhoto,
  PREFIX,
  MAX_PHOTO_BYTES,
  isConfigured,
  newToken,
  isValidToken,
  finalPublicId,
  tempPublicId,
  pendingPublicId,
  uploadBuffer,
  renameAsset,
  destroyAsset,
  thumbUrl,
  fullUrl,
  cloudinary,
};
