// IST (Asia/Kolkata) is UTC+5:30. `new Date().toISOString().split("T")[0]`
// is WRONG for "today" between 12:00 AM and 5:29 AM IST - toISOString()
// always converts to UTC first, and UTC's calendar date doesn't roll over
// to match IST's until 5:30 AM IST, so it silently returns yesterday's date
// during that window. Use these instead whenever the intent is "today, in
// IST" rather than "this exact UTC instant". Mirrors the equivalent
// IST-anchoring pattern already established on the backend
// (utils/dateUtils.js, utils/collectionEvents.js).
export const getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export const getISTDateNDaysAgo = (n) => {
  const todayIST = new Date(`${getTodayIST()}T00:00:00+05:30`);
  return new Date(todayIST.getTime() - n * 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
};
