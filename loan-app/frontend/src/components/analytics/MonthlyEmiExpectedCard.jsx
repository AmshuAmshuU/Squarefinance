"use client";
import React, { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronDown, Loader2 } from "lucide-react";
import { getMonthlyCollectionTrend } from "../../services/analytics.service";
import { useUI } from "../../context/UIContext";

const RANGE_OPTIONS = [
  { label: "Last 3 months", value: "3" },
  { label: "Last 6 months", value: "6" },
  { label: "Last 12 months", value: "12" },
  { label: "All time", value: "all" },
];

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SERIES = [
  { key: "vehicle", label: "Vehicle", color: "#2a78d6" },
  { key: "weekly", label: "Weekly", color: "#eb6834" },
  { key: "daily", label: "Daily", color: "#1baf7a" },
  { key: "interest", label: "Interest", color: "#6250d6" },
];

const lakhs = (n) => Math.round((n || 0) / 1000) / 100;

// The existing "Monthly EMI Expected" card, exactly as it was (same icon, breakdown, figure and subtitle -
// the props are the same ones StatsCard took), plus a growth graph underneath that only loads when someone
// presses Show (never on opening Analytics). The graph is the EMIs that fell due in each month, by loan type -
// the same "due" figures the Collection Efficiency card uses (/monthly-collection-trend).
const MonthlyEmiExpectedCard = ({ title, value, icon, breakdown, subtitle }) => {
  const { isDarkMode: isDark } = useUI();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState("6");
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const request = useRef(0);

  useEffect(() => {
    if (!open) return;
    const mine = ++request.current;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getMonthlyCollectionTrend(range);
        if (mine === request.current) setMonths(res.data?.months || []);
      } catch (err) {
        if (mine === request.current) setError(err.message || "Could not load the graph");
      } finally {
        if (mine === request.current) setLoading(false);
      }
    };
    load();
  }, [open, range]);

  const data = months.map((m) => ({
    label: `${SHORT[m.month - 1]} ${String(m.year).slice(2)}`,
    vehicle: lakhs(m.vehicle?.expected),
    weekly: lakhs(m.weekly?.expected),
    daily: lakhs(m.daily?.expected),
    interest: lakhs(m.interest?.expected),
  }));
  const count = data.length;
  const tickStep = count <= 12 ? 1 : 3;
  const axis = "#898781";
  const grid = isDark ? "rgba(255,255,255,0.08)" : "#e8edf3";

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const row = payload[0].payload;
    const total = SERIES.reduce((s, x) => s + (row[x.key] || 0), 0);
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-[11px]" style={isDark ? { background: "#1e293b", borderColor: "rgba(255,255,255,0.12)", color: "#f1f5f9" } : undefined}>
        <p className="font-black mb-1">{label}</p>
        {SERIES.map((x) => (
          <p key={x.key} className="flex items-center justify-between gap-4 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: x.color }} />
              {x.label}
            </span>
            <span>₹{(row[x.key] || 0).toFixed(2)}L</span>
          </p>
        ))}
        <p className="flex items-center justify-between gap-4 font-black mt-1 pt-1" style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0"}` }}>
          <span>Total</span>
          <span>₹{total.toFixed(2)}L</span>
        </p>
      </div>
    );
  };

  return (
    <div
      className={`bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow ${
        open ? "md:col-span-2 lg:col-span-3" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">{icon}</div>
        {breakdown && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
            {breakdown.map((item, idx) => (
              <React.Fragment key={idx}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                <span className="text-[11px] font-bold text-slate-700">₹{item.value.toLocaleString("en-IN")}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-slate-500 text-xs md:text-sm font-semibold uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>}
      </div>

      <div className="border-t border-slate-100 mt-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black text-slate-700">Growth since day 1</p>
          {open ? (
            <div className="flex items-center gap-2">
              <div className="relative w-[116px] shrink-0">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  aria-label="Growth graph timeline"
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
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
              >
                Hide
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
            >
              Show
            </button>
          )}
        </div>

        {open && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
              {SERIES.map((x) => (
                <span key={x.key} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: x.color }} />
                  {x.label}
                </span>
              ))}
            </div>
            {error ? (
              <p className="py-8 text-center text-red-500 text-xs font-bold uppercase tracking-tight">{error}</p>
            ) : (
              <div className={`relative h-[220px] transition-opacity ${loading ? "opacity-40" : ""}`}>
                {loading && count === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: count > 6 ? 18 : 4 }}>
                    <CartesianGrid vertical={false} stroke={grid} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: axis }}
                      tickLine={false}
                      axisLine={{ stroke: grid }}
                      interval={tickStep - 1}
                      angle={count > 6 ? -90 : 0}
                      textAnchor={count > 6 ? "end" : "middle"}
                      height={count > 6 ? 46 : 24}
                    />
                    <YAxis tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={false} width={46} tickFormatter={(v) => `₹${v}L`} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)" }} />
                    {SERIES.map((x, i) => (
                      <Bar key={x.key} dataKey={x.key} stackId="emi" fill={x.color} maxBarThickness={34} radius={i === SERIES.length - 1 ? [3, 3, 0, 0] : 0} isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-[10px] font-bold text-slate-400 mt-2 leading-snug">
              Bars show the EMIs that fell due in each month, counted the same way as the Collection Efficiency card.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyEmiExpectedCard;
