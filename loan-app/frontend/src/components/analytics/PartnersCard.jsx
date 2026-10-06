"use client";
import React, { useState, useEffect, useRef } from "react";
import { Users, Loader2 } from "lucide-react";
import { getPartners } from "../../services/analytics.service";

const fmtRs = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmtShort = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  return `₹${(n / 100000).toFixed(1)} L`;
};
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

// One colour per partner position (same order as the share list, biggest first).
const COLOURS = ["#378ADD", "#1D9E75", "#D85A30", "#7F77DD", "#C9A227", "#C2578D"];

// Super Admin only. Loads by itself when it scrolls into view (the valuation
// behind it walks the whole loan history, so it is not run until needed) - no
// Calculate button.
const PartnersCard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const holderRef = useRef(null);

  useEffect(() => {
    const el = holderRef.current;
    if (!el || started) return;
    const start = () => setStarted(true);
    if (typeof IntersectionObserver === "undefined") {
      start();
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          obs.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    getPartners()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load partners");
      });
    return () => {
      cancelled = true;
    };
  }, [started]);

  const partners = data?.partners || [];
  const maxNow = Math.max(...partners.map((p) => p.currentValue), 1);

  return (
    <div className="mt-10" ref={holderRef}>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Users className="w-6 h-6 text-indigo-500" strokeWidth={3} />
          PARTNERS
        </h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5 px-1">
          Each partner&apos;s share of the company valuation — updates automatically
        </p>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        {!data && !error && (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Calculating shares…</span>
          </div>
        )}

        {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{error}</p>}

        {data && partners.length === 0 && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-8">
            Partner shares have not been set up yet.
          </p>
        )}

        {data && partners.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invested</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{fmtShort(data.valuation.ourInvestment)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Worth today</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{fmtShort(data.valuation.companyValuation)}</p>
                {data.valuation.growthMultiple != null && (
                  <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                    {data.valuation.growthMultiple.toFixed(2)}× the capital put in
                  </p>
                )}
              </div>
            </div>

            <div>
              {partners.map((p, i) => {
                const colour = COLOURS[i % COLOURS.length];
                const nowWidth = (p.currentValue / maxNow) * 100;
                const putInWidth = (p.investedAmount / maxNow) * 100;
                return (
                  <div key={p.name} className="py-4 border-t border-slate-100 first:border-t-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: colour }} />
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{p.name}</span>
                        <span className="text-[11px] font-bold text-slate-400">{p.percent.toFixed(2)}%</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 whitespace-nowrap">{fmtRs(p.currentValue)}</span>
                    </div>
                    <div className="relative mt-2.5 h-2 rounded-full bg-slate-100">
                      <div className="absolute left-0 top-0 h-2 rounded-full" style={{ width: `${nowWidth}%`, background: colour }} />
                      <div className="absolute left-0 top-0 h-2 rounded-full" style={{ width: `${putInWidth}%`, background: "rgba(0,0,0,0.28)" }} />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
                      Put in {fmtShort(p.investedAmount)} → worth {fmtShort(p.currentValue)}{" "}
                      {p.gainPercent != null && (
                        <span className={p.gainAmount >= 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                          ({p.gainAmount >= 0 ? "+" : ""}
                          {p.gainPercent.toFixed(0)}%)
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-2 pt-4 border-t border-slate-100">
              Shares as of {fmtDate(data.sharesEffectiveFrom)}. The darker part of each bar is that partner&apos;s share of the {fmtShort(data.valuation.ourInvestment)} put in;
              the full bar is the value of their share today (share % × company valuation of {fmtRs(data.valuation.companyValuation)}). Every change in shares is kept as a dated record, never overwritten.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PartnersCard;
