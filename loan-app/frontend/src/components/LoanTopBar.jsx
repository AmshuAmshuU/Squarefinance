"use client";
import React from "react";
import { PrevButton, NextButton } from "./LoanPrevNext";
import LoanStatusBadge from "./LoanStatusBadge";
import LoanCallRecord from "./LoanCallRecord";
import CustomerPhoto from "./CustomerPhoto";

// The locked top bar of every loan's Modify and Profile view page (Vehicle,
// Weekly, Daily and Interest alike). Compact on purpose, to make room for the
// customer photo: PREV / BACK in the top-left, the one-word title and the loan
// number shape (plus the vehicle number shape for vehicle loans) in the middle,
// NEXT / status / photo down the right, last call bottom-left.
//   loanModel: "Loan" | "WeeklyLoan" | "DailyLoan" | "InterestLoan"
const LoanTopBar = ({
  title,
  loanModel,
  loanId,
  loanNumber,
  customerName,
  vehicleNumber,
  showVehicle = false,
  status,
  hasPrev,
  hasNext,
  goPrev,
  goNext,
  onBack,
}) => (
  <div className="sticky top-16 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-2 mb-8 border-b border-slate-100 flex items-stretch gap-3 transition-all duration-300">
    <div className="flex-1 min-w-0 flex flex-col justify-between">
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1.5 items-start">
        <PrevButton disabled={!hasPrev} onClick={goPrev} />
        <h1 className="h-[38px] flex items-center text-xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
          {title}
        </h1>
        <button
          onClick={onBack}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
        >
          <span className="text-base leading-none">←</span> Back
        </button>
        <div className="flex flex-col items-start gap-1">
          <span className="text-[13px] font-black text-primary uppercase tracking-tight bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            {loanNumber}
            {customerName ? `, ${customerName}` : ""}
          </span>
          {showVehicle && (
            <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {vehicleNumber || "—"}
            </span>
          )}
        </div>
      </div>
      <LoanCallRecord loanId={loanId} loanModel={loanModel} className="mt-1.5" />
    </div>
    <div className="w-[88px] shrink-0 flex flex-col items-stretch gap-1.5">
      <NextButton disabled={!hasNext} onClick={goNext} />
      <div className="flex justify-center">
        <LoanStatusBadge status={status} />
      </div>
      <div className="flex justify-center">
        <CustomerPhoto loanModel={loanModel} loanId={loanId} />
      </div>
    </div>
  </div>
);

export default LoanTopBar;
