// Builds a complete copy of the app's database as ONE small gzip file, for the
// nightly report email (the server cannot run MongoDB's own mongodump tool on
// Render's free plan, so the data is read collection by collection instead).
//
// File format (gzip of plain text, one JSON per line, MongoDB "extended JSON" so
// ObjectIds, dates etc. keep their exact types):
//   {"__backup":"squarefinance","version":1,"createdAt":"...","database":"..."}
//   {"__collection":"loans"}
//   <one line per document>
//   {"__end":"loans","count":238}
//   ...next collection...
//   {"__done":true,"collections":{"loans":238,...}}
// The final __done line proves the file is complete. Restore it with
// backend/scripts/restoreFromJsonBackup.js (it checks every count).
//
// Everything in the database is included - every collection, every field,
// including staff password hashes and push-notification subscriptions (decided
// by Karthik 2026-10-18: he and his partner Rohit both receive the full backup,
// so a restore needs no password resets). NOT in a database backup, because it
// is not stored in the database: customer photos (kept in Cloudinary - the
// database only holds each photo's reference) and the server's environment
// settings/keys (kept on Render).
//
// Memory: documents are streamed straight into the compressor, one collection at
// a time, so the full database is never held in memory as text.
const zlib = require("zlib");
const { once } = require("events");
const mongoose = require("mongoose");
const { EJSON } = require("bson");

// Nothing is left out. (Kept as two switches in case a sensitive collection or
// field ever needs to be excluded again, e.g. EXCLUDED_COLLECTIONS.add("x") or
// REMOVED_FIELDS.users = ["password"].)
const EXCLUDED_COLLECTIONS = new Set();
const REMOVED_FIELDS = {};

const buildDatabaseBackup = async () => {
  const db = mongoose.connection.db;
  const gzip = zlib.createGzip({ level: 9 });
  const chunks = [];
  gzip.on("data", (c) => chunks.push(c));
  const finished = new Promise((resolve, reject) => {
    gzip.on("end", resolve);
    gzip.on("error", reject);
  });
  const writeLine = async (obj) => {
    const line = (typeof obj === "string" ? obj : JSON.stringify(obj)) + "\n";
    if (!gzip.write(line)) await once(gzip, "drain");
  };

  const counts = {};
  try {
    await writeLine({ __backup: "squarefinance", version: 1, createdAt: new Date().toISOString(), database: db.databaseName });
    const names = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((n) => !n.startsWith("system.") && !EXCLUDED_COLLECTIONS.has(n))
      .sort();

    for (const name of names) {
      await writeLine({ __collection: name });
      const removed = REMOVED_FIELDS[name] || [];
      let count = 0;
      const cursor = db.collection(name).find({}).batchSize(500);
      for await (const doc of cursor) {
        removed.forEach((f) => delete doc[f]);
        await writeLine(EJSON.stringify(doc, { relaxed: false }));
        count += 1;
      }
      await writeLine({ __end: name, count });
      counts[name] = count;
    }
    await writeLine({ __done: true, collections: counts });
    gzip.end();
  } catch (err) {
    gzip.destroy();
    throw err;
  }
  await finished;

  const buffer = Buffer.concat(chunks);
  const totalDocs = Object.values(counts).reduce((s, n) => s + n, 0);
  return { buffer, counts, totalDocs, collectionCount: Object.keys(counts).length };
};

module.exports = { buildDatabaseBackup, EXCLUDED_COLLECTIONS, REMOVED_FIELDS };
