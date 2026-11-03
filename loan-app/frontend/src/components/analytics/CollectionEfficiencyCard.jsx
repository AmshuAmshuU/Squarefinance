"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, X } from "lucide-react";
import { getMonthlyCollection, getMonthlyCollectionShortfall, getMonthlyCollectionTrend } from "../../services/analytics.service";
import { getTodayIST } from "../../utils/dateUtils";
import { useUI } from "../../context/UIContext";
import { readSnapshot, saveSnapshotNow, useListMemory } from "../../utils/backNavigation";

const ROWS = [
  { key: "vehicle", label: "Vehicle" },
  { key: "weekly", label: "Weekly" },
  { key: "daily", label: "Daily" },
  { key: "interest", label: "Interest" },
];

// Same pages the dashboard follow-ups open (the loan in edit mode)
const LOAN_EDIT_PATH = {
  vehicle: "/admin/loans/edit/",
  weekly: "/admin/weekly-loans/edit/",
  daily: "/admin/daily-loans/edit/",
  interest: "/admin/interest-loan/edit/",
};

// Back from a loan returns here (NavTracker remembers this page); the snapshot below brings the card back exactly as it was left
const PAGE_KEY = "/admin/analytics";

const fullAmount = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

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
  // Only present when the page was just opened by Back from a loan
  const restored = useRef(undefined);
  if (restored.current === undefined) restored.current = readSnapshot(PAGE_KEY) || null;
  const snap = restored.current;
  const [range, setRange] = useState(snap?.range || "6");
  const [year, setYear] = useState(snap?.year || currentYear);
  const [month, setMonth] = useState(snap?.month || currentMonth);
  const [popupType, setPopupType] = useState(snap?.popupType || null);
  const [popupRow, setPopupRow] = useState(snap?.popupRow || null);
  const [popupScroll, setPopupScroll] = useState(snap?.popupScroll || 0);
  const [popup, setPopup] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupError, setPopupError] = useState(null);
  const popupListRef = useRef(null);
  const pendingPopupScroll = useRef(snap?.popupType ? snap.popupScroll || 0 : null);
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

  // Back from a loan: put the whole page back (scroll) with the card as it was left
  useListMemory(PAGE_KEY, { range, year, month, popupType, popupRow, popupScroll }, !seriesLoading);

  // The "who is short" list for the tapped type
  useEffect(() => {
    if (!popupType) return undefined;
    let cancelled = false;
    setPopup(null);
    setPopupError(null);
    setPopupLoading(true);
    getMonthlyCollectionShortfall(year, month, popupType)
      .then((res) => {
        if (!cancelled) setPopup(res.data || null);
      })
      .catch((err) => {
        if (!cancelled) setPopupError(err.message || "Failed to load the list");
      })
      .finally(() => {
        if (!cancelled) setPopupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [popupType, year, month]);

  // Once the list is there, put it back at the same scroll position (only after coming Back)
  useEffect(() => {
    if (!popup || popupLoading || pendingPopupScroll.current === null) return;
    const y = pendingPopupScroll.current;
    pendingPopupScroll.current = null;
    if (popupListRef.current) popupListRef.current.scrollTop = y;
  }, [popup, popupLoading]);

  // Popup open: page behind it does not scroll, Esc closes it
  useEffect(() => {
    if (!popupType) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") closePopup();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [popupType]);

  const openPopup = (type) => {
    pendingPopupScroll.current = null;
    setPopupRow(null);
    setPopupScroll(0);
    setPopupType(type);
  };
  const closePopup = () => {
    setPopupType(null);
    setPopupRow(null);
    setPopupScroll(0);
    setPopup(null);
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

  // The popup lives on document.body (outside the card), so it carries its own light / dark colours
  const pop = isDark
    ? { bg: "#1e293b", text: "#f1f5f9", name: "#cbd5e1", muted: "#94a3b8", line: "rgba(255,255,255,0.08)", chip: "rgba(255,255,255,0.1)", foot: "rgba(255,255,255,0.04)", link: "#7db4ff", red: "#f87171", mark: "rgba(251,191,36,0.16)" }
    : { bg: "#ffffff", text: "#0f172a", name: "#334155", muted: "#94a3b8", line: "#f1f5f9", chip: "#f1f5f9", foot: "#f8fafc", link: "#2563eb", red: "#dc2626", mark: "#fffbeb" };

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
                        {row.short > 0 ? (
                          <button
                            type="button"
                            onClick={() => openPopup(key)}
                            aria-label={`Show the ${label.toLowerCase()} loans that are short`}
                            className="font-bold underline decoration-dotted underline-offset-4 cursor-pointer"
                            style={{ touchAction: "manipulation" }}
                          >
                            {formatAmount(row.short)}
                          </button>
                        ) : (
                          formatAmount(row.short)
                        )}
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

      {popupType &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4"
            onClick={closePopup}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Loans that are short"
              className="w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: pop.bg, color: pop.text }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3"
                style={{ borderBottom: `1px solid ${pop.line}` }}>
                <div className="min-w-0">
                  <h4 className="text-sm font-black tracking-tight" style={{ color: pop.text }}>
                    {ROWS.find((r) => r.key === popupType)?.label} loans · {MONTHS[month - 1]} {year}
                  </h4>
                  <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: pop.muted }}>Still unpaid today</p>
                </div>
                <button
                  type="button"
                  onClick={closePopup}
                  aria-label="Close"
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full cursor-pointer"
                  style={{ background: pop.chip, color: pop.muted }}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                ref={popupListRef}
                className="flex-1 overflow-y-auto"
                onScroll={(e) => setPopupScroll(Math.round(e.currentTarget.scrollTop))}
              >
                {popupLoading ? (
                  <div className="p-10 flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Loading...</p>
                  </div>
                ) : popupError ? (
                  <div className="p-8 text-center text-red-500 text-xs font-bold uppercase tracking-tight">{popupError}</div>
                ) : popup && popup.rows.length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold" style={{ color: pop.muted }}>No loan is short for this month.</div>
                ) : popup ? (
                  <ul>
                    {popup.rows.map((r) => (
                      <li
                        key={r.loanId}
                        className="flex items-center gap-3 px-4 py-2.5"
                        style={{ borderTop: `1px solid ${pop.line}`, background: popupRow === r.loanId ? pop.mark : "transparent" }}
                      >
                        <Link
                          href={`${LOAN_EDIT_PATH[popupType]}${r.loanId}`}
                          onClick={() => {
                            // Saved right now (not after the re-render) because this same tap leaves the page
                            const y = Math.round(popupListRef.current?.scrollTop || 0);
                            saveSnapshotNow(PAGE_KEY, { range, year, month, popupType, popupRow: r.loanId, popupScroll: y });
                            setPopupRow(r.loanId);
                          }}
                          className="shrink-0 min-w-[40px] text-xs font-black underline underline-offset-2"
                          style={{ color: pop.link }}
                        >
                          {r.loanNumber || "—"}
                        </Link>
                        <span className="flex-1 min-w-0 truncate text-xs font-bold uppercase" style={{ color: pop.name }}>{r.customerName}</span>
                        <span className="shrink-0 text-xs font-black" style={{ color: pop.red }}>{fullAmount(r.short)}</span>
                      </li>
                    ))}
                    {popup.paidAhead > 0 && (
                      <li className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ borderTop: `1px solid ${pop.line}` }}>
                        <span className="text-[11px] font-bold" style={{ color: pop.muted }}>Paid ahead on other loans</span>
                        <span className="text-[11px] font-black" style={{ color: pop.muted }}>−{fullAmount(popup.paidAhead)}</span>
                      </li>
                    )}
                  </ul>
                ) : null}
              </div>

              {popup && !popupLoading && !popupError && (
                <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderTop: `1px solid ${pop.line}`, background: pop.foot }}>
                  <span className="text-xs font-black" style={{ color: pop.text }}>Total short</span>
                  <span className="text-sm font-black" style={{ color: pop.red }}>{fullAmount(popup.total)}</span>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default CollectionEfficiencyCard;
