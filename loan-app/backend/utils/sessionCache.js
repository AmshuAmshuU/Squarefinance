const Session = require("../models/Session");

// Every authenticated request has to confirm its device's login still exists
// (so "Log out" on the My devices screen takes effect). To keep that off the
// database for most requests, a "still valid" answer is remembered for 30
// seconds; ending a session in this server clears its entry straight away.
const TTL_MS = 30 * 1000;
const MAX_ENTRIES = 5000;
const valid = new Map(); // sid -> remembered-until (ms)

const isSessionValid = async (sid, userId) => {
  const until = valid.get(sid);
  if (until && until > Date.now()) return true;

  const found = await Session.exists({ sid, user: userId });
  if (!found) {
    valid.delete(sid);
    return false;
  }
  if (valid.size >= MAX_ENTRIES) valid.clear();
  valid.set(sid, Date.now() + TTL_MS);
  return true;
};

const forgetSession = (sid) => valid.delete(sid);
const forgetSessions = (sids) => sids.forEach((s) => valid.delete(s));

module.exports = { isSessionValid, forgetSession, forgetSessions };
