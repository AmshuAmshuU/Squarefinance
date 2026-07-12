"use client";
import React from "react";

const LoanStatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/20";
      case "closed":
        return "bg-slate-50 text-slate-500 border-slate-200 shadow-slate-100/20";
      case "seized":
        return "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/20";
      case "pending":
        return "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/20";
      case "waiting for approval":
        return "bg-blue-50 text-blue-600 border-blue-200 animate-pulse";
      default:
        return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  const getStatusDot = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-emerald-500";
      case "closed":
        return "bg-slate-400";
      case "seized":
        return "bg-rose-500";
      case "pending":
        return "bg-amber-500";
      case "waiting for approval":
        return "bg-blue-500";
      default:
        return "bg-slate-300";
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.1em] shadow-sm transition-all animate-in fade-in zoom-in duration-500 ${getStatusStyles(status)}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStatusDot(status)}`}></span>
      {status || "Unknown"}
    </div>
  );
};

export default LoanStatusBadge;
