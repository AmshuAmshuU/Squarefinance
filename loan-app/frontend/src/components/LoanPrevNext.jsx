"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getLoanNeighbors } from "../services/loanNeighbor.service";
import { useUI } from "../context/UIContext";

// PREV / NEXT between loans: PREV goes to the next-older loan, NEXT to the
// next-newer loan (the backend decides which loan that is).
// Stays on the same kind of page - from a modify page you land on the next
// loan's modify page, from a view page on its view page.

const BASE_PATHS = {
  Loan: "/admin/loans",
  WeeklyLoan: "/admin/weekly-loans",
  DailyLoan: "/admin/daily-loans",
  InterestLoan: "/admin/interest-loan",
};

const Chevron = ({ dir }) => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
  </svg>
);

const NavButton = ({ dir, disabled, onClick }) => {
  const { isDarkMode } = useUI();
  const look = isDarkMode
    ? "bg-slate-800 border-white/20 text-slate-200 hover:bg-slate-700 hover:text-blue-400"
    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-primary hover:border-primary/30";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-1.5 px-2 py-2.5 border rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${look}`}
    >
      {dir === "left" && <Chevron dir="left" />}
      {dir === "left" ? "Prev" : "Next"}
      {dir === "right" && <Chevron dir="right" />}
    </button>
  );
};

export const PrevButton = (props) => <NavButton dir="left" {...props} />;
export const NextButton = (props) => <NavButton dir="right" {...props} />;

const UnsavedModal = ({ saving, onSave, onDiscard, onStay }) => {
  const { isDarkMode } = useUI();
  const card = isDarkMode ? "bg-slate-800 border-white/10" : "bg-white border-slate-100";
  const title = isDarkMode ? "text-slate-100" : "text-slate-900";
  const text = isDarkMode ? "text-slate-400" : "text-slate-500";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-3xl shadow-2xl border p-8 text-center ${card}`}>
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-5 text-2xl font-black">!</div>
        <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${title}`}>Unsaved changes</h3>
        <p className={`text-sm font-bold mb-6 ${text}`}>
          You have changes on this loan that are not saved yet. What would you like to do?
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {saving ? "Saving..." : "Commit changes & go"}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 ${isDarkMode ? "bg-red-500/15 text-red-300 hover:bg-red-500/25" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
          >
            Discard changes & go
          </button>
          <button
            type="button"
            onClick={onStay}
            disabled={saving}
            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 ${isDarkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
          >
            Stay on this loan
          </button>
        </div>
      </div>
    </div>
  );
};

// mode: "view" | "edit". On edit pages pass formStateRef (from useFormDirty) so
// PREV/NEXT can warn about unsaved changes; saveSucceededRef is set by the
// page's submit handler so "Commit changes & go" only moves on if it worked.
export const useLoanPrevNext = ({ loanModel, id, mode, formStateRef, saveSucceededRef }) => {
  const router = useRouter();
  const [neighbors, setNeighbors] = useState({ forId: null, prevId: null, nextId: null });
  const [pendingId, setPendingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getLoanNeighbors(loanModel, id)
      .then((res) => {
        if (!cancelled) setNeighbors({ forId: id, prevId: res.data?.prevId || null, nextId: res.data?.nextId || null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loanModel, id]);

  const navigateTo = useCallback(
    (targetId) => {
      const suffix = mode === "edit" ? "/edit" : "";
      // Keep ?returnTo=... so the Back button still goes to the right list.
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`${BASE_PATHS[loanModel]}${suffix}/${targetId}${search}`);
    },
    [router, loanModel, mode],
  );

  const go = useCallback(
    (targetId) => {
      if (!targetId) return;
      if (mode === "edit" && formStateRef?.current?.isDirty()) {
        setPendingId(targetId);
        return;
      }
      navigateTo(targetId);
    },
    [mode, formStateRef, navigateTo],
  );

  const saveAndGo = async () => {
    if (!formStateRef?.current) return;
    setSaving(true);
    if (saveSucceededRef) saveSucceededRef.current = false;
    try {
      await formStateRef.current.submit();
    } catch {
      // the page already shows its own error message
    }
    setSaving(false);
    const target = pendingId;
    setPendingId(null);
    // Only move on if the save really went through (not on a validation or
    // server error) so nothing is lost.
    if (saveSucceededRef?.current) navigateTo(target);
  };

  const modal = pendingId ? (
    <UnsavedModal
      saving={saving}
      onSave={saveAndGo}
      onDiscard={() => {
        const target = pendingId;
        setPendingId(null);
        navigateTo(target);
      }}
      onStay={() => setPendingId(null)}
    />
  ) : null;

  // Ignore neighbours fetched for a previous loan while the new ones load.
  const current = neighbors.forId === id ? neighbors : { prevId: null, nextId: null };

  return {
    hasPrev: !!current.prevId,
    hasNext: !!current.nextId,
    goPrev: () => go(current.prevId),
    goNext: () => go(current.nextId),
    modal,
  };
};
