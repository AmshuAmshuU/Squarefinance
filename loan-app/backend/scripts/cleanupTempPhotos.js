// Removes abandoned temporary customer photos from Cloudinary: pictures added on
// an Add Loan form where the loan was never saved. Safe by default - it only
// LISTS what it would remove; add --delete to really remove.
//
//   node scripts/cleanupTempPhotos.js            (list only, older than 14 days)
//   node scripts/cleanupTempPhotos.js --delete   (remove them)
//   node scripts/cleanupTempPhotos.js 30         (use 30 days instead of 14)
//
// Only touches the "tmp" area of the folder prefix in backend/.env (so running it
// locally with prefix "staging" never touches the live photos).
require("dotenv").config();
const photos = require("../utils/cloudinaryPhotos");

(async () => {
  const doDelete = process.argv.includes("--delete");
  const days = Number(process.argv.find((a) => /^\d+$/.test(a))) || 14;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const prefix = `${photos.PREFIX}/tmp/`;
  console.log(`Looking in "${prefix}" for temporary photos older than ${days} days (${doDelete ? "WILL DELETE" : "list only"})`);

  let next;
  let found = 0;
  let removed = 0;
  do {
    const res = await photos.cloudinary.api.resources({ type: "authenticated", prefix, max_results: 500, next_cursor: next });
    for (const r of res.resources || []) {
      found++;
      const old = new Date(r.created_at).getTime() < cutoff;
      console.log(`  ${old ? "OLD " : "new "} ${r.public_id}  (${new Date(r.created_at).toISOString().slice(0, 10)}, ${Math.round(r.bytes / 1024)} KB)`);
      if (old && doDelete) {
        await photos.destroyAsset(r.public_id);
        removed++;
      }
    }
    next = res.next_cursor;
  } while (next);
  console.log(`\nTemporary photos found: ${found}. ${doDelete ? `Removed: ${removed}.` : "Nothing removed (list only)."}`);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
