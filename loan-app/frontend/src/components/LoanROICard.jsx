"use client";
import React, { useEffect, useState } from "react";

// Discreet ROI summary shown at the very bottom of a loan's detail page,
// below the payment schedule. Deliberately muted/small compared to the
// Analytics page's cards - Karthik's explicit ask: "discreetly... not
// shouting out loud like in the analytics section."
//
// fetchFn: the service function itself (e.g. getLoanROI) - a stable
// module-level reference, NOT an inline arrow function, so the effect
// below doesn't refetch on every parent render.
// loanId: passed to fetchFn(loanId) - Promise<{ data: { realisticXirr,
//   liquidationXirr, absoluteReturnSoFar, absoluteReturnInclOutstanding,
//   outstanding, disbursed, collectedSoFar } }>
const LoanROICard = ({ fetchFn, loanId }) => {
  const [roi, setRoi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loanId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchFn(loanId)
      .then((res) => {
        if (!cancelled) setRoi(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchFn, loanId]);

  const fmtPct = (r) => (r === null || r === undefined ? "N/A" : `${(r * 100).toFixed(1)}%`);
  const fmtAbsPct = (r) => (r === null || r === undefined ? "N/A" : `${r.toFixed(1)}%`);

  if (error) return null; // fail silently - this is a nice-to-have, not core loan data

  return (
    <div className="mt-8 pt-6 border-t border-slate-100 loan-roi-card">
      <div className="flex items-center gap-2 mb-3">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.1-2.6-2.6L7 14.5" />
        </svg>
        <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.15em]">
          Return on Investment
        </span>
      </div>

      {loading ? (
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Calculating...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Realistic XIRR
            </p>
            <p className="text-sm font-black text-slate-600">{fmtPct(roi?.realisticXirr)}</p>
            <p className="text-[8px] text-slate-300 mt-0.5 leading-tight">Annualized, future money on real due dates</p>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Liquidation XIRR
            </p>
            <p className="text-sm font-black text-slate-600">{fmtPct(roi?.liquidationXirr)}</p>
            <p className="text-[8px] text-slate-300 mt-0.5 leading-tight">Annualized, if collected in full today</p>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Return So Far
            </p>
            <p className="text-sm font-black text-slate-600">{fmtAbsPct(roi?.absoluteReturnSoFar)}</p>
            <p className="text-[8px] text-slate-300 mt-0.5 leading-tight">Not annualized, only cash collected to date</p>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              Return Incl. Outstanding
            </p>
            <p className="text-sm font-black text-slate-600">{fmtAbsPct(roi?.absoluteReturnInclOutstanding)}</p>
            <p className="text-[8px] text-slate-300 mt-0.5 leading-tight">Not annualized, assumes full repayment</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        .loan-view-dark-mode .loan-roi-card,
        .weekly-loan-view-dark-mode .loan-roi-card,
        .daily-loan-view-dark-mode .loan-roi-card,
        .interest-loan-view-dark-mode .loan-roi-card,
        .loan-edit-dark-mode .loan-roi-card,
        .weekly-loan-edit-dark-mode .loan-roi-card,
        .daily-loan-edit-dark-mode .loan-roi-card,
        .interest-loan-edit-dark-mode .loan-roi-card {
          border-color: rgba(255, 255, 255, 0.08);
        }
        .loan-view-dark-mode .loan-roi-card .bg-slate-50,
        .weekly-loan-view-dark-mode .loan-roi-card .bg-slate-50,
        .daily-loan-view-dark-mode .loan-roi-card .bg-slate-50,
        .interest-loan-view-dark-mode .loan-roi-card .bg-slate-50,
        .loan-edit-dark-mode .loan-roi-card .bg-slate-50,
        .weekly-loan-edit-dark-mode .loan-roi-card .bg-slate-50,
        .daily-loan-edit-dark-mode .loan-roi-card .bg-slate-50,
        .interest-loan-edit-dark-mode .loan-roi-card .bg-slate-50 {
          background-color: #1e293b !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .loan-view-dark-mode .loan-roi-card .text-slate-600,
        .weekly-loan-view-dark-mode .loan-roi-card .text-slate-600,
        .daily-loan-view-dark-mode .loan-roi-card .text-slate-600,
        .interest-loan-view-dark-mode .loan-roi-card .text-slate-600,
        .loan-edit-dark-mode .loan-roi-card .text-slate-600,
        .weekly-loan-edit-dark-mode .loan-roi-card .text-slate-600,
        .daily-loan-edit-dark-mode .loan-roi-card .text-slate-600,
        .interest-loan-edit-dark-mode .loan-roi-card .text-slate-600 {
          color: #cbd5e1 !important;
        }
      `}</style>
    </div>
  );
};

export default LoanROICard;
