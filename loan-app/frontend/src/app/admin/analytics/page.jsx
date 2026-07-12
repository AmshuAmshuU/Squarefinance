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
import CollectionTrendChart from "../../../components/analytics/CollectionTrendChart";
import DistributionPieCharts from "../../../components/analytics/DistributionPieCharts";
import PaymentModeTable from "../../../components/analytics/PaymentModeTable";

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
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

      const { monthlyLoans, dailyLoans, weeklyLoans, interestLoans, expenses } = res.data;
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
          loan.remainingPrincipal || 0,
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
          { formula: `AH${rowNumber}*O${rowNumber}+P${rowNumber}+J${rowNumber}` },
          loan.remarks || "-"
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
            loan.totalEmis || 0, loan.emiAmount || 0, loan.paidEmis || 0, loan.remainingEmis || 0,
            stats.totalCollected || loan.totalCollected || 0, stats.overdueAmount || 0,
            loan.remainingPrincipalAmount || 0,
            stats.nextEmiDate ? new Date(stats.nextEmiDate).toLocaleDateString("en-IN") : (loan.nextEmiDate ? new Date(loan.nextEmiDate).toLocaleDateString("en-IN") : "-"),
            loan.status || "", loan.remarks || ""
          ]);
        });
        autoFit(sheet);
      };
      addDailyWeeklySheet("Weekly Loans", weeklyLoans, "WEEKLY LOANS REPORT");
      addDailyWeeklySheet("Daily Loans", dailyLoans, "DAILY LOANS REPORT");

      // 4. Interest
      const interestSheet = workbook.addWorksheet("Interest Loans");
      const intHeaders = ["Loan No.", "Status", "Customer Name", "Address", "Own/Rent", "Mobile Numbers", "Guarantor Name", "Guar. Mobile", "PAN Number", "Aadhar Number", "Initial Principal", "Remaining Principal", "Interest Rate (%)", "Processing Fee", "Start Date", "EMI Start Date", "Remarks"];
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
          loan.remarks || "-"
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
      <div className="min-h-screen bg-[#F8FAFC] flex">
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
                <StatsCard
                  title="Total Disbursed"
                  value={`₹${stats?.cards?.totalLoanAmount?.toLocaleString("en-IN") || "0"}`}
                  icon={<IndianRupee className="w-6 h-6" />}
                  color="primary"
                  breakdown={[
                    { label: "Monthly", value: stats?.cards?.disbursementBreakdown?.monthly || 0 },
                    { label: "Weekly", value: stats?.cards?.disbursementBreakdown?.weekly || 0 },
                    { label: "Daily", value: stats?.cards?.disbursementBreakdown?.daily || 0 },
                    { label: "Interest", value: stats?.cards?.disbursementBreakdown?.interest || 0 },
                  ]}
                />
                <StatsCard
                  title="Total Collected"
                  value={`₹${stats?.cards?.totalCollectedAmount?.toLocaleString("en-IN") || "0"}`}
                  icon={<TrendingUp className="w-6 h-6" />}
                  color="success"
                  breakdown={[
                    { label: "Monthly", value: stats?.cards?.collectedBreakdown?.monthly || 0 },
                    { label: "Weekly", value: stats?.cards?.collectedBreakdown?.weekly || 0 },
                    { label: "Daily", value: stats?.cards?.collectedBreakdown?.daily || 0 },
                    { label: "Interest", value: stats?.cards?.collectedBreakdown?.interest || 0 },
                  ]}
                />
                <StatsCard
                  title="Total Expenses"
                  value={`₹${stats?.cards?.totalExpenses?.toLocaleString("en-IN") || "0"}`}
                  icon={<Wallet className="w-6 h-6" />}
                  color="danger"
                />
                <StatsCard
                  title="Pending Payments"
                  value={stats?.cards?.pendingLoansCount || "0"}
                  icon={<AlertCircle className="w-6 h-6" />}
                  color="danger"
                />
                <StatsCard
                  title="Partial Payments"
                  value={stats?.cards?.partialLoansCount || "0"}
                  icon={<Clock className="w-6 h-6" />}
                  color="warning"
                />
                <StatsCard
                  title="Loan Portfolio"
                  value={stats?.cards?.totalLoansGiven || "0"}
                  icon={<CheckCircle className="w-6 h-6" />}
                  color="primary"
                  breakdown={[
                    { label: "Active", value: stats?.cards?.activeLoansCount || 0, isCount: true },
                    { label: "Closed", value: stats?.cards?.closedLoansCount || 0, isCount: true },
                  ]}
                  subtitle="Total Loans Given"
                />
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
