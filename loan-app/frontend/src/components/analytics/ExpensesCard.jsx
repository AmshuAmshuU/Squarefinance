"use client";
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { getExpenseTrend } from "../../services/analytics.service";
import { getTodayIST, getISTDateNDaysAgo } from "../../utils/dateUtils";

// Same timeline options as the Profit Overview card.
const intervalOptions = [
  { label: "All Time", value: "all" },
  { label: "Last 7 Days", value: "weekly" },
  { label: "Last 30 Days", value: "monthly" },
  { label: "Last 3 Months", value: "3months" },
  { label: "Last 6 Months", value: "6months" },
  { label: "Last 1 Year", value: "yearly" },
  { label: "Custom Range", value: "custom" },
];

// Same blue as "For Seizing" in the Vehicle Status Overview chart.
const BAR_COLOR = "#3B82F6";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DEFAULT_TIP = "Tap a bar for details";

const formatCurrency = (value) =>
  `₹${Math.round(value || 0).toLocaleString("en-IN")}`;

// "2026-07" -> "Jul 26", "2026-07-12" -> "12 Jul"
const labelFor = (key, granularity) => {
  const [y, m, d] = key.split("-");
  const mon = MONTHS[Number(m) - 1];
  return granularity === "day" ? `${Number(d)} ${mon}` : `${mon} ${y.slice(2)}`;
};

const ExpensesCard = ({ fallbackTotal }) => {
  const [interval, setIntervalValue] = useState("all");
  const [customDates, setCustomDates] = useState({
    start: getISTDateNDaysAgo(30),
    end: getTodayIST(),
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(-1);
  const barsRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => {
    const myRequest = ++requestId.current;
    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await getExpenseTrend(
          interval,
          interval === "custom" ? customDates.start : undefined,
          interval === "custom" ? customDates.end : undefined,
        );
        if (myRequest === requestId.current && res.data) {
          setData(res.data);
          setSelected(-1);
        }
      } catch (err) {
        console.error("Failed to fetch expense trend:", err);
        if (myRequest === requestId.current) setError(true);
      } finally {
        if (myRequest === requestId.current) setLoading(false);
      }
    };
    load();
  }, [interval, customDates]);

  const points = data?.points || [];
  const granularity = data?.granularity || "month";
  const max = Math.max(1, ...points.map((p) => p.amount));

  // While the first load is in flight, All Time can borrow the figure the
  // page already has so the amount never flashes empty.
  let amountText = "…";
  if (data && !loading) amountText = formatCurrency(data.total);
  else if (interval === "all" && fallbackTotal !== undefined) amountText = formatCurrency(fallbackTotal);

  const pickBar = (e) => {
    if (!points.length || !barsRef.current) return;
    const rect = barsRef.current.getBoundingClientRect();
    const idx = Math.floor(((e.clientX - rect.left) / rect.width) * points.length);
    setSelected(Math.max(0, Math.min(points.length - 1, idx)));
  };

  const tip =
    selected >= 0 && points[selected]
      ? `${labelFor(points[selected].key, granularity)}  -  ${formatCurrency(points[selected].amount)}`
      : DEFAULT_TIP;

  return (
    <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="grid grid-cols-[104px_1fr] md:grid-cols-[130px_1fr] gap-x-3 min-h-[105px]">
        {/* Left: timeline on top, title + amount at the bottom */}
        <div className="flex flex-col justify-between min-w-0">
          <div className="relative">
            <select
              value={interval}
              onChange={(e) => setIntervalValue(e.target.value)}
              aria-label="Expenses timeline"
              className="appearance-none w-full pl-2 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-wide text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:bg-slate-100/50"
            >
              {intervalOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="pt-3">
            <h3 className="text-slate-500 text-[11px] md:text-xs font-semibold uppercase tracking-wider mb-1">
              Expenses
            </h3>
            <p className="text-base md:text-xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              {amountText}
            </p>
          </div>
        </div>

        {/* Right: one bar per day / month */}
        <div className="flex flex-col min-w-0">
          <p className="text-[10px] font-bold text-slate-500 text-right h-4 mb-0.5 truncate">
            {error ? "Could not load graph" : tip}
          </p>
          <div
            ref={barsRef}
            role="img"
            aria-label="Expenses per period"
            onPointerDown={pickBar}
            onPointerMove={(e) => {
              if (e.buttons || e.pointerType === "touch") pickBar(e);
            }}
            onPointerLeave={() => setSelected(-1)}
            style={{ touchAction: "pan-y" }}
            className={`flex-1 min-h-[77px] flex items-end border-b border-slate-200 select-none transition-opacity ${loading ? "opacity-40" : ""}`}
          >
            {points.map((p, i) => {
              const h = p.amount > 0 ? Math.max(2, (p.amount / max) * 100) : 0;
              return (
                <div key={p.key} className="flex-1 h-full flex items-end justify-center min-w-0">
                  <div
                    className="w-[70%] max-w-[26px] rounded-t-[2px]"
                    style={{
                      height: `${h}%`,
                      backgroundColor: BAR_COLOR,
                      opacity: selected < 0 ? 0.9 : i === selected ? 1 : 0.4,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1 h-3">
            <span>{points.length ? labelFor(points[0].key, granularity) : ""}</span>
            <span>{points.length > 1 ? labelFor(points[points.length - 1].key, granularity) : ""}</span>
          </div>
        </div>
      </div>

      {interval === "custom" && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="date"
            value={customDates.start}
            onChange={(e) => setCustomDates((prev) => ({ ...prev, start: e.target.value }))}
            className="flex-1 min-w-0 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-tight text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-slate-300 font-bold text-[9px]">to</span>
          <input
            type="date"
            value={customDates.end}
            onChange={(e) => setCustomDates((prev) => ({ ...prev, end: e.target.value }))}
            className="flex-1 min-w-0 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-tight text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}
    </div>
  );
};

export default ExpensesCard;
