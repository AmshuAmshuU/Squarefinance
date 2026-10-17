"use client";
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { getMonthlyCollection, getMonthlyCollectionTrend } from "../../services/analytics.service";
import { getTodayIST } from "../../utils/dateUtils";
import { useUI } from "../../context/UIContext";

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
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const RANGE_OPTIONS = [
  { label: "Last 3 Months", value: "3" },
  { label: "Last 6 Months", value: "6" },
  { label: "Last 12 Months", value: "12" },
  { label: "All Time", value: "all" },
];

// Same K/L abbreviation as the dashboard's Today's Collections card so all
// four columns fit a phone-width screen without scrolling.
const formatAmount = (n) => {
  const amount = n || 0;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
};

// Colour scale for "did the month go the way it should": 95%+ is the darkest
// green, then a lighter green from 88%, then lime, yellow and orange as the
// figure falls toward 50%. The current month is usually still in the 50-60s.
const SCALE = [
  [95, [22, 101, 52]],
  [88, [74, 222, 128]],
  [78, [190, 242, 100]],
  [68, [250, 204, 21]],
  [58, [251, 146, 60]],
  [50, [234, 88, 12]],
];
const scaleRgb = (pct) => {
  if (pct >= SCALE[0][0]) return SCALE[0][1].slice();
  for (let i = 0; i < SCALE.length - 1; i++) {
    const [hi, hiC] = SCALE[i];
    const [lo, loC] = SCALE[i + 1];
    if (pct <= hi && pct >= lo) {
      const t = (hi - pct) / (hi - lo);
      return [0, 1, 2].map((j) => Math.round(hiC[j] + (loC[j] - hiC[j]) * t));
    }
  }
  return SCALE[SCALE.length - 1][1].slice();
};
const barColor = (pct) => `rgb(${scaleRgb(pct).join(",")})`;
// Text needs more contrast than a bar: darkened on a white card (yellow would vanish), as-is on a dark one.
const textColor = (pct, dark) => `rgb(${scaleRgb(pct).map((v) => (dark ? v : Math.round(v * 0.68))).join(",")})`;

const efficiency = (row) => (row && row.expected > 0 ? (row.collected / row.expected) * 100 : null);

const CollectionEfficiencyCard = () => {
  const { isDarkMode: isDark } = useUI();
  const [currentYear, currentMonth] = getTodayIST().split("-").map(Number);
  const [range, setRange] = useState("6");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [series, setSeries] = useState([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [seriesError, setSeriesError] = useState(false);
  const [single, setSingle] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [error, setError] = useState(null);
  const seriesRequest = useRef(0);

  const years = [];
  for (let y = 2024; y <= currentYear; y++) years.push(y);

  // The graph: every month of the chosen range in one request
  useEffect(() => {
    const mine = ++seriesRequest.current;
    const load = async () => {
      try {
        setSeriesLoading(true);
        setSeriesError(false);
        const res = await getMonthlyCollectionTrend(range);
        if (mine === seriesRequest.current) setSeries(res.data?.months || []);
      } catch {
        if (mine === seriesRequest.current) setSeriesError(true);
      } finally {
        if (mine === seriesRequest.current) setSeriesLoading(false);
      }
    };
    load();
  }, [range]);

  // The table: taken straight from the graph's data when that month is on it,
  // otherwise (a month outside the graph's range) fetched on its own
  const fromSeries = series.find((m) => m.year === year && m.month === month) || null;
  useEffect(() => {
    if (fromSeries || seriesLoading) return;
    let cancelled = false;
    const load = async () => {
      try {
        setSingleLoading(true);
        setError(null);
        const res = await getMonthlyCollection(year, month);
        if (!cancelled && res.data) setSingle(res.data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load collection efficiency");
      } finally {
        if (!cancelled) setSingleLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [year, month, fromSeries, seriesLoading]);

  const data = fromSeries || (single && single.year === year && single.month === month ? single : null);
  const total = data?.total;
  const isCurrent = year === currentYear && month === currentMonth;
  const pctCollected = total && total.expected > 0 ? ((total.collected / total.expected) * 100).toFixed(1) : null;
  const tableLoading = !data && !error && (seriesLoading || singleLoading);

  const pick = (m) => {
    setYear(m.year);
    setMonth(m.month);
  };

  const selectClass =
    "flex-1 min-w-0 appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-slate-100/50";

  const count = series.length;
  const showPct = count <= 12;
  const labelStep = count <= 12 ? 1 : Math.ceil(count / 6);
  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "#eef2f7";
  const axisColor = isDark ? "rgba(255,255,255,0.14)" : "#e2e8f0";
  const mutedColor = isDark ? "#94a3b8" : "#94a3b8";
  const subColor = isDark ? "#cbd5e1" : "#475569";
  const ringColor = isDark ? "#f1f5f9" : "#0f172a";

  const paidPercent = (row) => {
    const pct = efficiency(row);
    if (pct === null) return null;
    return (
      <span className="ml-[3px] text-[11px] font-bold" style={{ color: textColor(pct, isDark) }}>
        ({Math.round(pct)}%)
      </span>
    );
  };

  return (
    <div className="mt-10 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Collection Efficiency</h3>
          <div className="relative w-[116px] shrink-0">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              aria-label="Collection efficiency timeline"
              className="appearance-none w-full pl-2 pr-5 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-wide text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-slate-100/50"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Graph - one bar per month, coloured by how much of what was due got paid */}
        <div className="flex gap-1.5 mt-2">
          <div className="relative w-[30px] h-[208px] shrink-0" aria-hidden="true">
            <div className="absolute top-4 bottom-0 left-0 right-0 text-[11px] font-bold" style={{ color: mutedColor }}>
              <span className="absolute right-0 top-0 -translate-y-1/2">100%</span>
              <span className="absolute right-0 top-1/2 -translate-y-1/2">50%</span>
              <span className="absolute right-0 bottom-0 translate-y-1/2">0%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="relative h-[208px]">
              <div
                role="img"
                aria-label="Collection efficiency per month"
                className={`absolute top-4 bottom-0 left-0 right-0 transition-opacity ${seriesLoading ? "opacity-40" : ""}`}
                style={{ borderBottom: `1px solid ${axisColor}` }}
              >
                {[0, 25, 50, 75].map((top) => (
                  <div key={top} className="absolute left-0 right-0" style={{ top: `${top}%`, borderTop: `1px solid ${gridColor}` }} />
                ))}
                <div className="absolute inset-0 flex">
                  {series.map((m) => {
                    const pct = efficiency(m.total);
                    const selected = m.year === year && m.month === month;
                    const current = m.year === currentYear && m.month === currentMonth;
                    return (
                      <button
                        key={`${m.year}-${m.month}`}
                        type="button"
                        onClick={() => pick(m)}
                        aria-label={`${MONTHS[m.month - 1]} ${m.year}: ${pct === null ? "nothing due" : `${pct.toFixed(1)}% collected`}`}
                        aria-pressed={selected}
                        className="flex-1 relative min-w-0 h-full cursor-pointer"
                        style={{ touchAction: "manipulation" }}
                      >
                        {pct !== null && (
                          <>
                            <span
                              className="absolute bottom-0 left-1/2 -translate-x-1/2"
                              style={{
                                width: count > 24 ? "78%" : "70%",
                                maxWidth: 34,
                                height: `${Math.min(100, pct)}%`,
                                background: barColor(pct),
                                borderRadius: "3px 3px 0 0",
                                opacity: selected ? 1 : 0.8,
                                outline: selected ? `2px solid ${ringColor}` : "none",
                                outlineOffset: 1,
                                border: current ? `1.5px dashed ${ringColor}` : "none",
                                borderBottom: "none",
                              }}
                            />
                            {showPct && (
                              <span
                                className="absolute left-0 right-0 text-center text-[11px] font-bold"
                                style={{ bottom: `calc(${Math.min(100, pct)}% + 3px)`, color: subColor }}
                              >
                                {Math.round(pct)}%
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex mt-1 h-4">
              {series.map((m, i) => {
                const selected = m.year === year && m.month === month;
                let text = "";
                if (count <= 12) text = SHORT[m.month - 1] + (count > 6 ? "" : ` ${String(m.year).slice(2)}`);
                else if (i % labelStep === 0) text = `${SHORT[m.month - 1]} ${String(m.year).slice(2)}`;
                return (
                  <div
                    key={`${m.year}-${m.month}`}
                    className="flex-1 text-center text-[11px] font-bold whitespace-nowrap"
                    style={{ color: selected ? ringColor : mutedColor }}
                  >
                    {text}
                  </div>
                );
              })}
            </div>
            {seriesError && (
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight mt-1">Could not load the graph</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
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

      {tableLoading ? (
        <div className="p-10 flex flex-col items-center justify-center">
          <Loader2 className="w-7 h-7 text-primary animate-spin mb-3" />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Loading...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 text-xs font-bold uppercase tracking-tight">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto px-3 sm:px-0 mt-1.5">
            <table className="w-full text-left" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "21%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "33%" }} />
                <col style={{ width: "24%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-1 sm:px-6 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-1 sm:px-6 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Due</th>
                  <th className="px-1 sm:px-6 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Paid</th>
                  <th className="px-1 sm:px-6 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Short</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ROWS.map(({ key, label }) => {
                  const row = data?.[key] || { expected: 0, collected: 0, short: 0 };
                  return (
                    <tr key={key}>
                      <td className="px-1 sm:px-6 py-1.5 text-xs font-black text-slate-900">{label}</td>
                      <td className="px-1 sm:px-6 py-1.5 text-xs font-bold text-slate-600 text-right whitespace-nowrap">{formatAmount(row.expected)}</td>
                      <td className="px-1 sm:px-6 py-1.5 text-xs font-bold text-emerald-600 text-right whitespace-nowrap">
                        {formatAmount(row.collected)}
                        {paidPercent(row)}
                      </td>
                      <td className={`px-1 sm:px-6 py-1.5 text-xs font-bold text-right whitespace-nowrap ${row.short > 0 ? "text-red-600" : "text-slate-400"}`}>
                        {formatAmount(row.short)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50/30">
                  <td className="px-1 sm:px-6 py-1.5 text-xs font-black text-slate-900">Total</td>
                  <td className="px-1 sm:px-6 py-1.5 text-xs font-black text-slate-900 text-right whitespace-nowrap">{formatAmount(total?.expected)}</td>
                  <td className="px-1 sm:px-6 py-1.5 text-xs font-black text-emerald-600 text-right whitespace-nowrap">
                    {formatAmount(total?.collected)}
                    {paidPercent(total)}
                  </td>
                  <td className={`px-1 sm:px-6 py-1.5 text-xs font-black text-right whitespace-nowrap ${total?.short > 0 ? "text-red-600" : "text-slate-400"}`}>
                    {formatAmount(total?.short)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-[10px] font-bold text-slate-400 border-t border-slate-100 mt-1">
            {isCurrent ? "Current month. " : ""}
            {pctCollected !== null ? `Collected ${pctCollected}% of what was due.` : "Nothing was due this month."}
          </p>
        </>
      )}
    </div>
  );
};

export default CollectionEfficiencyCard;
