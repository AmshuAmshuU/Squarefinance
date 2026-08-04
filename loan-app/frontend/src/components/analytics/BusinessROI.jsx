"use client";
import React, { useState } from "react";
import { TrendingUp, Calendar, Loader2, RefreshCw } from "lucide-react";
import { getBusinessROI } from "../../services/analytics.service";

const lastDayOfLastMonth = () => {
  const d = new Date();
  d.setDate(0); // last day of previous month
  return d.toISOString().split("T")[0];
};
const lastDayOfLastYear = () => {
  const d = new Date();
  return `${d.getFullYear() - 1}-12-31`;
};
const today = () => new Date().toISOString().split("T")[0];

const intervalOptions = [
  { label: "All Time", value: "all" },
  { label: "End of Last Month", value: "lastMonth" },
  { label: "End of Last Year", value: "lastYear" },
  { label: "Custom Date", value: "custom" },
];

const fmtPct = (r) => (r === null || r === undefined ? "N/A" : `${(r * 100).toFixed(2)}%`);
const fmtAbsPct = (r) => (r === null || r === undefined ? "N/A" : `${r.toFixed(2)}%`);
const fmtRs = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN") : "—");

const BusinessROI = () => {
  const [interval, setInterval_] = useState("all");
  const [customDate, setCustomDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calculated, setCalculated] = useState(false);

  const resolveEndDate = () => {
    if (interval === "lastMonth") return lastDayOfLastMonth();
    if (interval === "lastYear") return lastDayOfLastYear();
    if (interval === "custom") return customDate;
    return undefined; // all time
  };

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBusinessROI(resolveEndDate());
      setData(res.data);
      setCalculated(true);
    } catch (err) {
      console.error("Failed to calculate business ROI:", err);
      setError(err.message || "Failed to calculate ROI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" strokeWidth={3} />
          RETURN ON INVESTMENT
        </h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5 px-1">
          Business-wide, since inception — calculated on demand, not shown automatically
        </p>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Calendar size={12} />
            Start: {data?.inceptionDate ? fmtDate(data.inceptionDate) : "business inception"} (fixed)
          </div>
          <div className="flex items-center gap-2">
            <select
              value={interval}
              onChange={(e) => setInterval_(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-slate-100/50"
            >
              {intervalOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {interval === "custom" && (
              <input
                type="date"
                value={customDate}
                max={today()}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-tight text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Calculate
            </button>
          </div>
        </div>

        {!calculated && !loading && (
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-6">
            Pick a range and click Calculate — this walks the full loan history, so it isn't run automatically.
          </p>
        )}

        {error && (
          <p className="text-[9px] text-red-500 mt-2 mb-4 font-bold uppercase tracking-tight">{error}</p>
        )}

        {calculated && data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Realistic XIRR</p>
                <p className="text-xl font-black text-slate-900">{fmtPct(data.realisticXirr)}</p>
                <p className="text-[9px] text-slate-400 mt-1 leading-snug">Annualized. Outstanding money is placed on its real scheduled due dates, not assumed collected today.</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Liquidation XIRR</p>
                <p className="text-xl font-black text-slate-900">{fmtPct(data.liquidationXirr)}</p>
                <p className="text-[9px] text-slate-400 mt-1 leading-snug">Annualized. Upper-bound scenario — as if the entire outstanding book were collected in one go on this date.</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Return So Far</p>
                <p className="text-xl font-black text-slate-900">{fmtAbsPct(data.absoluteReturnSoFar)}</p>
                <p className="text-[9px] text-slate-400 mt-1 leading-snug">Not annualized. Only cash actually collected vs. cash disbursed — expected to look low while capital keeps rolling into new loans.</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Return Incl. Outstanding</p>
                <p className="text-xl font-black text-slate-900">{fmtAbsPct(data.absoluteReturnInclOutstanding)}</p>
                <p className="text-[9px] text-slate-400 mt-1 leading-snug">Not annualized. Assumes every outstanding loan is repaid in full, no defaults.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Disbursed</p>
                <p className="text-sm font-black text-slate-700">{fmtRs(data.disbursed)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Collected So Far</p>
                <p className="text-sm font-black text-slate-700">{fmtRs(data.collectedSoFar)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Outstanding</p>
                <p className="text-sm font-black text-slate-700">{fmtRs(data.outstanding)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BusinessROI;
