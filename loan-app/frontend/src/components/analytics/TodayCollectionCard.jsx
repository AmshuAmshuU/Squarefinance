"use client";
import React, { useEffect, useState } from "react";
import { getTodayCollectionSummary, getTodayCollectionPaid } from "../../services/loan.service";
import { Loader2, RefreshCw } from "lucide-react";
import LoanListPopup from "./LoanListPopup";
import { readSnapshot } from "../../utils/backNavigation";

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

// Back from a loan returns to the dashboard: the card reopens as it was left (checked, popup open, same place in
// the list). Kept in its own sessionStorage slot, because the follow-ups card already owns the page's snapshot.
const MEMORY_KEY = "sf_dash_collections";
const readMemory = () => {
  try {
    if (!readSnapshot("/admin/dashboard")) return null; // only when this page was just opened by Back
    return JSON.parse(sessionStorage.getItem(MEMORY_KEY));
  } catch {
    return null;
  }
};
const writeMemory = (value) => {
  try {
    sessionStorage.setItem(MEMORY_KEY, JSON.stringify(value));
  } catch {}
};

// Abbreviated for mobile - a full "₹42,300" forces horizontal scroll on a
// phone-width screen once all 4 columns are shown side by side. Karthik's
// explicit ask: fit everything without scrolling, K/L notation is fine.
const formatAmount = (n) => {
  const amount = n || 0;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
};

// Closed until someone presses "Check" - the figures are only worked out on that
// click (not every time the dashboard opens), since this card is rarely looked at.
const TodayCollectionCard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [memory] = useState(readMemory);
  const [popupType, setPopupType] = useState(memory?.popupType || null);
  const [popupRow, setPopupRow] = useState(memory?.popupRow || null);
  const [popupScroll, setPopupScroll] = useState(memory?.popupScroll || 0);
  const [popup, setPopup] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupError, setPopupError] = useState(null);

  const handleCheck = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTodayCollectionSummary();
      if (res.data) setData(res.data);
    } catch (err) {
      setError(err.message || "Failed to load today's collection summary");
    } finally {
      setLoading(false);
    }
  };

  // Coming back from a loan: run the check again straight away so the card (and popup) are there as left
  useEffect(() => {
    if (memory?.checked) handleCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeMemory({ checked: !!data, popupType, popupRow, popupScroll });
  }, [data, popupType, popupRow, popupScroll]);

  // The "who paid" list for the tapped type
  useEffect(() => {
    if (!popupType) return undefined;
    let cancelled = false;
    setPopup(null);
    setPopupError(null);
    setPopupLoading(true);
    getTodayCollectionPaid(popupType)
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
  }, [popupType]);

  const openPopup = (type) => {
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

  return (
    <div className="today-collection-card bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
      <div className={`p-6 bg-slate-50/30 flex items-center justify-between gap-3 ${data || error ? "border-b border-slate-100" : ""}`}>
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Today&apos;s Collections</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Due vs paid, right now
          </p>
        </div>
        <button
          onClick={handleCheck}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {data ? "Refresh" : "Check"}
        </button>
      </div>

      {error ? (
        <div className="p-8 text-center text-red-500 text-xs font-bold uppercase tracking-tight">{error}</div>
      ) : !data ? null : (
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
                    <td className="px-3 sm:px-6 py-3 text-xs font-bold text-slate-600 text-right">
                      {formatAmount(row.expected)}
                    </td>
                    <td className="px-3 sm:px-6 py-3 text-xs font-bold text-emerald-600 text-right">
                      {row.collected > 0 ? (
                        <button
                          type="button"
                          onClick={() => openPopup(key)}
                          aria-label={`Show the ${label.toLowerCase()} loans that paid`}
                          className="font-bold underline decoration-dotted underline-offset-4 cursor-pointer"
                          style={{ touchAction: "manipulation" }}
                        >
                          {formatAmount(row.collected)}
                        </button>
                      ) : (
                        formatAmount(row.collected)
                      )}
                    </td>
                    <td className={`px-3 sm:px-6 py-3 text-xs font-bold text-right ${row.short > 0 ? "text-red-600" : "text-slate-400"}`}>
                      {formatAmount(row.short)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50/30">
                <td className="px-3 sm:px-6 py-3 text-xs font-black text-slate-900">Total</td>
                <td className="px-3 sm:px-6 py-3 text-xs font-black text-slate-900 text-right">
                  {formatAmount(data?.total?.expected)}
                </td>
                <td className="px-3 sm:px-6 py-3 text-xs font-black text-emerald-600 text-right">
                  {formatAmount(data?.total?.collected)}
                </td>
                <td className={`px-3 sm:px-6 py-3 text-xs font-black text-right ${data?.total?.short > 0 ? "text-red-600" : "text-slate-400"}`}>
                  {formatAmount(data?.total?.short)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {popupType && (
        <LoanListPopup
          title={`${ROWS.find((r) => r.key === popupType)?.label} loans · Today`}
          subtitle="Paid against today's EMIs"
          loading={popupLoading}
          error={popupError}
          rows={popup?.rows || null}
          amountKey="paid"
          amountColor="green"
          footerLabel="Total paid"
          footerAmount={popup?.total}
          emptyText="Nothing has been paid against today's EMIs yet."
          editPathFor={(id) => `${LOAN_EDIT_PATH[popupType]}${id}`}
          markedId={popupRow}
          initialScroll={memory?.popupType ? memory.popupScroll || 0 : 0}
          onScroll={setPopupScroll}
          onOpenLoan={(r, y) => {
            // Saved right now (not after the re-render) because this same tap leaves the page
            writeMemory({ checked: true, popupType, popupRow: r.loanId, popupScroll: y });
            setPopupRow(r.loanId);
          }}
          onClose={closePopup}
        />
      )}

      <style jsx global>{`
        .dashboard-dark-mode .today-collection-card .text-emerald-600 {
          color: #34d399 !important;
        }
        .dashboard-dark-mode .today-collection-card .text-red-600 {
          color: #f87171 !important;
        }
      `}</style>
    </div>
  );
};

export default TodayCollectionCard;
