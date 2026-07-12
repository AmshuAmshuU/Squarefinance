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
 * Normalizes a date to midnight local time
 * @param {Date} date 
 * @returns {Date}
 */
exports.normalizeToMidnight = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
