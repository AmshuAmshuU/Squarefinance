"use client";
import React from "react";

// Shared "Foreclosure Settlement" summary card, shown on a loan's view/edit
// page once it's been foreclosed. Originally inline-only on Vehicle loan
// pages; extracted here so Weekly/Daily loan pages can show the same thing
// once they gained their own foreclosure flow. Takes flat props (not the
// nested status.foreclosureDetails shape Vehicle loans use) since
// Weekly/Daily store these fields directly on the loan document.
const ForeclosureDetailsCard = ({
  foreclosureAmount,
  foreclosureDate,
  foreclosureChargeAmount,
  odAmount,
  miscellaneousFee,
  foreclosedByName,
}) => {
  return (
    <div className="mb-8 bg-white rounded-3xl border border-amber-100 p-8 shadow-sm">
      <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-4">
        Foreclosure Settlement
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
            Settlement Amount
          </span>
          <p className="text-sm font-black text-slate-900">
            ₹{(foreclosureAmount || 0).toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
            Settlement Date
          </span>
          <p className="text-sm font-black text-slate-900">
            {foreclosureDate
              ? new Date(foreclosureDate).toLocaleDateString("en-IN")
              : "—"}
          </p>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
            Foreclosure Charge
          </span>
          <p className="text-sm font-black text-slate-900">
            ₹{(foreclosureChargeAmount || 0).toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
            OD/Overdue
          </span>
          <p className="text-sm font-black text-slate-900">
            ₹{(odAmount || 0).toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
            Misc. Fee
          </span>
          <p className="text-sm font-black text-slate-900">
            ₹{(miscellaneousFee || 0).toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
            Processed By
          </span>
          <p className="text-sm font-black text-slate-900 uppercase">
            {foreclosedByName || "—"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForeclosureDetailsCard;
