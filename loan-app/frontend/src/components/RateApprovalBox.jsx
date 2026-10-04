"use client";
import React, { useState } from "react";
import { useUI } from "../context/UIContext";

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "";

// Shown under the Interest Rate field on the Add Loan form when a rate below
// 2.00 is typed. Explains where the approval stands and offers the button to
// ask for it (which saves the form as a draft so nothing is lost while waiting).
const RateApprovalBox = ({ rate, rateDraft, approved, onRequest }) => {
  const { isDarkMode } = useUI();
  const [busy, setBusy] = useState(false);

  const sameRate = rateDraft && Number(rateDraft.requestedRate) === rate;
  const waiting = sameRate && rateDraft.status === "Waiting for Approval";
  const rejected = sameRate && rateDraft.status === "Rejected";
  const expired = sameRate && rateDraft.status === "Approved" && !approved;

  let tone = "amber";
  let title = "Rates below 2.00 need Super Admin approval";
  let text = "Ask for approval and this form is saved as a draft. You can leave the page, and anyone can come back to this draft once it is approved.";
  let button = `Request approval for ${rate}%`;

  if (approved) {
    tone = "green";
    title = `Rate ${rate}% approved${rateDraft?.approvedBy?.name ? ` by ${rateDraft.approvedBy.name}` : ""}`;
    text = `Approved ${fmt(rateDraft?.approvedAt)}. You can create the loan until ${fmt(rateDraft?.expiresAt)}. The approval works once and only for exactly ${rate}%.`;
    button = "Save draft";
  } else if (waiting) {
    title = "Waiting for Super Admin approval";
    text = `Requested${rateDraft?.createdBy?.name ? ` by ${rateDraft.createdBy.name}` : ""}. You can leave this page - find the draft under Pending rate approvals on the Add Loan page.`;
    button = "Save draft changes";
  } else if (rejected) {
    tone = "red";
    title = `Rate ${rate}% was rejected${rateDraft?.rejectedBy?.name ? ` by ${rateDraft.rejectedBy.name}` : ""}`;
    text = `${rateDraft?.rejectRemarks ? `Reason: ${rateDraft.rejectRemarks}. ` : ""}Change the rate to 2.00 or more, or ask again.`;
    button = "Request approval again";
  } else if (expired) {
    tone = "red";
    title = "The approval for this rate has expired";
    text = "Approvals last 24 hours. Ask again to continue with this rate.";
    button = "Request approval again";
  }

  const palette = {
    amber: isDarkMode
      ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
      : "bg-amber-50 border-amber-200 text-amber-800",
    green: isDarkMode
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
      : "bg-emerald-50 border-emerald-200 text-emerald-800",
    red: isDarkMode
      ? "bg-red-500/10 border-red-500/30 text-red-200"
      : "bg-red-50 border-red-200 text-red-800",
  }[tone];
  const btn = {
    amber: "bg-amber-500 hover:bg-amber-600 text-white",
    green: isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-100" : "bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200",
    red: "bg-red-500 hover:bg-red-600 text-white",
  }[tone];

  const handleClick = async () => {
    setBusy(true);
    try {
      await onRequest();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`md:col-span-3 rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${palette}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black uppercase tracking-widest">{title}</p>
        <p className="text-xs font-semibold mt-1 opacity-90">{text}</p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`shrink-0 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 ${btn}`}
      >
        {busy ? "Saving..." : button}
      </button>
    </div>
  );
};

export default RateApprovalBox;
