"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Wallet, Calendar, Loader2 } from "lucide-react";
import { getSimpleStats } from "../../services/analytics.service";

const intervalOptions = [
  { label: "All Time", value: "all" },
  { label: "Last 7 Days", value: "weekly" },
  { label: "Last 30 Days", value: "monthly" },
  { label: "Last 3 Months", value: "3months" },
  { label: "Last 6 Months", value: "6months" },
  { label: "Last 1 Year", value: "yearly" },
  { label: "Custom Range", value: "custom" },
];

const formatCurrency = (value) =>
  `₹${Math.round(value || 0).toLocaleString("en-IN")}`;

const STAT_ROWS = [
  { key: "totalProcessingFees", label: "Total Processing Fees", color: "bg-blue-50 text-blue-600" },
  { key: "totalOdAmount", label: "Total OD Amount", color: "bg-amber-50 text-amber-600" },
  { key: "totalForeclosureCharges", label: "Total Foreclosure Charges", color: "bg-purple-50 text-purple-600" },
  { key: "totalMiscAmount", label: "Total Misc Amount", color: "bg-rose-50 text-rose-600" },
];

const SimpleStats = () => {
  const [interval, setIntervalValue] = useState("all");
  const [customDates, setCustomDates] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSimpleStats(
        interval,
        interval === "custom" ? customDates.start : undefined,
        interval === "custom" ? customDates.end : undefined,
      );
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch simple stats:", err);
      setError(err.message || "Failed to load simple stats");
    } finally {
      setLoading(false);
    }
  }, [interval, customDates]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Wallet className="w-6 h-6 text-primary" strokeWidth={3} />
          SIMPLE STATS
        </h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5 px-1">
          Processing fees, OD, and foreclosure-related amounts across all loan types
        </p>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-5 gap-3">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Calendar size={12} />
            {intervalOptions.find((o) => o.value === interval)?.label || "All Time"}
          </div>
          <div className="relative">
            <select
              value={interval}
              onChange={(e) => setIntervalValue(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-slate-100/50"
            >
              {intervalOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {interval === "custom" && (
          <div className="flex items-center gap-2 mb-5">
            <input
              type="date"
              value={customDates.start}
              onChange={(e) =>
                setCustomDates((prev) => ({ ...prev, start: e.target.value }))
              }
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-tight text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-slate-300 font-bold text-[9px]">to</span>
            <input
              type="date"
              value={customDates.end}
              onChange={(e) =>
                setCustomDates((prev) => ({ ...prev, end: e.target.value }))
              }
              className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-tight text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_ROWS.map((row) => (
            <div
              key={row.key}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50"
            >
              <div className={`inline-flex p-2 rounded-xl mb-3 ${row.color}`}>
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                {row.label}
              </p>
              <p className="text-xl font-black text-slate-900">
                {loading ? "…" : formatCurrency(data?.[row.key])}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-[9px] text-red-500 mt-4 font-bold uppercase tracking-tight">
            {error}
          </p>
        )}
        {loading && (
          <div className="flex items-center gap-2 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading...
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleStats;
