// XOD = "expected overdue": how much overdue (OD) a vehicle-loan EMI ideally
// should have earned, at a chosen % per month (3% = 0.1% a day, 4% = 4/30 % a day).
// A pure, display-only calculation - nothing here is saved or feeds any other number.
//
// For one EMI: every day after its due date, the amount of THAT EMI still owed
// earns the daily rate. Part payments lower the owed amount from the day they were
// made (a part-payment made before the due date lowers it from day 1). It stops
// when the EMI is Paid (at its last payment date); an unpaid or part-paid EMI keeps
// growing up to today. Days are IST calendar days; paying on the due date = 0 days.
const istDay = (value) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const dayNumber = (isoDay) => Math.round(Date.parse(`${isoDay}T00:00:00Z`) / 86400000);

// Returns the XOD in rupees (unrounded), or null when there is nothing to show:
//  - EMIs bulk-closed without a real payment (foreclosure / vehicle sale leftovers)
//  - EMIs whose due date has not arrived yet and nothing was paid late
export const computeXod = (emi, ratePctPerMonth, todayIST) => {
  if (!emi || emi.closedWithoutPayment || !emi.dueDate) return null;
  const emiAmount = Number(emi.emiAmount) || 0;
  if (emiAmount <= 0) return null;
  const dailyRate = ratePctPerMonth / 30 / 100;
  const due = istDay(emi.dueDate);

  let payments = (emi.paymentHistory || [])
    .filter((p) => p && Number(p.amount) > 0 && p.date)
    .map((p) => ({ amount: Number(p.amount), day: istDay(p.date) }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  // Older EMIs with no payment history: one payment of the EMI amount on its payment date
  if (payments.length === 0 && emi.status === "Paid" && emi.paymentDate) {
    payments = [{ amount: emiAmount, day: istDay(emi.paymentDate) }];
  }

  const isPaid = emi.status === "Paid";
  if (!isPaid && due > todayIST) return null; // not due yet

  let owed = emiAmount - payments.filter((p) => p.day <= due).reduce((s, p) => s + p.amount, 0);
  const later = payments.filter((p) => p.day > due);
  let from = due;
  let xod = 0;

  later.forEach((p, i) => {
    if (owed <= 0) return;
    xod += owed * dailyRate * (dayNumber(p.day) - dayNumber(from));
    from = p.day;
    owed -= p.amount;
    if (isPaid && i === later.length - 1) owed = 0; // the last payment settles a Paid EMI
  });

  if (owed > 0 && !isPaid) {
    xod += owed * dailyRate * Math.max(0, dayNumber(todayIST) - dayNumber(from));
  }
  return xod;
};

// True while the EMI is still unpaid, i.e. its XOD is still growing day by day
export const isXodGrowing = (emi) => !!emi && emi.status !== "Paid" && !emi.closedWithoutPayment;
