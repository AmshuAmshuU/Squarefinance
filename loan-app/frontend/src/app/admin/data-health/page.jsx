"use client";
import React, { useState, useEffect, useCallback } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { useUI } from "../../../context/UIContext";
import { useToast } from "../../../context/ToastContext";
import { getDataHealthCheck } from "../../../services/analytics.service";

const TYPE_COLOR = {
  Vehicle: "bg-purple-400",
  Weekly: "bg-blue-400",
  Daily: "bg-orange-400",
  Interest: "bg-green-400",
};

const CATEGORIES = [
  { key: "stuckLoans", label: "Loans fully paid but not closed" },
  { key: "emiCounterDrift", label: "EMI counters out of sync" },
  { key: "corruptedOverdue", label: "Corrupted overdue field" },
  { key: "missingSchedule", label: "Active loans with no EMI schedule" },
];

const DataHealthPage = () => {
  const { isDarkMode } = useUI();
  const { showToast } = useToast();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const runCheck = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDataHealthCheck();
      setHealth(res.data);
      setLastChecked(new Date());
    } catch (err) {
      showToast(err.message || "Failed to run data health check", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return (
    <AuthGuard>
      <style jsx global>{`
        .data-health-dark-mode {
          background-color: #0f172a;
        }
        .data-health-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .data-health-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .data-health-dark-mode .text-slate-600,
        .data-health-dark-mode .text-slate-500 {
          color: #cbd5e1 !important;
        }
        .data-health-dark-mode .text-slate-400 {
          color: #94a3b8 !important;
        }
        .data-health-dark-mode .border-slate-200,
        .data-health-dark-mode .border-slate-100 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .data-health-dark-mode .bg-slate-50 {
          background-color: #334155 !important;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "data-health-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Data Health Check
                  </h1>
                  <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
                    {lastChecked ? `Last checked ${lastChecked.toLocaleTimeString("en-IN")}` : "Checking..."}
                  </p>
                </div>
                <button
                  onClick={runCheck}
                  disabled={loading}
                  className="px-6 h-[46px] bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {loading ? "Running..." : "Run Check Again"}
                </button>
              </div>

              {loading && !health ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 p-12 text-center">
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Running health check...</p>
                </div>
              ) : health && health.totalIssues === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 p-10 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-black">
                    ✓
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">No issues found</p>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                      All loan data checks out clean
                    </p>
                  </div>
                </div>
              ) : health ? (
                <div className="space-y-6">
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-center gap-3">
                    <span className="text-rose-600 text-xl font-black">⚠</span>
                    <p className="text-rose-700 font-black text-sm uppercase tracking-tight">
                      {health.totalIssues} issue(s) found — flagged for review only, nothing changed automatically
                    </p>
                  </div>

                  {CATEGORIES.map((cat) => {
                    const items = health[cat.key] || [];
                    if (items.length === 0) return null;
                    return (
                      <div key={cat.key} className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{cat.label}</h3>
                          <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
                            {items.length}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {items.map((item, idx) => (
                            <div key={idx} className="px-6 py-3 flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${TYPE_COLOR[item.type] || "bg-slate-300"}`}></span>
                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest w-16">{item.type}</span>
                              <span className="text-xs font-black text-primary">{item.loanNumber}</span>
                              <span className="text-xs font-bold text-slate-600">{item.customerName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default DataHealthPage;
