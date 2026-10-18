// A very short memory cache (45 seconds) for the two heaviest "read the whole
// loan book" calculations on the Analytics page - the cash-flow ledger that
// ROI, Company Valuation and Partners each build, and the list of every
// collection event that the growth charts share. Without it each of those
// cards re-reads every loan and EMI from the database on its own.
//
// Safety rules:
//  - It is wiped the moment ANY request that changes data (anything except
//    GET) starts, and again when that request finishes (see app.js), so a
//    payment, edit or approval made through the app is never hidden by it.
//  - It only lives for 45 seconds in any case. The one gap: data changed
//    OUTSIDE the app (e.g. a script run straight on the database) can show
//    as up to 45 seconds old on these cards.
//  - It stores the result as-is (no copy), so callers must treat what they get
//    as read-only. Every current caller does (filter/sort copies only).
const TTL_MS = 45 * 1000;
const store = new Map();

// Returns the cached result for `key` if it is fresh, otherwise runs `produce`
// once (callers arriving while it runs share the same run) and remembers it.
const remember = (key, produce) => {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = Promise.resolve()
    .then(produce)
    .catch((err) => {
      if (store.get(key)?.value === value) store.delete(key);
      throw err;
    });
  store.set(key, { at: Date.now(), value });
  return value;
};

const clearShortCache = () => store.clear();

module.exports = { remember, clearShortCache };
