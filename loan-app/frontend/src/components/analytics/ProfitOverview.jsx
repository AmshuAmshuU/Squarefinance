"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { IndianRupee, TrendingUp, Filter, Calendar, Loader2 } from "lucide-react";
import { getProfitStats } from "../../services/analytics.service";
import { getTodayIST, getISTDateNDaysAgo } from "../../utils/dateUtils";
import { useUI } from "../../context/UIContext";

const TYPE_ROWS = [
  { label: "Vehicle", key: "monthly", color: "bg-purple-400" },
  { label: "Weekly", key: "weekly", color: "bg-blue-400" },
  { label: "Daily", key: "daily", color: "bg-orange-400" },
  { label: "Interest", key: "interest", color: "bg-green-400" },
];

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

// Each loan type's share of the period's profit, as "82%" - shown in small
// brackets beside the type name, same style as the first card on the page.
const typeShare = (breakdown, key) => {
  const total = TYPE_ROWS.reduce((sum, row) => sum + (breakdown?.[row.key] || 0), 0);
  if (!total) return null;
  const value = breakdown?.[key] || 0;
  if (value <= 0) return "0%";
  const pct = Math.round((value / total) * 100);
  return pct < 1 ? "<1%" : `${pct}%`;
};

// Profit Trend bars: every bar is green unless it is lower than the bar before it
// (the previous month/day plotted). The bigger the fall, the further the colour moves
// from green: yellow-green, then amber, then orange. No red - a dip is not a failure.
const DIP_STOPS = [
  [0, [16, 185, 129]],
  [0.15, [140, 195, 74]],
  [0.35, [232, 183, 58]],
  [0.6, [232, 128, 58]],
];

const dipColor = (drop) => {
  if (!(drop > 0)) return `rgb(${DIP_STOPS[0][1].join(",")})`;
  for (let i = 0; i < DIP_STOPS.length - 1; i++) {
    const [lo, loRgb] = DIP_STOPS[i];
    const [hi, hiRgb] = DIP_STOPS[i + 1];
    if (drop <= hi) {
      const t = (drop - lo) / (hi - lo);
      return `rgb(${loRgb.map((c, k) => Math.round(c + (hiRgb[k] - c) * t)).join(",")})`;
    }
  }
  return `rgb(${DIP_STOPS[DIP_STOPS.length - 1][1].join(",")})`;
};

// Value written on top of a bar: 4.8L for lakhs, 15.9K below that
const shortAmount = (value) => {
  const v = Math.abs(value || 0);
  if (v >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${Math.round(value || 0)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Calendar size={12} /> {label}
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">
            Profit:
          </span>
          <span className="text-xs font-black text-slate-900">
            {formatCurrency(payload[0].value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CumulativeTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Calendar size={12} /> {label}
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">
            Cumulative Profit:
          </span>
          <span className="text-xs font-black text-slate-900">
            {formatCurrency(payload[0].value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const ProfitOverview = () => {
  const { isDarkMode } = useUI();
  const [interval, setIntervalValue] = useState("all");
  const [customDates, setCustomDates] = useState({
    start: getISTDateNDaysAgo(30),
    end: getTodayIST(),
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProfitStats(
        interval,
        interval === "custom" ? customDates.start : undefined,
        interval === "custom" ? customDates.end : undefined,
      );
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch profit stats:", err);
      setError(err.message || "Failed to load profit data");
    } finally {
      setLoading(false);
    }
  }, [interval, customDates]);

  useEffect(() => {
    fetchProfit();
  }, [fetchProfit]);

  // Each bar's colour comes from how it compares with the bar plotted just before it
  const profitBars = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((point, i) => {
      const prev = i > 0 ? data.trend[i - 1].profit : 0;
      const drop = prev > 0 ? 1 - point.profit / prev : 0;
      return { ...point, fill: dipColor(drop) };
    });
  }, [data]);

  const cumulativeTrend = useMemo(() => {
    if (!data?.trend) return [];
    let running = 0;
    return data.trend.map((point) => {
      running += point.profit;
      return { date: point.date, profit: Math.round(running) };
    });
  }, [data]);

  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" strokeWidth={3} />
          PROFIT OVERVIEW
        </h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5 px-1">
          Actual and expected profit across all loan types
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Total Profit Card (range-based) */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  Total Profit
                </h3>
                <p className="text-2xl font-black text-slate-900">
                  {loading ? "…" : formatCurrency(data?.totalProfit)}
                </p>
              </div>
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
            <div className="flex items-center gap-2 mb-4">
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

          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left font-black text-slate-400 uppercase tracking-widest pb-1.5">
                  Type
                </th>
                <th className="text-right font-black text-emerald-500 uppercase tracking-widest pb-1.5">
                  Profit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {TYPE_ROWS.map((row) => {
                const value = data?.breakdown?.[row.key] || 0;
                const share = typeShare(data?.breakdown, row.key);
                return (
                  <tr key={row.key} className={value > 0 ? "" : "opacity-40"}>
                    <td className="py-1.5 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${row.color}`}></span>
                      <span className="font-bold text-slate-600">
                        {row.label}
                        {share && <span className="ml-1 text-[9px] font-semibold text-slate-400">({share})</span>}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-black text-emerald-600">
                      {formatCurrency(value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="pt-2 font-black text-slate-700 uppercase">Total</td>
                <td className="pt-2 text-right font-black text-slate-900">
                  {formatCurrency(data?.totalProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
          {error && (
            <p className="text-[9px] text-red-500 mt-2 font-bold uppercase tracking-tight">
              {error}
            </p>
          )}
        </div>

        {/* Expected Next Month Profit Card */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                Expected Profit (Next Month)
              </h3>
              <p className="text-2xl font-black text-slate-900">
                {loading ? "…" : formatCurrency(data?.expectedNextMonth?.total)}
              </p>
            </div>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left font-black text-slate-400 uppercase tracking-widest pb-1.5">
                  Type
                </th>
                <th className="text-right font-black text-blue-500 uppercase tracking-widest pb-1.5">
                  Expected
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr>
                <td className="py-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  <span className="font-bold text-slate-600">Vehicle</span>
                </td>
                <td className="py-1.5 text-right font-black text-blue-600">
                  {formatCurrency(data?.expectedNextMonth?.breakdown?.monthly)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  <span className="font-bold text-slate-600">Interest</span>
                </td>
                <td className="py-1.5 text-right font-black text-blue-600">
                  {formatCurrency(data?.expectedNextMonth?.breakdown?.interest)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="pt-2 font-black text-slate-700 uppercase">Total</td>
                <td className="pt-2 text-right font-black text-slate-900">
                  {formatCurrency(data?.expectedNextMonth?.total)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="text-[9px] text-slate-400 mt-3 italic">
            * Weekly and Daily loans excluded — profit is realized only at disbursement
          </p>
        </div>
      </div>

      {/* Profit Trend Chart */}
      <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 flex flex-col min-h-[400px] transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="text-left">
            <h3 className="text-base md:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span className="w-2 h-6 md:h-8 bg-emerald-500 rounded-full"></span>
              PROFIT TREND
            </h3>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 px-3">
              {intervalOptions.find((o) => o.value === interval)?.label || "All Time"}
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-[280px] relative flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-3xl">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] animate-pulse">
                Calculating Profit...
              </span>
            </div>
          )}

          {error && !loading ? (
            <div className="flex flex-col items-center text-center p-10 max-w-sm">
              <div className="w-16 h-16 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 text-red-500">
                <Filter size={32} />
              </div>
              <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
                Network Error
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                {error}
              </p>
            </div>
          ) : !loading && (!data?.trend || data.trend.length === 0) ? (
            <div className="flex flex-col items-center text-center p-10 max-w-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300">
                <Calendar size={32} />
              </div>
              <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
                Zero Activity
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                No profit was recorded for the selected timeframe.
              </p>
            </div>
          ) : (
            !loading && (
              <div className="w-full" style={{ height: "320px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={profitBars}
                    margin={{ top: 18, right: 10, left: -20, bottom: 0 }}
                    barCategoryGap="14%"
                  >
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 7, fontWeight: 900, fill: "#94a3b8" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 7, fontWeight: 900, fill: "#94a3b8" }}
                      tickFormatter={(value) =>
                        `${value >= 100000 ? (value / 100000).toFixed(1) + "L" : (value / 1000).toFixed(0) + "K"}`
                      }
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(100,116,139,0.08)" }}
                    />
                    <Bar
                      dataKey="profit"
                      name="Profit"
                      maxBarSize={40}
                      radius={[3, 3, 0, 0]}
                      fillOpacity={0.88}
                      isAnimationActive={false}
                    >
                      {profitBars.map((bar) => (
                        <Cell key={bar.date} fill={bar.fill} />
                      ))}
                      {/* Values on top of the bars only while there are few enough to read */}
                      {profitBars.length <= 12 && (
                        <LabelList
                          dataKey="profit"
                          position="top"
                          formatter={shortAmount}
                          style={{ fontSize: 10, fontWeight: 700, fill: isDarkMode ? "#cbd5e1" : "#64748b" }}
                        />
                      )}
                    </Bar>
                    {/* Subtle dashed average of exactly the bars plotted above */}
                    <ReferenceLine
                      y={data.trend.reduce((sum, point) => sum + (point.profit || 0), 0) / data.trend.length}
                      stroke={isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(71,85,105,0.5)"}
                      strokeWidth={1.25}
                      strokeDasharray="5 4"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          )}
        </div>
      </div>

      {/* Cumulative Profit Chart */}
      <div className="mt-8 bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 flex flex-col min-h-[400px] transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="text-left">
            <h3 className="text-base md:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span className="w-2 h-6 md:h-8 bg-indigo-500 rounded-full"></span>
              CUMULATIVE PROFIT
            </h3>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 px-3">
              {intervalOptions.find((o) => o.value === interval)?.label || "All Time"}
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-[280px] relative flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-3xl">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] animate-pulse">
                Calculating Profit...
              </span>
            </div>
          )}

          {error && !loading ? (
            <div className="flex flex-col items-center text-center p-10 max-w-sm">
              <div className="w-16 h-16 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 text-red-500">
                <Filter size={32} />
              </div>
              <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
                Network Error
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                {error}
              </p>
            </div>
          ) : !loading && cumulativeTrend.length === 0 ? (
            <div className="flex flex-col items-center text-center p-10 max-w-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300">
                <Calendar size={32} />
              </div>
              <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
                Zero Activity
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                No profit was recorded for the selected timeframe.
              </p>
            </div>
          ) : (
            !loading && (
              <div className="w-full" style={{ height: "320px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={cumulativeTrend}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 7, fontWeight: 900, fill: "#94a3b8" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 7, fontWeight: 900, fill: "#94a3b8" }}
                      tickFormatter={(value) =>
                        `${value >= 100000 ? (value / 100000).toFixed(1) + "L" : (value / 1000).toFixed(0) + "K"}`
                      }
                    />
                    <Tooltip content={<CumulativeTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Cumulative Profit"
                      stroke="#6366f1"
                      strokeWidth={4}
                      fill="#6366f1"
                      fillOpacity={0.1}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitOverview;
