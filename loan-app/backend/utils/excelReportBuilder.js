const ExcelJS = require("exceljs");

// The one and only builder of the "Consolidated Report" workbook: the nightly
// email AND the Export button on the Analytics page (reportController.js
// exportConsolidatedExcel) both use it, so they always produce the same file
// (registry sheets + the whole Analytics page in the "Analytics Summary" sheet).

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
const money = (v) => Math.round(v || 0);

const TYPE_ROWS = [
  { label: "Vehicle", key: "monthly" },
  { label: "Weekly", key: "weekly" },
  { label: "Daily", key: "daily" },
  { label: "Interest", key: "interest" },
];

const PROFIT_INTERVAL_COLS = [
  { key: "all", label: "All Time" },
  { key: "weekly", label: "Last 7 Days" },
  { key: "monthly", label: "Last 30 Days" },
  { key: "3months", label: "Last 3 Months" },
  { key: "6months", label: "Last 6 Months" },
  { key: "yearly", label: "Last 1 Year" },
];

// Mirrors the Analytics page's stat cards (everything except graphs) as a
// permanent tabular sheet, so a plain Excel file carries the same numbers
// the dashboard shows on screen.
const addAnalyticsSummarySheet = (workbook, summary = {}, extras = null) => {
  const sheet = workbook.addWorksheet("Analytics Summary");
  const c = summary.cards || {};
  const WIDE = 1 + PROFIT_INTERVAL_COLS.length; // widest table

  const sectionTitle = (text) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(row.number, 1, row.number, WIDE);
    row.font = { bold: true, size: 13, color: { argb: "FF1E293B" } };
    row.height = 22;
    row.alignment = { vertical: "middle" };
  };

  const tableHeader = (cols) => {
    const row = sheet.addRow(cols);
    row.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
      cell.alignment = { horizontal: "center" };
    });
  };

  const dataRow = (cols, { bold = false } = {}) => {
    const row = sheet.addRow(cols);
    if (bold) row.font = { bold: true };
    return row;
  };

  const blank = () => sheet.addRow([]);

  // 1. Total Disbursed
  sectionTitle("TOTAL DISBURSED");
  tableHeader(["Type", "All Time", "Active"]);
  TYPE_ROWS.forEach((t) =>
    dataRow([t.label, money(c.disbursementBreakdown?.[t.key]), money(c.activeDisbursed?.[t.key])]),
  );
  dataRow(["Total", money(c.totalLoanAmount), money(c.activeDisbursed?.total)], { bold: true });
  blank();

  // 2. Total Collected + Future Expected
  sectionTitle("TOTAL COLLECTED & FUTURE EXPECTED");
  tableHeader(["Type", "Collected", "Expected"]);
  TYPE_ROWS.forEach((t) =>
    dataRow([t.label, money(c.collectedBreakdown?.[t.key]), money(c.futureIncome?.[t.key])]),
  );
  dataRow(["Total", money(c.totalCollectedAmount), money(c.futureIncome?.total)], { bold: true });
  if (c.futureIncome?.interestPrincipal > 0) {
    dataRow([`* Interest expected includes Rs.${money(c.futureIncome.interestPrincipal)} remaining principal`]);
  }
  blank();

  // 3. Total Expenses
  sectionTitle("TOTAL EXPENSES");
  dataRow(["Total Expenses", money(c.totalExpenses)], { bold: true });
  blank();

  // 4. Pending Payments
  sectionTitle("PENDING PAYMENTS");
  tableHeader(["Type", "Loans", "EMIs", "Amount"]);
  TYPE_ROWS.forEach((t) =>
    dataRow([t.label, c.pendingBreakdown?.[t.key]?.loans || 0, c.pendingBreakdown?.[t.key]?.emis || 0, money(c.pendingBreakdown?.[t.key]?.amount)]),
  );
  dataRow(["Total", c.pendingLoansCount || 0, c.pendingEmisCount || 0, money(c.totalPendingAmount)], { bold: true });
  blank();

  // 6. Loan Portfolio
  sectionTitle("LOAN PORTFOLIO");
  tableHeader(["Type", "Total", "Active", "Closed"]);
  TYPE_ROWS.forEach((t) =>
    dataRow([t.label, c.totalLoansBreakdown?.[t.key] || 0, c.activeByType?.[t.key] || 0, c.closedByType?.[t.key] || 0]),
  );
  dataRow(["Total", c.totalLoansGiven || 0, c.activeLoansCount || 0, c.closedLoansCount || 0], { bold: true });
  blank();

  // 7. Monthly EMI Expected
  sectionTitle("MONTHLY EMI EXPECTED");
  tableHeader(["Type", "Amount"]);
  dataRow(["Vehicle", money(c.monthlyEmiBreakdown?.monthly)]);
  dataRow(["Weekly", money(c.monthlyEmiBreakdown?.weekly)]);
  dataRow(["Daily (x30)", money(c.monthlyEmiBreakdown?.daily)]);
  dataRow(["Interest", money(c.monthlyEmiBreakdown?.interest)]);
  dataRow(["Total", money(c.totalMonthlyEmiExpected)], { bold: true });
  blank();

  // 8. Payment Mode Analysis
  sectionTitle("PAYMENT MODE ANALYSIS");
  tableHeader(["Type", "Disbursed", "Collected"]);
  dataRow(["Cash Balance", money(c.paymentModeStats?.disbursement?.cash), money(c.paymentModeStats?.collection?.cash)]);
  dataRow(["Account Balance", money(c.paymentModeStats?.disbursement?.account), money(c.paymentModeStats?.collection?.account)]);
  dataRow(["Total Summary", money(c.paymentModeStats?.disbursement?.total), money(c.paymentModeStats?.collection?.total)], { bold: true });
  dataRow(["Net Cash Flow", money((c.paymentModeStats?.collection?.cash || 0) - (c.paymentModeStats?.disbursement?.cash || 0))]);
  dataRow(["Net Bank Flow", money((c.paymentModeStats?.collection?.account || 0) - (c.paymentModeStats?.disbursement?.account || 0))]);
  blank();

  // 9. Profit Overview - Total Profit by Period
  sectionTitle("PROFIT OVERVIEW - TOTAL PROFIT BY PERIOD");
  tableHeader(["Type", ...PROFIT_INTERVAL_COLS.map((i) => i.label)]);
  TYPE_ROWS.forEach((t) => {
    dataRow([t.label, ...PROFIT_INTERVAL_COLS.map((i) => money(summary.profitByInterval?.[i.key]?.breakdown?.[t.key]))]);
  });
  dataRow(["Total", ...PROFIT_INTERVAL_COLS.map((i) => money(summary.profitByInterval?.[i.key]?.totalProfit))], { bold: true });
  blank();

  // 10. Expected Profit (Next Month)
  sectionTitle("EXPECTED PROFIT (NEXT MONTH)");
  tableHeader(["Type", "Expected"]);
  dataRow(["Vehicle", money(summary.expectedNextMonth?.breakdown?.monthly)]);
  dataRow(["Interest", money(summary.expectedNextMonth?.breakdown?.interest)]);
  dataRow(["Total", money(summary.expectedNextMonth?.total)], { bold: true });
  dataRow(["* Weekly and Daily loans excluded - profit is realized only at disbursement"]);

  // ---- The rest of the Analytics page (emailed daily report only) ----
  if (extras) {
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthLabel = (key) => {
      const [y, m] = String(key).split("-");
      return m && MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1].slice(0, 3)} ${y}` : String(key);
    };
    const pct = (fraction) => (fraction === null || fraction === undefined || Number.isNaN(fraction) ? "N/A" : fraction);
    const withPercentFormat = (row, fromColumn) => {
      row.eachCell((cell, col) => {
        if (col >= fromColumn && typeof cell.value === "number") cell.numFmt = "0.00%";
      });
    };
    const unavailable = (name) => {
      blank();
      sectionTitle(name);
      dataRow(["Could not be loaded for this report - check the Analytics page."]);
    };

    // Collection Efficiency (this month and last month)
    if (extras.collectionEfficiency) {
      [["current", "THIS MONTH"], ["previous", "LAST MONTH"]].forEach(([k, label]) => {
        const m = extras.collectionEfficiency[k];
        if (!m) return;
        blank();
        sectionTitle(`COLLECTION EFFICIENCY - ${label} (${MONTHS[(m.month || 1) - 1]} ${m.year})`);
        tableHeader(["Type", "Expected", "Collected", "Short", "Efficiency"]);
        const eff = (x) => (x?.expected > 0 ? (x.collected || 0) / x.expected : 0);
        [["Vehicle", m.vehicle], ["Weekly", m.weekly], ["Daily", m.daily], ["Interest", m.interest]].forEach(([name, x]) =>
          withPercentFormat(dataRow([name, money(x?.expected), money(x?.collected), money(x?.short), eff(x)]), 5),
        );
        withPercentFormat(dataRow(["Total", money(m.total?.expected), money(m.total?.collected), money(m.total?.short), eff(m.total)], { bold: true }), 5);
      });
    } else unavailable("COLLECTION EFFICIENCY");

    // Disbursement vs Collection / cumulative growth, month by month
    if (Array.isArray(extras.trend)) {
      blank();
      sectionTitle("DISBURSEMENT VS COLLECTION BY MONTH (WITH CUMULATIVE GROWTH)");
      tableHeader(["Month", "Disbursed", "Collected", "Cumulative Disbursed", "Cumulative Collected"]);
      extras.trend.forEach((p) =>
        dataRow([monthLabel(p.date), money(p.disbursement), money(p.collection), money(p.cumulativeDisbursement), money(p.cumulativeCollection)]),
      );
    } else unavailable("DISBURSEMENT VS COLLECTION BY MONTH");

    // Expenses by month
    if (extras.expenseTrend?.points) {
      blank();
      sectionTitle("EXPENSES BY MONTH");
      tableHeader(["Month", "Expenses"]);
      extras.expenseTrend.points.forEach((p) => dataRow([monthLabel(p.key), money(p.amount)]));
      dataRow(["Total", money(extras.expenseTrend.total)], { bold: true });
    } else unavailable("EXPENSES BY MONTH");

    // Return on Investment
    if (extras.roi) {
      const r = extras.roi;
      blank();
      sectionTitle("RETURN ON INVESTMENT");
      tableHeader(["", "Realistic XIRR", "Liquidation XIRR", "Return So Far", "Return Incl. Outstanding"]);
      const roiRow = (label, x, bold) =>
        withPercentFormat(
          dataRow(
            [label, pct(x?.realisticXirr), pct(x?.liquidationXirr), x?.absoluteReturnSoFar == null ? "N/A" : x.absoluteReturnSoFar / 100, x?.absoluteReturnInclOutstanding == null ? "N/A" : x.absoluteReturnInclOutstanding / 100],
            { bold },
          ),
          2,
        );
      roiRow("Whole Business", r, true);
      [["Vehicle", "vehicle"], ["Weekly", "weekly"], ["Daily", "daily"], ["Interest", "interest"]].forEach(([label, k]) => roiRow(label, r.byType?.[k], false));
      dataRow(["Total Disbursed", money(r.disbursed)]);
      dataRow(["Collected So Far", money(r.collectedSoFar)]);
      dataRow(["Outstanding (full face value)", money(r.outstanding)]);
      dataRow([`* As of ${fmtDate(r.asOfDate)}; unpaid EMIs already past due are treated as paid today. No risk / no NPAs assumed.`]);
    } else unavailable("RETURN ON INVESTMENT");

    // Company Valuation
    if (extras.valuation) {
      const v = extras.valuation;
      blank();
      sectionTitle("COMPANY VALUATION");
      tableHeader(["Item", "Amount"]);
      dataRow(["Company Valuation", money(v.companyValuation)], { bold: true });
      dataRow(["Outstanding Loan Book", money(v.outstandingLoanBook)]);
      dataRow(["Cash on Hand", money(v.cashOnHand)]);
      dataRow([`Our Investment (frozen as of ${v.ourInvestmentFrozenDate})`, money(v.ourInvestment)]);
      const gm = dataRow(["Growth Multiple", v.growthMultiple == null ? "N/A" : Math.round(v.growthMultiple * 100) / 100]);
      if (typeof gm.getCell(2).value === "number") gm.getCell(2).numFmt = '0.00"x"';
      dataRow(["Total Disbursed", money(v.totalDisbursed)]);
      dataRow(["Total Collected", money(v.totalCollected)]);
      dataRow(["Total Expenses", money(v.totalExpenses)]);
    } else unavailable("COMPANY VALUATION");

    // Partners
    if (extras.partners) {
      const pr = extras.partners;
      blank();
      sectionTitle("PARTNERS");
      tableHeader(["Partner", "Share", "Invested", "Current Value", "Gain", "Gain %"]);
      (pr.partners || []).forEach((p) => {
        const row = dataRow([p.name, (p.percent || 0) / 100, money(p.investedAmount), money(p.currentValue), money(p.gainAmount), p.gainPercent == null ? "N/A" : p.gainPercent / 100]);
        row.getCell(2).numFmt = "0.00%";
        if (typeof row.getCell(6).value === "number") row.getCell(6).numFmt = "0.00%";
      });
      if (pr.sharesEffectiveFrom) dataRow([`* Shares effective from ${fmtDate(pr.sharesEffectiveFrom)}${pr.sharesReason ? ` - ${pr.sharesReason}` : ""}`]);
    } else unavailable("PARTNERS");

    // Book Growth (all time, loan-type split)
    if (extras.bookGrowth?.buckets) {
      const bg = extras.bookGrowth;
      const typeCols = [["Vehicle", "vehicle"], ["Weekly", "weekly"], ["Daily", "daily"], ["Interest", "interest"]];
      const addBook = (title, field) => {
        blank();
        sectionTitle(title);
        tableHeader(["Period", ...typeCols.map(([l]) => l), "Total"]);
        bg.buckets.forEach((b) => {
          const vals = typeCols.map(([, k]) => b[field]?.[k] || 0);
          dataRow([b.label, ...vals, vals.reduce((a, x) => a + x, 0)]);
        });
      };
      addBook(`BOOK GROWTH - MONEY LENT (${bg.startDate} to ${bg.endDate}, by ${bg.granularity})`, "lent");
      addBook("BOOK GROWTH - MONEY COLLECTED", "collected");
      addBook("BOOK GROWTH - PRINCIPAL RECOVERED", "principal");
    } else unavailable("BOOK GROWTH");

    if (extras.errors?.length) {
      blank();
      sectionTitle("NOTE");
      dataRow([`${extras.errors.length} section(s) could not be loaded for this report: ${extras.errors.join(", ")}`]);
    }
  }

  sheet.columns.forEach((column, idx) => {
    column.width = idx === 0 ? 32 : 18;
  });
};

// One row per EMI, for the Vehicle/Weekly/Daily "EMI" schema shape.
// AutoFilter lets Karthik pick a single Loan No from the column dropdown
// (with a type-to-search box) and hide every other loan's rows instead of
// scrolling through hundreds of EMIs at once - works in Excel 2010+.
const addEmiScheduleSheet = (workbook, title, emis, userNameById) => {
  const headers = [
    "Loan No", "Customer Name", "EMI No", "Due Date", "EMI Amount", "Amount Paid",
    "Status", "Payment Mode", "Payment Date", "Overdue Amount", "Overdue Date", "Overdue Mode",
    "Updated By", "Approved By", "Approved At",
  ];
  const sheet = workbook.addWorksheet(title);
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  headerRow.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const nameOf = (id) => (id ? userNameById[id.toString()] || "Unknown" : "-");

  emis.forEach((emi) => {
    const od = (emi.overdue || [])[0];
    sheet.addRow([
      emi.loanNumber, emi.customerName, emi.emiNumber, fmtDate(emi.dueDate),
      money(emi.emiAmount), money(emi.amountPaid), emi.status,
      emi.paymentMode || "-", fmtDate(emi.paymentDate),
      od ? money(od.amount) : "-", od ? fmtDate(od.date) : "-", od ? od.mode : "-",
      nameOf(emi.updatedBy), nameOf(emi.approvedBy), fmtDate(emi.approvedAt),
    ]);
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  sheet.columns.forEach((column, idx) => {
    let maxLen = headers[idx].length;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > maxLen) maxLen = len;
    });
    column.width = maxLen < 12 ? 12 : maxLen + 2;
  });
};

// Interest loan EMIs have a different shape (interestAmount instead of
// emiAmount, no overdue array, a chequeNumber field) so this stays separate
// rather than forcing addEmiScheduleSheet to branch on loan type.
const addInterestEmiScheduleSheet = (workbook, emis, userNameById) => {
  const headers = [
    "Loan No", "Customer Name", "EMI No", "Due Date", "Interest Amount", "Amount Paid",
    "Status", "Payment Mode", "Payment Date", "Cheque Number",
    "Updated By", "Approved By", "Approved At",
  ];
  const sheet = workbook.addWorksheet("Interest EMI Schedule");
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  headerRow.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const nameOf = (id) => (id ? userNameById[id.toString()] || "Unknown" : "-");

  emis.forEach((emi) => {
    sheet.addRow([
      emi.loanNumber, emi.customerName, emi.emiNumber, fmtDate(emi.dueDate),
      money(emi.interestAmount), money(emi.amountPaid), emi.status,
      emi.paymentMode || "-", fmtDate(emi.paymentDate), emi.chequeNumber || "-",
      nameOf(emi.updatedBy), nameOf(emi.approvedBy), fmtDate(emi.approvedAt),
    ]);
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  sheet.columns.forEach((column, idx) => {
    let maxLen = headers[idx].length;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > maxLen) maxLen = len;
    });
    column.width = maxLen < 12 ? 12 : maxLen + 2;
  });
};

const buildConsolidatedReportWorkbook = async ({ monthlyLoans, dailyLoans, weeklyLoans, interestLoans, expenses, analyticsSummary, vehicleEmis, weeklyEmis, dailyEmis, interestEmis, userNameById }, analyticsExtras = null) => {
  const workbook = new ExcelJS.Workbook();

  // 1. Monthly Loans
  const monthlySheet = workbook.addWorksheet("Monthly Loans");
  const monthlyHeaders = [
    "SI No", "Loan No.", "Loan Status", "Name", "Address", "Own/Rent", "Mobile no.", "Amount",
    "Interest Rate", "Processing fee", "Tenure Type", "Tenure", "Start date", "End date",
    "EMI Amount", "Overdue", "Remaining Tenure", "Remaining Principle Amount", "Next EMI DueDate",
    "Vehicle Number", "Chassis No", "Engine No", "Type of Vehicle", "Model Year", "YW Board",
    "PAN Number", "Aadhar Number", "Guarantor Name", "Guarantor Mobile", "Dealer name", "Dealer number", "HP Entry",
    "FC Date", "Insurance date", "Paid EMI counter", "DOCUMENTS COLLECTED", "RTO WORK PENDING",
    "RTO WORK COMPLETED", "Value", "Remarks", "Next Follow Up Date",
  ];
  formatHeader(monthlySheet, monthlyHeaders, "MONTHLY LOANS REPORT");
  monthlyLoans.forEach((loan, index) => {
    monthlySheet.addRow([
      index + 1, loan.loanNumber || "-", loan.status || "Active", loan.customerName || "-",
      loan.address || "-", loan.ownRent || "-", joinArr(loan.mobileNumbers),
      loan.principalAmount || 0, loan.annualInterestRate || 0, loan.processingFee || 0,
      loan.tenureType || "Monthly", loan.tenureMonths || 0, fmtDate(loan.emiStartDate),
      fmtDate(loan.emiEndDate), loan.monthlyEMI || 0, loan.odAmount || 0,
      loan.remainingTenure || 0, loan.remainingPrincipalAmount || 0,
      fmtDate(loan.nextEmiDueDate), loan.vehicleNumber || "-", loan.chassisNumber || "-",
      loan.engineNumber || "-", loan.typeOfVehicle || "-", loan.modelYear || "-",
      loan.ywBoard || "-", loan.panNumber || "-", loan.aadharNumber || "-",
      loan.guarantorName || "-", joinArr(loan.guarantorMobileNumbers), loan.dealerName || "-", loan.dealerNumber || "-",
      loan.hpEntry || "Not done", fmtDate(loan.fcDate), fmtDate(loan.insuranceDate),
      loan.paidEmisCount || 0, loan.docChecklist || "-", joinArr(loan.rtoWorkPending),
      "-", loan.totalCollected || 0, loan.clientResponse || loan.status?.clientResponse || "-",
      fmtDate(loan.nextFollowUpDate),
    ]);
  });
  autoFit(monthlySheet);

  // 2 & 3. Weekly & Daily
  const addDailyWeeklySheet = (worksheetName, data, title) => {
    const sheet = workbook.addWorksheet(worksheetName);
    const headers = ["Loan No", "Customer Name", "Mobile Numbers", "Guarantor", "Guar. Mobile", "Amount", "Processing Fee", "Start Date", "End Date", "Total EMIs", "EMI Amount", "Paid EMIs", "Remaining EMIs", "Total Collected", "Overdue", "Remaining Principal", "Next EMI Date", "Status", "Remarks", "Next Follow Up Date"];
    formatHeader(sheet, headers, title);
    data.forEach((loan) => {
      sheet.addRow([
        loan.loanNumber || "", loan.customerName || "", joinArr(loan.mobileNumbers),
        loan.guarantorName || "", joinArr(loan.guarantorMobileNumbers),
        loan.disbursementAmount || 0, loan.processingFee || 0, fmtDate(loan.startDate),
        fmtDate(loan.emiEndDate), loan.totalEmis || 0, loan.emiAmount || 0,
        loan.genuinePaidEmis || 0, loan.remainingEmis || (loan.totalEmis - loan.genuinePaidEmis) || 0,
        loan.totalCollected || 0, loan.odAmount || 0, loan.remainingPrincipalAmount || 0,
        fmtDate(loan.nextEmiDate), typeof loan.status === "string" ? loan.status : (loan.status?.loanStatus || "Active"),
        loan.clientResponse || loan.status?.clientResponse || "",
        fmtDate(loan.nextFollowUpDate),
      ]);
    });
    autoFit(sheet);
  };
  addDailyWeeklySheet("Weekly Loans", weeklyLoans, "WEEKLY LOANS REPORT");
  addDailyWeeklySheet("Daily Loans", dailyLoans, "DAILY LOANS REPORT");

  // 4. Interest
  const interestSheet = workbook.addWorksheet("Interest Loans");
  const intHeaders = ["Loan No.", "Status", "Customer Name", "Address", "Own/Rent", "Mobile Numbers", "Guarantor Name", "Guar. Mobile", "PAN Number", "Aadhar Number", "Initial Principal", "Remaining Principal", "Interest Rate (%)", "Processing Fee", "Start Date", "EMI Start Date", "Client Response", "Total Collected", "Next Follow Up Date"];
  formatHeader(interestSheet, intHeaders, "INTEREST LOANS REPORT");
  interestLoans.forEach((loan) => {
    interestSheet.addRow([
      loan.loanNumber || "-", loan.status || "Active", loan.customerName || "-", loan.address || "-",
      loan.ownRent || "-", joinArr(loan.mobileNumbers), loan.guarantorName || "-",
      joinArr(loan.guarantorMobileNumbers), loan.panNumber || "-", loan.aadharNumber || "-",
      loan.initialPrincipalAmount || 0, loan.remainingPrincipalAmount || 0, loan.interestRate || 0,
      loan.processingFee || 0, fmtDate(loan.startDate), fmtDate(loan.emiStartDate),
      loan.clientResponse || loan.status?.clientResponse || "-", loan.totalCollected || 0,
      fmtDate(loan.nextFollowUpDate),
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

  // 6. Analytics Summary
  addAnalyticsSummarySheet(workbook, analyticsSummary, analyticsExtras);

  // 7. EMI Schedules - one sheet per loan type, filterable by Loan No
  addEmiScheduleSheet(workbook, "Vehicle EMI Schedule", vehicleEmis || [], userNameById || {});
  addEmiScheduleSheet(workbook, "Weekly EMI Schedule", weeklyEmis || [], userNameById || {});
  addEmiScheduleSheet(workbook, "Daily EMI Schedule", dailyEmis || [], userNameById || {});
  addInterestEmiScheduleSheet(workbook, interestEmis || [], userNameById || {});

  return workbook.xlsx.writeBuffer();
};

module.exports = { buildConsolidatedReportWorkbook };
