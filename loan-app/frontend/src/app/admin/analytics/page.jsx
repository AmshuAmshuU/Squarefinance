"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import StatsCard from "../../../components/analytics/StatsCard";
import {
  TrendingUp,
  IndianRupee,
  CheckCircle,
  BarChart2,
  AlertCircle,
  Download,
} from "lucide-react";
import { getAnalyticsStats, getConsolidatedReportFile } from "../../../services/analytics.service";
import { getTodayIST } from "../../../utils/dateUtils";
import { saveAs } from "file-saver";
import { useToast } from "../../../context/ToastContext";
import { useUI } from "../../../context/UIContext";
import CollectionTrendChart from "../../../components/analytics/CollectionTrendChart";
import PaymentModeTable from "../../../components/analytics/PaymentModeTable";
import ProfitOverview from "../../../components/analytics/ProfitOverview";
import ExpensesCard from "../../../components/analytics/ExpensesCard";
import BusinessROI from "../../../components/analytics/BusinessROI";
import CompanyValuation from "../../../components/analytics/CompanyValuation";
import PartnersCard from "../../../components/analytics/PartnersCard";
import CollectionEfficiencyCard from "../../../components/analytics/CollectionEfficiencyCard";
import BookGrowth from "../../../components/analytics/BookGrowth";
import { getUserFromToken } from "../../../utils/auth";

// Each loan type's share of a Disbursed/Collected column, as "70%" - shown in
// brackets next to the type name (replaced the two pie charts that showed
// the same split). Shares of the four types' own sum, whole numbers.
const loanTypeShare = (breakdown, key) => {
  const total = ["monthly", "weekly", "daily", "interest"].reduce(
    (sum, k) => sum + (breakdown?.[k] || 0),
    0,
  );
  if (!total) return null;
  const value = breakdown?.[key] || 0;
  if (value <= 0) return "0%";
  const pct = Math.round((value / total) * 100);
  return pct < 1 ? "<1%" : `${pct}%`;
};

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const { isDarkMode: isDark } = useUI();
  const { showToast } = useToast();
  const router = useRouter();
  const currentUser = getUserFromToken();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isAdmin = currentUser?.role === "ADMIN";
  // "Total Growth Trend" onward - SUPER_ADMIN/ADMIN only, regardless of
  // the analytics.view permission toggle below (Karthik's explicit
  // instruction, 2026-08-05).
  const canSeeAdvancedAnalytics = isSuperAdmin || isAdmin;
  // The rest of the page (first part) - the existing "Analytics" permission
  // toggle from the Employees section. Mirrors Sidebar.jsx's exact
  // convention: it only ever restricts EMPLOYEE-role accounts, same as
  // every other sidebar-gated module - ADMIN/SUPER_ADMIN always pass.
  const canViewAnalytics = currentUser?.role !== "EMPLOYEE" || currentUser?.permissions?.analytics?.view === true;

  useEffect(() => {
    if (currentUser && !canViewAnalytics) {
      router.replace("/admin/dashboard");
    }
  }, [currentUser, canViewAnalytics, router]);

  useEffect(() => {
    if (!canViewAnalytics) return;
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
  }, [canViewAnalytics]);

  // The report is built on the server - the very same file the nightly email
  // carries (registry sheets + the whole Analytics page) - so the two can never
  // differ. Only people who can see the advanced half of this page get the button.
  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await getConsolidatedReportFile();
      const { fileName, base64 } = res.data || {};
      if (!base64) throw new Error("The report came back empty");
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      saveAs(
        new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        fileName || `Consolidated_Report_${getTodayIST()}.xlsx`,
      );
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

  if (!canViewAnalytics) {
    // Redirect effect above is already firing - this just avoids a flash
    // of the full page's content in the moment before it completes.
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
          <div className="text-slate-400 font-bold text-sm uppercase tracking-widest">Redirecting...</div>
        </div>
      </AuthGuard>
    );
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
        .analytics-dark-mode .bg-slate-50\/50 {
          /* Solid, not translucent - a semi-transparent light-slate tile
             over the dark-overridden card background produced a washed-out
             grey with too little contrast against its own text. */
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
        .analytics-dark-mode .bg-purple-50 {
          background-color: rgba(147, 51, 234, 0.15) !important;
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
                        const share = loanTypeShare(stats?.cards?.disbursementBreakdown, row.key);
                        return (
                          <tr key={row.key}>
                            <td className="py-1.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${row.color}`}></span>
                              <span className="font-bold text-slate-600">
                                {row.label}
                                {share && <span className="ml-1 text-[9px] font-semibold text-slate-400">({share})</span>}
                              </span>
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
                        const share = loanTypeShare(stats?.cards?.collectedBreakdown, row.key);
                        return (
                          <tr key={row.key}>
                            <td className="py-1.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${row.color}`}></span>
                              <span className="font-bold text-slate-600">
                                {row.label}
                                {share && <span className="ml-1 text-[9px] font-semibold text-slate-400">({share})</span>}
                              </span>
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
                <ExpensesCard fallbackTotal={stats?.cards?.totalExpenses || 0} />
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
                        <th className="text-right font-black text-rose-400 uppercase tracking-widest pb-1.5">Amount</th>
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
                        const amount = stats?.cards?.pendingBreakdown?.[row.key]?.amount || 0;
                        return (
                          <tr key={row.key} className={emis > 0 ? "" : "opacity-40"}>
                            <td className="py-1.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${row.color}`}></span>
                              <span className="font-bold text-slate-600">{row.label}</span>
                            </td>
                            <td className="py-1.5 text-center font-black text-slate-700">{loans}</td>
                            <td className="py-1.5 text-center font-black text-rose-500">{emis}</td>
                            <td className="py-1.5 text-right font-black text-slate-900">₹{amount.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200">
                        <td className="pt-2 font-black text-slate-700 uppercase">Total</td>
                        <td className="pt-2 text-center font-black text-slate-900">{stats?.cards?.pendingLoansCount || 0}</td>
                        <td className="pt-2 text-center font-black text-rose-500">{stats?.cards?.pendingEmisCount || 0}</td>
                        <td className="pt-2 text-right font-black text-slate-900">₹{(stats?.cards?.totalPendingAmount || 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
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
              <div>
                <CollectionTrendChart isCumulative={false} initialInterval="monthly" />
              </div>

              {/* Financial Breakdown & Audit (the loan-type split that used to be
                  two pie charts now sits beside the type names in the first
                  two cards) */}
              <div className="mt-10">
                <PaymentModeTable data={stats?.cards?.paymentModeStats || {}} />
              </div>

              {/* Collection Efficiency - last card visible to every role that
                  can see Analytics; the admin-only block starts below it. */}
              <CollectionEfficiencyCard />

              {/* Everything from here down (Total Growth Trend onward) is
                  SUPER_ADMIN/ADMIN only, not EMPLOYEE - Karthik's explicit
                  2026-08-05 instruction. Matching backend route restrictions
                  live in analyticsRoutes.js for /profit,
                  /roi, /valuation - /trend-stats itself stays open since
                  the "Disbursement vs Collection" chart above (visible to
                  everyone) shares that same endpoint. */}
              {canSeeAdvancedAnalytics && (
                <>
                  {/* Cumulative Growth Chart */}
                  <div className="mt-10 min-h-[500px]">
                    <CollectionTrendChart isCumulative={true} initialInterval="yearly" />
                  </div>

                  {/* Profit Overview */}
                  <ProfitOverview />

                  {/* Return on Investment - on-demand only */}
                  <BusinessROI />

                  {/* Company Valuation - very bottom, on-demand only */}
                  <CompanyValuation />

                  {/* Book Growth - very end, on-demand only */}
                  <BookGrowth />

                  {/* Partners - very last card, SUPER_ADMIN/ADMIN like the rest of
                      this section. Loads by itself when scrolled into view. */}
                  <PartnersCard />

                  {/* Export - the very last thing on the page, only for the
                      people who can see this advanced half (Super Admin / Admin) */}
                  <div className="mt-12 flex justify-center">
                    <button
                      onClick={handleExport}
                      disabled={exporting}
                      className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none active:scale-95"
                    >
                      {exporting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {exporting ? "Generating (can take a little while)..." : "Export Report"}
                    </button>
                  </div>
                </>
              )}

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
