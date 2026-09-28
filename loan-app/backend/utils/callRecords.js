const CallRecord = require("../models/CallRecord");

const TYPE_TO_MODEL = {
  Vehicle: "Loan",
  Monthly: "Loan",
  Weekly: "WeeklyLoan",
  Daily: "DailyLoan",
  Interest: "InterestLoan",
};

const modelOf = (item) => item.loanModel || TYPE_TO_MODEL[item.loanType];
const idOf = (item) => item._id || item.loanId;

// Midnight at the start of today in IST (Render runs in UTC, so a plain
// setHours(0,0,0,0) would use the wrong day boundary).
const startOfTodayIST = () => {
  const istDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Date(`${istDate}T00:00:00+05:30`);
};

const toPublic = (r) => ({
  response: r.response,
  calledByName: r.calledByName,
  calledAt: r.calledAt,
});

// Adds `callRecord` (or null) to each follow-up list item. Only a call made
// today counts, so every loan that shows up as a new item on a later day
// starts blank again.
const attachCallRecords = async (items) => {
  if (!items || items.length === 0) return items;

  const records = await CallRecord.find({
    loanId: { $in: items.map(idOf) },
    calledAt: { $gte: startOfTodayIST() },
  }).lean();

  const byKey = new Map(records.map((r) => [`${r.loanModel}:${r.loanId}`, toPublic(r)]));
  return items.map((i) => ({ ...i, callRecord: byKey.get(`${modelOf(i)}:${idOf(i)}`) || null }));
};

module.exports = { attachCallRecords, startOfTodayIST, toPublic };
