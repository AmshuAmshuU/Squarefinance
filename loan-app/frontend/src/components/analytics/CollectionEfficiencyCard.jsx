"use client";
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getMonthlyCollection } from "../../services/analytics.service";
import { getTodayIST } from "../../utils/dateUtils";

const ROWS = [
  { key: "vehicle", label: "Vehicle" },
  { key: "weekly", label: "Weekly" },
  { key: "daily", label: "Daily" },
  { key: "interest", label: "Interest" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Same K/L abbreviation as the dashboard's Today's Collections card so all
// four columns fit a phone-width screen without scrolling.
const formatAmount = (n) => {
  const amount = n || 0;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
};

const CollectionEfficiencyCard = () => {
  const [currentYear, currentMonth] = getTodayIST().split("-").map(Number);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const years = [];
  for (let y = 2024; y <= currentYear; y++) years.push(y);

  useEffect(() => {
    let cancelled = false;
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getMonthlyCollection(year, month);
        if (!cancelled && res.data) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load collection efficiency");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const total = data?.total;
  const isCurrent = year === currentYear && month === currentMonth;
  const pctCollected = total && total.expected > 0 ? ((total.collected / total.expected) * 100).toFixed(1) : null;

  const selectClass =
    "flex-1 min-w-0 appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-slate-100/50";

  return (
    <div className="mt-10 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/30">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">Collection Efficiency</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          Due vs paid, for the month you pick
        </p>
        <div className="flex items-center gap-2 mt-4">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectClass}>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Loading...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 text-xs font-bold uppercase tracking-tight">{error}</div>
      ) : (
        <>
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
                      <td className="px-3 sm:px-6 py-3 text-xs font-bold text-slate-600 text-right">{formatAmount(row.expected)}</td>
                      <td className="px-3 sm:px-6 py-3 text-xs font-bold text-emerald-600 text-right">{formatAmount(row.collected)}</td>
                      <td className={`px-3 sm:px-6 py-3 text-xs font-bold text-right ${row.short > 0 ? "text-red-600" : "text-slate-400"}`}>
                        {formatAmount(row.short)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50/30">
                  <td className="px-3 sm:px-6 py-3 text-xs font-black text-slate-900">Total</td>
                  <td className="px-3 sm:px-6 py-3 text-xs font-black text-slate-900 text-right">{formatAmount(total?.expected)}</td>
                  <td className="px-3 sm:px-6 py-3 text-xs font-black text-emerald-600 text-right">{formatAmount(total?.collected)}</td>
                  <td className={`px-3 sm:px-6 py-3 text-xs font-black text-right ${total?.short > 0 ? "text-red-600" : "text-slate-400"}`}>
                    {formatAmount(total?.short)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="px-6 py-3 text-[10px] font-bold text-slate-400 border-t border-slate-100">
            {isCurrent ? "Current month. " : ""}
            {pctCollected !== null ? `Collected ${pctCollected}% of what was due.` : "Nothing was due this month."}
          </p>
        </>
      )}
    </div>
  );
};

export default CollectionEfficiencyCard;
