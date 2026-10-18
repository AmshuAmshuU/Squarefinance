// Restores a database backup file made by utils/databaseBackup.js (the
// "SquareFinance_database_backup_....json.gz" attached to the nightly email).
//
// Usage (from the backend folder):
//   node scripts/restoreFromJsonBackup.js <file.json.gz> --db <target database name> [--drop]
//
// Safety rules:
//   - Connects to whatever MONGODB_URI is set (staging by default, from .env).
//   - A target database name is REQUIRED - there is no silent default.
//   - Refuses to touch a collection that already has data unless --drop is given
//     (--drop empties each collection it restores, first).
//   - Refuses --drop on the real app database name ("test") unless you also add
//     --i-know-this-is-the-real-database.
//   - Checks every collection's count against the file; exits with an error if
//     the file is incomplete or anything does not add up.
// The file is a complete copy of the database (all collections and fields, incl.
// password hashes and push subscriptions). Customer photos live in Cloudinary and
// are not part of it.
require("dotenv").config({ quiet: true });
const fs = require("fs");
const zlib = require("zlib");
const readline = require("readline");
const mongoose = require("mongoose");
const { EJSON } = require("bson");

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--db");
const dbIdx = args.indexOf("--db");
const dbName = dbIdx >= 0 ? args[dbIdx + 1] : null;
const drop = args.includes("--drop");
const realOk = args.includes("--i-know-this-is-the-real-database");

const fail = (msg) => { console.error("\nSTOPPED: " + msg + "\n"); process.exit(1); };

(async () => {
  if (!file || !dbName) fail("usage: node scripts/restoreFromJsonBackup.js <file.json.gz> --db <target database name> [--drop]");
  if (!fs.existsSync(file)) fail("file not found: " + file);
  if (drop && dbName === "test" && !realOk) fail('--drop on the database "test" (the real app database name) needs --i-know-this-is-the-real-database');

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.getClient().db(dbName);
  console.log(`Restoring ${file}\n  into database "${dbName}" on ${mongoose.connection.host}${drop ? "  (--drop: existing data in restored collections is emptied first)" : ""}\n`);

  const rl = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let meta = null, current = null, batch = [], inCollection = 0, done = null;
  const restored = {};
  const flush = async () => {
    if (batch.length) { await db.collection(current).insertMany(batch, { ordered: false }); batch = []; }
  };

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (line.startsWith('{"__backup"')) { meta = JSON.parse(line); console.log(`Backup made ${meta.createdAt} from database "${meta.database}"`); continue; }
    if (line.startsWith('{"__collection"')) {
      current = JSON.parse(line).__collection; inCollection = 0;
      const existing = await db.collection(current).countDocuments();
      if (existing > 0) {
        if (!drop) fail(`"${current}" in "${dbName}" already has ${existing} documents. Nothing restored for it - use an empty database name, or add --drop.`);
        await db.collection(current).deleteMany({});
      }
      continue;
    }
    if (line.startsWith('{"__end"')) {
      await flush();
      const end = JSON.parse(line);
      if (end.__end !== current || end.count !== inCollection) fail(`count mismatch in "${current}": file says ${end.count}, read ${inCollection}`);
      restored[current] = inCollection; console.log(`  restored ${current.padEnd(24)} ${inCollection}`);
      current = null; continue;
    }
    if (line.startsWith('{"__done"')) { done = JSON.parse(line); continue; }
    if (!current) fail("unexpected data line outside a collection - file is damaged");
    batch.push(EJSON.parse(line, { relaxed: false }));
    inCollection += 1;
    if (batch.length >= 500) await flush();
  }

  if (!done) fail("the file ended early (no completion marker) - it is incomplete, do not rely on this restore");
  const wrong = Object.keys(done.collections).filter((c) => restored[c] !== done.collections[c]);
  if (wrong.length || Object.keys(restored).length !== Object.keys(done.collections).length) fail("collections in the file do not match its own summary: " + wrong.join(", "));
  // Indexes are not stored in the file: the app recreates them when it starts.
  const total = Object.values(restored).reduce((s, n) => s + n, 0);
  console.log(`\nDONE: ${Object.keys(restored).length} collections, ${total} documents restored into "${dbName}". All counts match the file.`);
  await mongoose.disconnect();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
