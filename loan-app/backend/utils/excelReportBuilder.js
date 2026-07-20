const ExcelJS = require("exceljs");

// Mirrors the "Consolidated Report" built client-side in
// frontend/src/app/admin/analytics/page.jsx (handleExport) — same sheets,
// same headers, same column order — so the automated daily email produces
// byte-for-byte the same report shape as the manual Export button.

const formatHeader = (worksheet, headers, title) => {
  const titleRow = worksheet.addRow([title]);
  titleRow.font = { name: "Arial Black", size: 16, bold: true };
  worksheet.mergeCells(1, 1, 1, headers.length);
  titleRow.alignment = { vertical: "middle", horizontal: "center" };
  titleRow.height = 30;

  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" }, left: { style: "thin" },
      bottom: { style: "thin" }, right: { style: "thin" },
    };
  });
  headerRow.height = 25;
};

const autoFit = (worksheet) => {
  worksheet.columns.forEach((column) => {
    let maxColumnLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxColumnLength) maxColumnLength = columnLength;
    });
    column.width = maxColumnLength < 12 ? 12 : maxColumnLength + 2;
  });
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");
const joinArr = (a) => (Array.isArray(a) ? a.join(", ") : a || "-");

const buildConsolidatedReportWorkbook = async ({ monthlyLoans, dailyLoans, weeklyLoans, interestLoans, expenses }) => {
  const workbook = new ExcelJS.Workbook();

  // 1. Monthly Loans
  const monthlySheet = workbook.addWorksheet("Monthly Loans");
  const monthlyHeaders = [
    "SI No", "Loan No.", "Loan Status", "Name", "Address", "Own/Rent", "Mobile no.", "Amount",
    "Interest Rate", "Processing fee", "Tenure Type", "Tenure", "Start date", "End date",
    "EMI Amount", "Overdue", "Remaining Tenure", "Remaining Principle Amount", "Next EMI DueDate",
    "Vehicle Number", "Chassis No", "Engine No", "Type of Vehicle", "Model Year", "YW Board",
    "PAN Number", "Aadhar Number", "Guarantor Name", "Dealer name", "Dealer number", "HP Entry",
    "FC Date", "Insurance date", "Paid EMI counter", "DOCUMENTS COLLECTED", "RTO WORK PENDING",
    "RTO WORK COMPLETED", "Value", "Remarks",
  ];
  formatHeader(monthlySheet, monthlyHeaders, "MONTHLY LOANS REPORT");
  monthlyLoans.forEach((loan, index) => {
    monthlySheet.addRow([
      index + 1, loan.loanNumber || "-", loan.status || "Active", loan.customerName || "-",
      loan.address || "-", loan.ownRent || "-", joinArr(loan.mobileNumbers),
      loan.principalAmount || 0, loan.annualInterestRate || 0, loan.processingFee || 0,
      loan.tenureType || "Monthly", loan.tenureMonths || 0, fmtDate(loan.emiStartDate),
      fmtDate(loan.emiEndDate), loan.monthlyEMI || 0, loan.odAmount || 0,
      loan.remainingTenure || 0, loan.remainingPrincipal || loan.remainingPrincipalAmount || 0,
      fmtDate(loan.nextEmiDueDate), loan.vehicleNumber || "-", loan.chassisNumber || "-",
      loan.engineNumber || "-", loan.typeOfVehicle || "-", loan.modelYear || "-",
      loan.ywBoard || "-", loan.panNumber || "-", loan.aadharNumber || "-",
      loan.guarantorName || "-", loan.dealerName || "-", loan.dealerNumber || "-",
      loan.hpEntry || "Not done", fmtDate(loan.fcDate), fmtDate(loan.insuranceDate),
      loan.paidEmisCount || 0, loan.docChecklist || "-", joinArr(loan.rtoWorkPending),
      "-", loan.totalCollected || 0, loan.clientResponse || loan.status?.clientResponse || "-",
    ]);
  });
  autoFit(monthlySheet);

  // 2 & 3. Weekly & Daily
  const addDailyWeeklySheet = (worksheetName, data, title) => {
    const sheet = workbook.addWorksheet(worksheetName);
    const headers = ["Loan No", "Customer Name", "Mobile Numbers", "Guarantor", "Guar. Mobile", "Amount", "Processing Fee", "Start Date", "End Date", "Total EMIs", "EMI Amount", "Paid EMIs", "Remaining EMIs", "Total Collected", "Overdue", "Remaining Principal", "Next EMI Date", "Status", "Remarks"];
    formatHeader(sheet, headers, title);
    data.forEach((loan) => {
      sheet.addRow([
        loan.loanNumber || "", loan.customerName || "", joinArr(loan.mobileNumbers),
        loan.guarantorName || "", joinArr(loan.guarantorMobileNumbers),
        loan.disbursementAmount || 0, loan.processingFee || 0, fmtDate(loan.startDate),
        fmtDate(loan.emiEndDate), loan.totalEmis || 0, loan.emiAmount || 0,
        loan.paidEmis || 0, loan.remainingEmis || (loan.totalEmis - loan.paidEmis) || 0,
        loan.totalCollected || 0, loan.odAmount || 0, loan.remainingPrincipalAmount || 0,
        fmtDate(loan.nextEmiDate), typeof loan.status === "string" ? loan.status : (loan.status?.loanStatus || "Active"),
        loan.clientResponse || loan.status?.clientResponse || "",
      ]);
    });
    autoFit(sheet);
  };
  addDailyWeeklySheet("Weekly Loans", weeklyLoans, "WEEKLY LOANS REPORT");
  addDailyWeeklySheet("Daily Loans", dailyLoans, "DAILY LOANS REPORT");

  // 4. Interest
  const interestSheet = workbook.addWorksheet("Interest Loans");
  const intHeaders = ["Loan No.", "Status", "Customer Name", "Address", "Own/Rent", "Mobile Numbers", "Guarantor Name", "Guar. Mobile", "PAN Number", "Aadhar Number", "Initial Principal", "Remaining Principal", "Interest Rate (%)", "Processing Fee", "Start Date", "EMI Start Date", "Client Response", "Total Collected"];
  formatHeader(interestSheet, intHeaders, "INTEREST LOANS REPORT");
  interestLoans.forEach((loan) => {
    interestSheet.addRow([
      loan.loanNumber || "-", loan.status || "Active", loan.customerName || "-", loan.address || "-",
      loan.ownRent || "-", joinArr(loan.mobileNumbers), loan.guarantorName || "-",
      joinArr(loan.guarantorMobileNumbers), loan.panNumber || "-", loan.aadharNumber || "-",
      loan.initialPrincipalAmount || 0, loan.remainingPrincipalAmount || 0, loan.interestRate || 0,
      loan.processingFee || 0, fmtDate(loan.startDate), fmtDate(loan.emiStartDate),
      loan.clientResponse || loan.status?.clientResponse || "-", loan.totalCollected || 0,
    ]);
  });
  autoFit(interestSheet);

  // 5. Expenses
  const expenseSheet = workbook.addWorksheet("Expenses");
  const expHeaders = ["Date", "Loan #", "Vehicle #", "Particulars", "Amount"];
  formatHeader(expenseSheet, expHeaders, "EXPENSE REPORT");
  expenses.forEach((exp) => {
    expenseSheet.addRow([
      fmtDate(exp.date), exp.loanNumber || "OFFICE", exp.vehicleNumber || "-",
      exp.particulars || "-", exp.amount || 0,
    ]);
  });
  autoFit(expenseSheet);

  return workbook.xlsx.writeBuffer();
};

module.exports = { buildConsolidatedReportWorkbook };
