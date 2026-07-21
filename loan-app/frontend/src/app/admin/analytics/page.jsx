"use client";
import React, { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import StatsCard from "../../../components/analytics/StatsCard";
import VehicleStatsChart from "../../../components/analytics/VehicleStatsChart";
import {
  TrendingUp,
  IndianRupee,
  Clock,
  CheckCircle,
  BarChart2,
  Wallet,
  AlertCircle,
  Download,
} from "lucide-react";
import { getAnalyticsStats, getExportData } from "../../../services/analytics.service";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useToast } from "../../../context/ToastContext";
import { useUI } from "../../../context/UIContext";
import CollectionTrendChart from "../../../components/analytics/CollectionTrendChart";
import DistributionPieCharts from "../../../components/analytics/DistributionPieCharts";
import PaymentModeTable from "../../../components/analytics/PaymentModeTable";
import ProfitOverview from "../../../components/analytics/ProfitOverview";

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const { isDarkMode: isDark } = useUI();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await getAnalyticsStats();
        if (res.data) {
          setStats(res.data);
        }
      } catch (err) {
        setError(err.message || "Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await getExportData();
      if (!res.data) throw new Error("No data received for export");

      const { monthlyLoans, dailyLoans, weeklyLoans, interestLoans, expenses, analyticsSummary, vehicleEmis, weeklyEmis, dailyEmis, interestEmis, userNameById } = res.data;
      const workbook = new ExcelJS.Workbook();

      const formatHeader = (worksheet, headers, title) => {
        // Add Title
        const titleRow = worksheet.addRow([title]);
        titleRow.font = { name: "Arial Black", size: 16, bold: true };
        worksheet.mergeCells(1, 1, 1, headers.length);
        titleRow.alignment = { vertical: "middle", horizontal: "center" };
        titleRow.height = 30;

        // Add Headers
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1E293B" }, // Slate 800
          };
          cell.font = {
            color: { argb: "FFFFFFFF" },
            bold: true,
            size: 10,
          };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
        headerRow.height = 25;
      };

      const autoFit = (worksheet) => {
        worksheet.columns.forEach((column) => {
          let maxColumnLength = 0;
          column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxColumnLength) {
              maxColumnLength = columnLength;
            }
          });
          column.width = maxColumnLength < 12 ? 12 : maxColumnLength + 2;
        });
      };

      // 1. Monthly Loans
      const monthlySheet = workbook.addWorksheet("Monthly Loans");
      const monthlyHeaders = [
        "SI No", "Loan No.", "Loan Status", "Name", "Address", "Own/Rent", "Mobile no.", "Amount",
        "Interest Rate", "Processing fee", "Tenure Type", "Tenure", "Start date", "End date",
        "EMI Amount", "Overdue", "Remaining Tenure", "Remaining Principle Amount", "Next EMI DueDate",
        "Vehicle Number", "Chassis No", "Engine No", "Type of Vehicle", "Model Year", "YW Board",
        "PAN Number", "Aadhar Number", "Guarantor Name", "Dealer name", "Dealer number", "HP Entry",
        "FC Date", "Insurance date", "Paid EMI counter", "DOCUMENTS COLLECTED", "RTO WORK PENDING",
        "RTO WORK COMPLETED", "Value", "Remarks"
      ];
      formatHeader(monthlySheet, monthlyHeaders, "MONTHLY LOANS REPORT");
      monthlyLoans.forEach((loan, index) => {
        const rowNumber = index + 3;
        // Map fields from top-level as per Loan model structure
        monthlySheet.addRow([
          index + 1,
          loan.loanNumber || "-",
          loan.status || "Active",
          loan.customerName || "-",
          loan.address || "-",
          loan.ownRent || "-",
          Array.isArray(loan.mobileNumbers) ? loan.mobileNumbers.join(", ") : loan.mobileNumbers || "-",
          loan.principalAmount || 0,
          loan.annualInterestRate || 0,
          loan.processingFee || 0,
          loan.tenureType || "Monthly",
          loan.tenureMonths || 0,
          loan.emiStartDate ? new Date(loan.emiStartDate).toLocaleDateString("en-IN") : "-",
          loan.emiEndDate ? new Date(loan.emiEndDate).toLocaleDateString("en-IN") : "-",
          loan.monthlyEMI || 0,
          loan.odAmount || 0,
          loan.remainingTenure || 0,
          loan.remainingPrincipal || loan.remainingPrincipalAmount || 0,
          loan.nextEmiDueDate ? new Date(loan.nextEmiDueDate).toLocaleDateString("en-IN") : "-",
          loan.vehicleNumber || "-",
          loan.chassisNumber || "-",
          loan.engineNumber || "-",
          loan.typeOfVehicle || "-",
          loan.modelYear || "-",
          loan.ywBoard || "-",
          loan.panNumber || "-",
          loan.aadharNumber || "-",
          loan.guarantorName || "-",
          loan.dealerName || "-",
          loan.dealerNumber || "-",
          loan.hpEntry || "Not done",
          loan.fcDate ? new Date(loan.fcDate).toLocaleDateString("en-IN") : "-",
          loan.insuranceDate ? new Date(loan.insuranceDate).toLocaleDateString("en-IN") : "-",
          loan.paidEmisCount || 0,
          loan.docChecklist || "-",
          Array.isArray(loan.rtoWorkPending) ? loan.rtoWorkPending.join(", ") : loan.rtoWorkPending || "-",
          "-",
          loan.totalCollected || 0,
          loan.clientResponse || loan.status?.clientResponse || "-"
        ]);
      });
      autoFit(monthlySheet);

      // 2 & 3. Weekly & Daily (Shared logic from exportExcel.js)
      const addDailyWeeklySheet = (worksheetName, data, title) => {
        const sheet = workbook.addWorksheet(worksheetName);
        const headers = ["Loan No", "Customer Name", "Mobile Numbers", "Guarantor", "Guar. Mobile", "Amount", "Processing Fee", "Start Date", "End Date", "Total EMIs", "EMI Amount", "Paid EMIs", "Remaining EMIs", "Total Collected", "Overdue", "Remaining Principal", "Next EMI Date", "Status", "Remarks"];
        formatHeader(sheet, headers, title);
        data.forEach(loan => {
          const stats = loan.repaymentStats || {};
          sheet.addRow([
            loan.loanNumber || "", loan.customerName || "",
            Array.isArray(loan.mobileNumbers) ? loan.mobileNumbers.join(", ") : loan.mobileNumbers || "",
            loan.guarantorName || "",
            Array.isArray(loan.guarantorMobileNumbers) ? loan.guarantorMobileNumbers.join(", ") : loan.guarantorMobileNumbers || "",
            loan.disbursementAmount || 0, loan.processingFee || 0,
            loan.startDate ? new Date(loan.startDate).toLocaleDateString("en-IN") : "-",
            loan.emiEndDate ? new Date(loan.emiEndDate).toLocaleDateString("en-IN") : "-",
            loan.totalEmis || 0, loan.emiAmount || 0,
            loan.paidEmis || 0,
            loan.remainingEmis || (loan.totalEmis - loan.paidEmis) || 0,
            loan.totalCollected || 0,
            loan.odAmount || 0,
            loan.remainingPrincipalAmount || 0,
            loan.nextEmiDate ? new Date(loan.nextEmiDate).toLocaleDateString("en-IN") : "-",
            typeof loan.status === "string" ? loan.status : (loan.status?.loanStatus || "Active"),
            loan.clientResponse || loan.status?.clientResponse || ""
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
      interestLoans.forEach(loan => {
        interestSheet.addRow([
          loan.loanNumber || "-", loan.status || "Active", loan.customerName || "-", loan.address || "-", loan.ownRent || "-",
          Array.isArray(loan.mobileNumbers) ? loan.mobileNumbers.join(", ") : loan.mobileNumbers || "-",
          loan.guarantorName || "-",
          Array.isArray(loan.guarantorMobileNumbers) ? loan.guarantorMobileNumbers.join(", ") : loan.guarantorMobileNumbers || "-",
          loan.panNumber || "-", loan.aadharNumber || "-", loan.initialPrincipalAmount || 0, loan.remainingPrincipalAmount || 0,
          loan.interestRate || 0, loan.processingFee || 0,
          loan.startDate ? new Date(loan.startDate).toLocaleDateString("en-IN") : "-",
          loan.emiStartDate ? new Date(loan.emiStartDate).toLocaleDateString("en-IN") : "-",
          loan.clientResponse || loan.status?.clientResponse || "-",
          loan.totalCollected || 0
        ]);
      });
      autoFit(interestSheet);

      // 5. Expenses
      const expenseSheet = workbook.addWorksheet("Expenses");
      const expHeaders = ["Date", "Loan #", "Vehicle #", "Particulars", "Amount"];
      formatHeader(expenseSheet, expHeaders, "EXPENSE REPORT");
      expenses.forEach(exp => {
        expenseSheet.addRow([
          exp.date ? new Date(exp.date).toLocaleDateString("en-IN") : "-",
          exp.loanNumber || "OFFICE",
          exp.vehicleNumber || "-",
          exp.particulars || "-",
          exp.amount || 0
        ]);
      });
      autoFit(expenseSheet);

      // 6. Analytics Summary - mirrors the Analytics page's stat cards
      // (everything except graphs). Kept identical to the backend's copy in
      // backend/utils/excelReportBuilder.js (addAnalyticsSummarySheet) so the
      // automated daily email and this manual export always match.
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
      const money = (v) => Math.round(v || 0);
      const summarySheet = workbook.addWorksheet("Analytics Summary");
      const c = analyticsSummary?.cards || {};
      const WIDE = 1 + PROFIT_INTERVAL_COLS.length;

      const sectionTitle = (text) => {
        const row = summarySheet.addRow([text]);
        summarySheet.mergeCells(row.number, 1, row.number, WIDE);
        row.font = { bold: true, size: 13, color: { argb: "FF1E293B" } };
        row.height = 22;
        row.alignment = { vertical: "middle" };
      };
      const tableHeader = (cols) => {
        const row = summarySheet.addRow(cols);
        row.eachCell((cell) => {
          cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
          cell.alignment = { horizontal: "center" };
        });
      };
      const dataRow = (cols, { bold = false } = {}) => {
        const row = summarySheet.addRow(cols);
        if (bold) row.font = { bold: true };
      };
      const blank = () => summarySheet.addRow([]);

      sectionTitle("TOTAL DISBURSED");
      tableHeader(["Type", "All Time", "Active"]);
      TYPE_ROWS.forEach((t) =>
        dataRow([t.label, money(c.disbursementBreakdown?.[t.key]), money(c.activeDisbursed?.[t.key])]),
      );
      dataRow(["Total", money(c.totalLoanAmount), money(c.activeDisbursed?.total)], { bold: true });
      blank();

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

      sectionTitle("TOTAL EXPENSES");
      dataRow(["Total Expenses", money(c.totalExpenses)], { bold: true });
      blank();

      sectionTitle("PENDING PAYMENTS");
      tableHeader(["Type", "Loans", "EMIs"]);
      TYPE_ROWS.forEach((t) =>
        dataRow([t.label, c.pendingBreakdown?.[t.key]?.loans || 0, c.pendingBreakdown?.[t.key]?.emis || 0]),
      );
      dataRow(["Total", c.pendingLoansCount || 0, c.pendingEmisCount || 0], { bold: true });
      blank();

      sectionTitle("PARTIAL PAYMENTS");
      dataRow(["Partial Payments (Loans)", c.partialLoansCount || 0], { bold: true });
      blank();

      sectionTitle("LOAN PORTFOLIO");
      tableHeader(["Type", "Total", "Active", "Closed"]);
      TYPE_ROWS.forEach((t) =>
        dataRow([t.label, c.totalLoansBreakdown?.[t.key] || 0, c.activeByType?.[t.key] || 0, c.closedByType?.[t.key] || 0]),
      );
      dataRow(["Total", c.totalLoansGiven || 0, c.activeLoansCount || 0, c.closedLoansCount || 0], { bold: true });
      blank();

      sectionTitle("MONTHLY EMI EXPECTED");
      tableHeader(["Type", "Amount"]);
      dataRow(["Vehicle", money(c.monthlyEmiBreakdown?.monthly)]);
      dataRow(["Weekly", money(c.monthlyEmiBreakdown?.weekly)]);
      dataRow(["Daily (x30)", money(c.monthlyEmiBreakdown?.daily)]);
      dataRow(["Interest", money(c.monthlyEmiBreakdown?.interest)]);
      dataRow(["Total", money(c.totalMonthlyEmiExpected)], { bold: true });
      blank();

      sectionTitle("PAYMENT MODE ANALYSIS");
      tableHeader(["Type", "Disbursed", "Collected"]);
      dataRow(["Cash Balance", money(c.paymentModeStats?.disbursement?.cash), money(c.paymentModeStats?.collection?.cash)]);
      dataRow(["Account Balance", money(c.paymentModeStats?.disbursement?.account), money(c.paymentModeStats?.collection?.account)]);
      dataRow(["Total Summary", money(c.paymentModeStats?.disbursement?.total), money(c.paymentModeStats?.collection?.total)], { bold: true });
      dataRow(["Net Cash Flow", money((c.paymentModeStats?.collection?.cash || 0) - (c.paymentModeStats?.disbursement?.cash || 0))]);
      dataRow(["Net Bank Flow", money((c.paymentModeStats?.collection?.account || 0) - (c.paymentModeStats?.disbursement?.account || 0))]);
      blank();

      sectionTitle("PROFIT OVERVIEW - TOTAL PROFIT BY PERIOD");
      tableHeader(["Type", ...PROFIT_INTERVAL_COLS.map((i) => i.label)]);
      TYPE_ROWS.forEach((t) => {
        dataRow([t.label, ...PROFIT_INTERVAL_COLS.map((i) => money(analyticsSummary?.profitByInterval?.[i.key]?.breakdown?.[t.key]))]);
      });
      dataRow(["Total", ...PROFIT_INTERVAL_COLS.map((i) => money(analyticsSummary?.profitByInterval?.[i.key]?.totalProfit))], { bold: true });
      blank();

      sectionTitle("EXPECTED PROFIT (NEXT MONTH)");
      tableHeader(["Type", "Expected"]);
      dataRow(["Vehicle", money(analyticsSummary?.expectedNextMonth?.breakdown?.monthly)]);
      dataRow(["Interest", money(analyticsSummary?.expectedNextMonth?.breakdown?.interest)]);
      dataRow(["Total", money(analyticsSummary?.expectedNextMonth?.total)], { bold: true });
      dataRow(["* Weekly and Daily loans excluded - profit is realized only at disbursement"]);

      summarySheet.columns.forEach((column, idx) => {
        column.width = idx === 0 ? 32 : 18;
      });

      // 7. EMI Schedules - one sheet per loan type, filterable by Loan No
      // (AutoFilter dropdown with type-to-search, works in Excel 2010+).
      // Kept identical to the backend's copy in
      // backend/utils/excelReportBuilder.js (addEmiScheduleSheet /
      // addInterestEmiScheduleSheet) so the automated daily email and this
      // manual export always match.
      const nameOf = (id) => (id ? (userNameById?.[id] || "Unknown") : "-");
      const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");

      const addEmiScheduleSheet = (title, emis) => {
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

        (emis || []).forEach((emi) => {
          const od = (emi.overdue || [])[0];
          sheet.addRow([
            emi.loanNumber, emi.customerName, emi.emiNumber, fmtDate(emi.dueDate),
            emi.emiAmount || 0, emi.amountPaid || 0, emi.status,
            emi.paymentMode || "-", fmtDate(emi.paymentDate),
            od ? od.amount : "-", od ? fmtDate(od.date) : "-", od ? od.mode : "-",
            nameOf(emi.updatedBy), nameOf(emi.approvedBy), fmtDate(emi.approvedAt),
          ]);
        });

        sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
        autoFit(sheet);
      };
      addEmiScheduleSheet("Vehicle EMI Schedule", vehicleEmis);
      addEmiScheduleSheet("Weekly EMI Schedule", weeklyEmis);
      addEmiScheduleSheet("Daily EMI Schedule", dailyEmis);

      // Interest EMIs have a different shape (interestAmount instead of
      // emiAmount, no overdue array, a chequeNumber field).
      {
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

        (interestEmis || []).forEach((emi) => {
          sheet.addRow([
            emi.loanNumber, emi.customerName, emi.emiNumber, fmtDate(emi.dueDate),
            emi.interestAmount || 0, emi.amountPaid || 0, emi.status,
            emi.paymentMode || "-", fmtDate(emi.paymentDate), emi.chequeNumber || "-",
            nameOf(emi.updatedBy), nameOf(emi.approvedBy), fmtDate(emi.approvedAt),
          ]);
        });

        sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
        autoFit(sheet);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Consolidated_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast("Consolidated report exported successfully", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
// ... loading component remains same
  }

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Scoped analytics dark mode overrides.
           Every rule below is prefixed with .analytics-dark-mode,
           so nothing here can ever affect any other page or component. */
        .analytics-dark-mode {
          background-color: #0f172a;
          color: #cbd5e1;
        }
        .analytics-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .analytics-dark-mode .bg-white\/60 {
          background-color: rgba(30, 41, 59, 0.6) !important;
        }
        .analytics-dark-mode .bg-slate-50,
        .analytics-dark-mode .bg-slate-100 {
          background-color: #334155 !important;
        }
        .analytics-dark-mode .bg-slate-900 {
          background-color: #475569 !important;
        }
        .analytics-dark-mode .hover\:bg-slate-50:hover,
        .analytics-dark-mode .hover\:bg-slate-50\/50:hover,
        .analytics-dark-mode .hover\:bg-slate-100\/50:hover {
          background-color: #334155 !important;
        }
        .analytics-dark-mode .bg-blue-50 {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
        .analytics-dark-mode .bg-emerald-50 {
          background-color: rgba(16, 185, 129, 0.15) !important;
        }
        .analytics-dark-mode .bg-amber-50 {
          background-color: rgba(245, 158, 11, 0.15) !important;
        }
        .analytics-dark-mode .bg-rose-50 {
          background-color: rgba(244, 63, 94, 0.15) !important;
        }
        .analytics-dark-mode .bg-red-50 {
          background-color: rgba(239, 68, 68, 0.15) !important;
        }
        .analytics-dark-mode .text-red-700 {
          color: #fca5a5 !important;
        }
        .analytics-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .analytics-dark-mode .text-slate-700 {
          color: #e2e8f0 !important;
        }
        .analytics-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .analytics-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .analytics-dark-mode .border-slate-100,
        .analytics-dark-mode .border-slate-200 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .analytics-dark-mode tbody tr:not(:last-child),
        .analytics-dark-mode thead tr {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .analytics-dark-mode svg line[stroke="#E2E8F0"] {
          stroke: rgba(255, 255, 255, 0.08) !important;
        }
        .analytics-dark-mode svg text[fill="#475569"] {
          fill: #cbd5e1 !important;
        }
        .analytics-dark-mode .recharts-default-tooltip {
          background-color: #1e293b !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: #e2e8f0 !important;
        }
        .analytics-dark-mode input,
        .analytics-dark-mode select {
          color-scheme: dark;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDark ? "analytics-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <BarChart2 className="w-8 h-8 text-primary" strokeWidth={3} />
                    ANALYTICS DASHBOARD
                  </h1>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 px-1 text-left">
                    Real-time business performance overview
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none active:scale-95"
                  >
                    {exporting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {exporting ? "Generating..." : "Export Report"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {/* Total Disbursed - All Time + Active */}
                <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                      <IndianRupee className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Disbursed</h3>
                      <p className="text-2xl font-black text-slate-900">₹{(stats?.cards?.totalLoanAmount || 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left font-black text-slate-400 uppercase tracking-widest pb-1.5">Type</th>
                        <th className="text-right font-black text-slate-400 uppercase tracking-widest pb-1.5">All Time</th>
                        <th className="text-right font-black text-blue-400 uppercase tracking-widest pb-1.5">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { label: "Vehicle", key: "monthly", color: "bg-purple-400" },
                        { label: "Weekly", key: "weekly", color: "bg-blue-400" },
                        { label: "Daily", key: "daily", color: "bg-orange-400" },
                        { label: "Interest", key: "interest", color: "bg-green-400" },
                      ].map(row => {
                        const allTime = stats?.cards?.disbursementBreakdown?.[row.key] || 0;
                        const active = stats?.cards?.activeDisbursed?.[row.key] || 0;
                        return (
                          <tr key={row.key}>
                            <td className="py-1.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${row.color}`}></span>
                              <span className="font-bold text-slate-600">{row.label}</span>
                            </td>
                            <td className="py-1.5 text-right font-black text-slate-700">₹{allTime.toLocaleString("en-IN")}</td>
                            <td className="py-1.5 text-right font-black text-blue-600">₹{active.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200">
                        <td className="pt-2 font-black text-slate-700 uppercase">Total</td>
                        <td className="pt-2 text-right font-black text-slate-900">₹{(stats?.cards?.totalLoanAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="pt-2 text-right font-black text-blue-600">₹{(stats?.cards?.activeDisbursed?.total || 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {/* Total Collected + Future Expected */}
                <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Collected</h3>
                      <p className="text-2xl font-black text-slate-900">₹{(stats?.cards?.totalCollectedAmount || 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left font-black text-slate-400 uppercase tracking-widest pb-1.5">Type</th>
                        <th className="text-right font-black text-emerald-500 uppercase tracking-widest pb-1.5">Collected</th>
                        <th className="text-right font-black text-amber-500 uppercase tracking-widest pb-1.5">Expected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { label: "Vehicle", key: "monthly", color: "bg-purple-400" },
                        { label: "Weekly", key: "weekly", color: "bg-blue-400" },
                        { label: "Daily", key: "daily", color: "bg-orange-400" },
                        { label: "Interest", key: "interest", color: "bg-green-400" },
                      ].map(row => {
                        const collected = stats?.cards?.collectedBreakdown?.[row.key] || 0;
                        const future = stats?.cards?.futureIncome?.[row.key] || 0;
                        return (
                          <tr key={row.key}>
                            <td className="py-1.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${row.color}`}></span>
                              <span className="font-bold text-slate-600">{row.label}</span>
                            </td>
                            <td className="py-1.5 text-right font-black text-emerald-600">₹{collected.toLocaleString("en-IN")}</td>
                            <td className="py-1.5 text-right font-black text-amber-600">₹{future.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200">
                        <td className="pt-2 font-black text-slate-700 uppercase">Total</td>
                        <td className="pt-2 text-right font-black text-emerald-600">₹{(stats?.cards?.totalCollectedAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="pt-2 text-right font-black text-amber-600">₹{(stats?.cards?.futureIncome?.total || 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                  {stats?.cards?.futureIncome?.interest > 0 && (
                    <p className="text-[9px] text-slate-400 mt-2 italic">* Interest expected includes ₹{(stats?.cards?.futureIncome?.interestPrincipal || 0).toLocaleString("en-IN")} remaining principal</p>
                  )}
                </div>
                <StatsCard
                  title="Total Expenses"
                  value={`₹${stats?.cards?.totalExpenses?.toLocaleString("en-IN") || "0"}`}
                  icon={<Wallet className="w-6 h-6" />}
                  color="danger"
                />
                {/* Pending Payments Mini Table */}
                <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Pending Payments</h3>
                      <p className="text-2xl font-black text-slate-900">{stats?.cards?.pendingEmisCount || stats?.cards?.pendingLoansCount || "0"} <span className="text-xs font-bold text-slate-400">EMIs</span></p>
                    </div>
                  </div>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left font-black text-slate-400 uppercase tracking-widest pb-1.5">Type</th>
                        <th className="text-center font-black text-slate-400 uppercase tracking-widest pb-1.5">Loans</th>
                        <th className="text-center font-black text-rose-400 uppercase tracking-widest pb-1.5">EMIs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { label: "Vehicle", key: "monthly", color: "bg-purple-400" },
                        { label: "Weekly", key: "weekly", color: "bg-blue-400" },
                        { label: "Daily", key: "daily", color: "bg-orange-400" },
                        { label: "Interest", key: "interest", color: "bg-green-400" },
                      ].map(row => {
                        const loans = stats?.cards?.pendingBreakdown?.[row.key]?.loans || 0;
                        const emis = stats?.cards?.pendingBreakdown?.[row.key]?.emis || 0;
                        return (
                          <tr key={row.key} className={emis > 0 ? "" : "opacity-40"}>
                            <td className="py-1.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${row.color}`}></span>
                              <span className="font-bold text-slate-600">{row.label}</span>
                            </td>
                            <td className="py-1.5 text-center font-black text-slate-700">{loans}</td>
                            <td className="py-1.5 text-center font-black text-rose-500">{emis}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200">
                        <td className="pt-2 font-black text-slate-700 uppercase">Total</td>
                        <td className="pt-2 text-center font-black text-slate-900">{stats?.cards?.pendingLoansCount || 0}</td>
                        <td className="pt-2 text-center font-black text-rose-500">{stats?.cards?.pendingEmisCount || 0}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <StatsCard
                  title="Partial Payments"
                  value={stats?.cards?.partialLoansCount || "0"}
                  icon={<Clock className="w-6 h-6" />}
                  color="warning"
                />
                {/* Loan Portfolio Mini Table */}
                <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Loan Portfolio</h3>
                      <p className="text-2xl font-black text-slate-900">{stats?.cards?.totalLoansGiven || "0"}</p>
                    </div>
                  </div>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left font-black text-slate-400 uppercase tracking-widest pb-1.5">Type</th>
                        <th className="text-center font-black text-slate-400 uppercase tracking-widest pb-1.5">Total</th>
                        <th className="text-center font-black text-emerald-500 uppercase tracking-widest pb-1.5">Active</th>
                        <th className="text-center font-black text-rose-400 uppercase tracking-widest pb-1.5">Closed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { label: "Vehicle", key: "monthly", color: "bg-purple-400" },
                        { label: "Weekly", key: "weekly", color: "bg-blue-400" },
                        { label: "Daily", key: "daily", color: "bg-orange-400" },
                        { label: "Interest", key: "interest", color: "bg-green-400" },
                      ].map(row => {
                        const total = stats?.cards?.totalLoansBreakdown?.[row.key] || 0;
                        const active = stats?.cards?.activeByType?.[row.key] || 0;
                        const closed = stats?.cards?.closedByType?.[row.key] || 0;
                        return (
                          <tr key={row.key}>
                            <td className="py-1.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${row.color}`}></span>
                              <span className="font-bold text-slate-600">{row.label}</span>
                            </td>
                            <td className="py-1.5 text-center font-black text-slate-700">{total}</td>
                            <td className="py-1.5 text-center font-black text-emerald-600">{active}</td>
                            <td className="py-1.5 text-center font-black text-rose-500">{closed}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200">
                        <td className="pt-2 font-black text-slate-700 uppercase">Total</td>
                        <td className="pt-2 text-center font-black text-slate-900">{stats?.cards?.totalLoansGiven || 0}</td>
                        <td className="pt-2 text-center font-black text-emerald-600">{stats?.cards?.activeLoansCount || 0}</td>
                        <td className="pt-2 text-center font-black text-rose-500">{stats?.cards?.closedLoansCount || 0}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <StatsCard
                  title="Monthly EMI Expected"
                  value={`₹${(stats?.cards?.totalMonthlyEmiExpected || 0).toLocaleString("en-IN")}`}
                  icon={<IndianRupee className="w-6 h-6" />}
                  color="success"
                  breakdown={[
                    { label: "Vehicle", value: stats?.cards?.monthlyEmiBreakdown?.monthly || 0 },
                    { label: "Weekly", value: stats?.cards?.monthlyEmiBreakdown?.weekly || 0 },
                    { label: "Daily (×30)", value: stats?.cards?.monthlyEmiBreakdown?.daily || 0 },
                    { label: "Interest", value: stats?.cards?.monthlyEmiBreakdown?.interest || 0 },
                  ]}
                  subtitle="From all active loans"
                />
              </div>

              {/* Chart Section */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-2">
                  <VehicleStatsChart data={stats?.vehicleStats || []} />
                </div>
                <div className="lg:col-span-3">
                  <CollectionTrendChart isCumulative={false} initialInterval="monthly" />
                </div>
              </div>

              {/* Financial Breakdown & Audit */}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-10 mt-10">
                <div className="xl:col-span-3">
                  <DistributionPieCharts 
                    disbursementData={stats?.cards?.disbursementBreakdown || {}} 
                    collectionData={stats?.cards?.collectedBreakdown || {}} 
                  />
                </div>
                <div className="xl:col-span-2">
                  <PaymentModeTable data={stats?.cards?.paymentModeStats || {}} />
                </div>
              </div>

              {/* Cumulative Growth Chart */}
              <div className="mt-10 min-h-[500px]">
                <CollectionTrendChart isCumulative={true} initialInterval="yearly" />
              </div>

              {/* Profit Overview */}
              <ProfitOverview />

              {/* Footer Note */}
              <div className="mt-12 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                  Dashboard data is updated automatically every time you visit.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AnalyticsPage;
