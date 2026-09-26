"use client";
import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Layers, Loader2, RefreshCw } from "lucide-react";
import { getBookGrowth } from "../../services/analytics.service";
import { getTodayIST, getISTDateNDaysAgo } from "../../utils/dateUtils";

const intervalOptions = [
  { label: "All Time", value: "all" },
  { label: "Last 7 Days", value: "weekly" },
  { label: "Last 30 Days", value: "monthly" },
  { label: "Last 3 Months", value: "3months" },
  { label: "Last 6 Months", value: "6months" },
  { label: "Last 1 Year", value: "yearly" },
  { label: "Custom Range", value: "custom" },
];

const TYPE_OPTIONS = [
  { label: "All Loan Types", value: "all" },
  { label: "Vehicle", value: "vehicle" },
  { label: "Weekly", value: "weekly" },
  { label: "Daily", value: "daily" },
  { label: "Interest", value: "interest" },
];

const fmtRs = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmtLakh = (n) => `${(n / 100000).toFixed(1)}L`;
const sumTypes = (obj, type) =>
  type === "all" ? Object.values(obj).reduce((s, v) => s + v, 0) : obj[type] || 0;

const selectClass =
  "appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-slate-100/50";
const dateClass =
  "flex-1 min-w-0 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-tight text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20";

const BookGrowth = () => {
  const [interval, setInterval_] = useState("6months");
  const [customDates, setCustomDates] = useState({
    start: getISTDateNDaysAgo(90),
    end: getTodayIST(),
  });
  const [type, setType] = useState("all");
  const [mode, setMode] = useState("collected");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBookGrowth(
        interval,
        interval === "custom" ? customDates.start : undefined,
        interval === "custom" ? customDates.end : undefined,
      );
      setData(res.data);
    } catch (err) {
      console.error("Failed to calculate book growth:", err);
      setError(err.message || "Failed to calculate");
    } finally {
      setLoading(false);
    }
  };

  const chart = useMemo(() => {
    if (!data) return null;
    const rows = data.buckets.map((b) => {
      const lent = sumTypes(b.lent, type);
      const green = sumTypes(mode === "collected" ? b.collected : b.principal, type);
      return { label: b.label, lent, green, net: green - lent };
    });
    const totalLent = rows.reduce((s, r) => s + r.lent, 0);
    const totalGreen = rows.reduce((s, r) => s + r.green, 0);
    return { rows, totalLent, totalGreen };
  }, [data, type, mode]);

  const greenLabel = mode === "collected" ? "Total collected" : "Principal only";
  const diff = chart ? chart.totalGreen - chart.totalLent : 0;
  const note = !chart
    ? ""
    : mode === "collected"
      ? diff >= 0
        ? `Collected is ahead by ${fmtRs(diff)}: cash building up, ready to relend.`
        : `Lent is ahead by ${fmtRs(-diff)}: lending more than coming back.`
      : diff >= 0
        ? `Principal is coming back faster than you lend: the book is shrinking by ${fmtRs(diff)}.`
        : `You lent ${fmtRs(-diff)} more than principal returned: the book grew by that much.`;

  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Layers className="w-6 h-6 text-primary" strokeWidth={3} />
          BOOK GROWTH
        </h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5 px-1">
          Money lent out vs money coming back — calculated on demand
        </p>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-3">
          <select value={interval} onChange={(e) => setInterval_(e.target.value)} className={`flex-1 ${selectClass}`}>
            {intervalOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Calculate
          </button>
        </div>

        {interval === "custom" && (
          <div className="flex items-center gap-2 mb-3">
            <input
              type="date"
              value={customDates.start}
              max={customDates.end}
              onChange={(e) => setCustomDates((p) => ({ ...p, start: e.target.value }))}
              className={dateClass}
            />
            <span className="text-slate-300 font-bold text-[9px]">to</span>
            <input
              type="date"
              value={customDates.end}
              max={getTodayIST()}
              onChange={(e) => setCustomDates((p) => ({ ...p, end: e.target.value }))}
              className={dateClass}
            />
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className={`flex-1 ${selectClass}`}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Green bar shows</p>
        <div className="flex items-center gap-2 mb-5">
          {[
            { value: "collected", label: "Total collected" },
            { value: "principal", label: "Principal only" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                mode === opt.value
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-slate-50 text-slate-500 border-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && <p className="text-[9px] text-red-500 mb-4 font-bold uppercase tracking-tight">{error}</p>}

        {!data && !loading && (
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-6">
            Pick a range and click Calculate — this walks the full loan history, so it isn't run automatically.
          </p>
        )}

        {chart && (
          <>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart.rows} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtLakh} />
                  <Tooltip
                    formatter={(value, name) => [fmtRs(value), name]}
                    contentStyle={{ borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                  />
                  <Bar dataKey="lent" name="Lent out" fill="#BA7517" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="green" name={greenLabel} fill="#1D9E75" radius={[3, 3, 0, 0]} />
                  <Line dataKey="net" name="Net" stroke="#888780" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-4 mt-3 mb-4 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#BA7517" }} />Lent out</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#1D9E75" }} />{greenLabel}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5" style={{ background: "#888780" }} />Net (green minus lent)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Lent Out</p>
                <p className="text-xl font-black text-slate-900">{fmtRs(chart.totalLent)}</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  {mode === "collected" ? "Collected" : "Principal Repaid"}
                </p>
                <p className="text-xl font-black text-slate-900">{fmtRs(chart.totalGreen)}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-4 pt-3 border-t border-slate-100">
              {note} Total collected matches the Collections tab (processing fees excluded); principal only is the
              part of that money that returns the original lent amount, without interest, fees or overdue charges.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default BookGrowth;
