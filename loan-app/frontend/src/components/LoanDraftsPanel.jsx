"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { listLoanDrafts, discardLoanDraft } from "../services/loanDraft.service";
import { useToast } from "../context/ToastContext";
import { useUI } from "../context/UIContext";

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "";

// "Pending rate approvals" - every saved Add Loan draft, visible to everyone
// who can create loans. Anyone can continue or discard any of them.
const LoanDraftsPanel = ({ activeDraftId }) => {
  const { showToast } = useToast();
  const { isDarkMode } = useUI();
  const [drafts, setDrafts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await listLoanDrafts();
      setDrafts(res.data || []);
    } catch {
      // keep whatever is on screen; the next refresh will retry
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const discard = async (id) => {
    try {
      await discardLoanDraft(id);
      showToast("Draft discarded", "success");
      setConfirmId(null);
      load();
    } catch (err) {
      showToast(err.message || "Failed to discard draft", "error");
    }
  };

  if (!loaded || drafts.length === 0) return null;

  const card = isDarkMode ? "bg-slate-800 border-white/10" : "bg-white border-slate-200";
  const head = isDarkMode ? "text-slate-100" : "text-slate-900";
  const sub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const rowBorder = isDarkMode ? "border-white/10" : "border-slate-100";

  const chip = (d) => {
    if (d.status === "Completed") return { label: "Loan created", cls: isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500" };
    if (d.status === "Rejected") return { label: "Rejected", cls: isDarkMode ? "bg-red-500/20 text-red-300" : "bg-red-50 text-red-600" };
    if (d.status === "Approved" && d.isExpired) return { label: "Approval expired", cls: isDarkMode ? "bg-red-500/20 text-red-300" : "bg-red-50 text-red-600" };
    if (d.status === "Approved") return { label: "Approved - continue", cls: isDarkMode ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-50 text-emerald-600" };
    return { label: "Waiting for approval", cls: isDarkMode ? "bg-amber-500/20 text-amber-300" : "bg-amber-50 text-amber-600" };
  };

  const detail = (d) => {
    if (d.status === "Completed") return `Created by ${d.completedBy?.name || "-"} on ${fmt(d.completedAt)}`;
    if (d.status === "Rejected") return `Rejected by ${d.rejectedBy?.name || "-"}${d.rejectRemarks ? `: ${d.rejectRemarks}` : ""}`;
    if (d.status === "Approved") {
      return d.isExpired
        ? `Approval expired ${fmt(d.expiresAt)}`
        : `Approved by ${d.approvedBy?.name || "-"} - use before ${fmt(d.expiresAt)}`;
    }
    return `Requested by ${d.createdBy?.name || "-"} on ${fmt(d.createdAt)}`;
  };

  return (
    <div className={`mb-8 rounded-3xl border shadow-sm overflow-hidden ${card}`}>
      <div className={`px-6 py-4 border-b ${rowBorder}`}>
        <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] ${head}`}>Pending rate approvals</h2>
        <p className={`text-xs font-semibold mt-0.5 ${sub}`}>
          Half-filled loans waiting on an interest rate below 2.00. Anyone can continue one once it is approved.
        </p>
      </div>
      <div>
        {drafts.map((d) => {
          const c = chip(d);
          const finished = d.status === "Completed";
          return (
            <div
              key={d._id}
              className={`px-6 py-4 border-b last:border-b-0 flex flex-col sm:flex-row sm:items-center gap-3 ${rowBorder} ${activeDraftId === d._id ? (isDarkMode ? "bg-blue-500/10" : "bg-blue-50/60") : ""} ${finished ? "opacity-70" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-black uppercase ${head}`}>{d.loanNumber || "No loan number yet"}</span>
                  <span className={`text-xs font-bold uppercase ${sub}`}>{d.customerName || ""}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${c.cls}`}>{c.label}</span>
                </div>
                <p className={`text-xs font-semibold mt-1 ${sub}`}>
                  Rate {d.requestedRate}% - {detail(d)}
                </p>
              </div>
              {!finished && (
                <div className="flex items-center gap-2 shrink-0">
                  {confirmId === d._id ? (
                    <>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>Discard?</span>
                      <button
                        type="button"
                        onClick={() => discard(d._id)}
                        className="px-3 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-500"}`}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/admin/loans/add?draft=${d._id}`}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                      >
                        {activeDraftId === d._id ? "Open" : "Continue"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmId(d._id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? "bg-red-500/15 text-red-300 hover:bg-red-500/25" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                      >
                        Discard
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoanDraftsPanel;
