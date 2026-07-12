"use client";
import React from "react";

const ClientResponseSection = ({
  clientResponse,
  nextFollowUpDate,
  onChange,
  onBlur,
  isViewOnly = false,
  updatedBy,
  updatedAt,
  nameResponse = "clientResponse",
  nameDate = "nextFollowUpDate",
}) => {
  return (
    <div className="bg-[#0A0C14] rounded-xl p-6 shadow-xl border border-slate-800 animate-in slide-in-from-bottom duration-700 max-w-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-[10px] font-black text-slate-500 flex items-center gap-3 uppercase tracking-[0.2em]">
          Status Update (Client Response)
        </h2>
        {updatedBy && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-xl animate-in fade-in slide-in-from-right-2 duration-500">
            <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">
              Last Updated By
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-primary uppercase">
                {typeof updatedBy === "string" ? updatedBy : updatedBy.name}
              </span>
              <span className="text-[9px] font-bold text-slate-500">
                {new Date(updatedAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}{" "}
                at{" "}
                {new Date(updatedAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-8 space-y-3">
          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
            Message
          </label>
          <textarea
            name={nameResponse}
            value={clientResponse || ""}
            onChange={onChange}
            onBlur={onBlur}
            placeholder="Response..."
            disabled={isViewOnly}
            rows="3"
            className="w-full bg-transparent border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-slate-700 resize-none disabled:opacity-50"
          />
        </div>
        <div className="md:col-span-4 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Follow-up Date
            </label>
            {nextFollowUpDate && (
              <button
                type="button"
                onClick={() => onChange({ target: { name: nameDate, value: "" } })}
                className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors mr-1"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="date"
            name={nameDate}
            value={nextFollowUpDate || ""}
            onChange={onChange}
            onBlur={onBlur}
            disabled={isViewOnly}
            className="w-full bg-transparent border border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all [color-scheme:dark] disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
};

export default ClientResponseSection;
