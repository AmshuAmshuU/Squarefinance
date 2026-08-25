/**
 * Robust date parsing utility to handle multiple formats (ISO, DD-MM-YYYY, DD/MM/YYYY)
 * @param {string|Date} dateInput 
 * @returns {Date} Parsed date or Invalid Date
 */
exports.parseDateInLocalFormat = (dateInput) => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  // Try standard ISO parsing first (YYYY-MM-DD)
  let date = new Date(dateInput);
  
  // If parsing resulted in a different month/day than expected (common with DD-MM-YYYY being read as MM-DD-YYYY)
  // or if we want to be explicit about Indian date format (DD-MM-YYYY)
  const dmYRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
  const match = String(dateInput).match(dmYRegex);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const localDate = new Date(year, month, day);
    
    // Validate the date (e.g. 31-02-2024 would be invalid)
    if (localDate.getFullYear() === year && localDate.getMonth() === month && localDate.getDate() === day) {
        return localDate;
    }
  }

  return date;
};

/**
 * Normalizes a date to midnight IST (Asia/Kolkata) of that date's own IST
 * calendar day - NOT midnight in the server process's local timezone.
 * setHours(0,0,0,0) depends on whichever timezone the process itself runs
 * in (Render defaults to UTC, ~5.5 hours behind IST), which silently uses
 * the wrong day boundary for roughly a third of every day. This is
 * timezone-independent - same result whether the server runs in UTC or IST.
 * @param {Date} date
 * @returns {Date}
 */
exports.normalizeToMidnight = (date) => {
  const d = new Date(date);
  const istDateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Date(`${istDateStr}T00:00:00+05:30`);
};

/**
 * Same as normalizeToMidnight, but the last instant (23:59:59.999) of that
 * date's IST calendar day - the IST-correct counterpart to
 * `date.setHours(23,59,59,999)`.
 * @param {Date} date
 * @returns {Date}
 */
exports.normalizeToEndOfDay = (date) => {
  const d = new Date(date);
  const istDateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Date(`${istDateStr}T23:59:59.999+05:30`);
};

// Today's calendar date in IST (Asia/Kolkata, UTC+5:30), as "YYYY-MM-DD".
// `new Date().toISOString().split("T")[0]` is WRONG for "today" between
// 12:00 AM and 5:29 AM IST - toISOString() always converts to UTC first,
// and UTC's calendar date doesn't roll over to match IST's until 5:30 AM
// IST, so it silently returns yesterday's date during that window. This is
// timezone-independent (works the same whether the server process itself
// runs in UTC, like Render, or IST) - use it instead of toISOString()
// wherever the intent is "today, in IST".
exports.getTodayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
