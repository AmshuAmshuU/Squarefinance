"use client";
import React from "react";
import { format } from "date-fns";

const DisbursementList = ({ disbursements = [] }) => {
  if (!disbursements || disbursements.length === 0) return null;

  return (
    <div className="mt-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-100 mb-3 px-1">
        <div className="col-span-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Date
        </div>
        <div className="col-span-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Payment mode
        </div>
        <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">
          Amount
        </div>
      </div>
      
      <div className="space-y-3">
        {disbursements.map((item, index) => {
          const displayMode = item.mode === "Cheque" && item.chequeNumber 
            ? `Cheque(${item.chequeNumber})` 
            : (item.mode || "Cash");
            
          return (
            <div key={index} className="grid grid-cols-12 gap-4 items-center px-1">
              <div className="col-span-4 text-[11px] font-bold text-slate-600">
                {item.date ? format(new Date(item.date), "dd/MMM/yyyy") : "N/A"}
              </div>
              <div className="col-span-5 text-[11px] font-bold text-slate-600">
                {displayMode}
              </div>
              <div className="col-span-3 text-[11px] font-black text-slate-900 text-right">
                ₹{(item.amount || 0).toLocaleString("en-IN")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DisbursementList;
