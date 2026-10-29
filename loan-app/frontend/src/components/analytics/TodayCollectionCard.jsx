"use client";
import React, { useState } from "react";
import { getTodayCollectionSummary } from "../../services/loan.service";
import { Loader2, RefreshCw } from "lucide-react";

const ROWS = [
  { key: "vehicle", label: "Vehicle" },
  { key: "weekly", label: "Weekly" },
  { key: "daily", label: "Daily" },
  { key: "interest", label: "Interest" },
];

// Abbreviated for mobile - a full "₹42,300" forces horizontal scroll on a
// phone-width screen once all 4 columns are shown side by side. Karthik's
// explicit ask: fit everything without scrolling, K/L notation is fine.
const formatAmount = (n) => {
  const amount = n || 0;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
};

// Closed until someone presses "Check" - the figures are only worked out on that
// click (not every time the dashboard opens), since this card is rarely looked at.
const TodayCollectionCard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const handleCheck = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTodayCollectionSummary();
      if (res.data) setData(res.data);
    } catch (err) {
      setError(err.message || "Failed to load today's collection summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="today-collection-card bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
      <div className={`p-6 bg-slate-50/30 flex items-center justify-between gap-3 ${data || error ? "border-b border-slate-100" : ""}`}>
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Today&apos;s Collections</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Due vs paid, right now
          </p>
        </div>
        <button
          onClick={handleCheck}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {data ? "Refresh" : "Check"}
        </button>
      </div>

      {error ? (
        <div className="p-8 text-center text-red-500 text-xs font-bold uppercase tracking-tight">{error}</div>
      ) : !data ? null : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-3 sm:px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-3 sm:px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Due</th>
                <th className="px-3 sm:px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Paid</th>
                <th className="px-3 sm:px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Short</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ROWS.map(({ key, label }) => {
                const row = data?.[key] || { expected: 0, collected: 0, short: 0 };
                return (
                  <tr key={key}>
                    <td className="px-3 sm:px-6 py-3 text-xs font-black text-slate-900">{label}</td>
                    <td className="px-3 sm:px-6 py-3 text-xs font-bold text-slate-600 text-right">
                      {formatAmount(row.expected)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-xs font-bold text-emerald-600 text-right">
                      {formatAmount(row.collected)}
                    </td>
                    <td className={`px-3 sm:px-6 py-3 text-xs font-bold text-right ${row.short > 0 ? "text-red-600" : "text-slate-400"}`}>
                      {formatAmount(row.short)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50/30">
                <td className="px-3 sm:px-6 py-3 text-xs font-black text-slate-900">Total</td>
                <td className="px-3 sm:px-6 py-3 text-xs font-black text-slate-900 text-right">
                  {formatAmount(data?.total?.expected)}
                </td>
                <td className="px-3 sm:px-6 py-3 text-xs font-black text-emerald-600 text-right">
                  {formatAmount(data?.total?.collected)}
                </td>
                <td className={`px-3 sm:px-6 py-3 text-xs font-black text-right ${data?.total?.short > 0 ? "text-red-600" : "text-slate-400"}`}>
                  {formatAmount(data?.total?.short)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <style jsx global>{`
        .dashboard-dark-mode .today-collection-card .text-emerald-600 {
          color: #34d399 !important;
        }
        .dashboard-dark-mode .today-collection-card .text-red-600 {
          color: #f87171 !important;
        }
      `}</style>
    </div>
  );
};

export default TodayCollectionCard;
