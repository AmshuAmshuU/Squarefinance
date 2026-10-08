"use client";
import React from "react";
import { PrevButton, NextButton } from "./LoanPrevNext";
import LoanStatusBadge from "./LoanStatusBadge";
import LoanCallRecord from "./LoanCallRecord";
import { useUI } from "../context/UIContext";

// 2cm x 2cm is about 76 CSS pixels. Placeholder for the customer's photo -
// a real photo will replace the silhouette once uploading is built.
const CustomerPhotoBox = () => {
  const { isDarkMode } = useUI();
  return (
    <div
      className={`w-[76px] h-[76px] rounded-xl border flex items-center justify-center overflow-hidden ${
        isDarkMode ? "bg-slate-700 border-white/10 text-slate-400" : "bg-slate-200 border-slate-300 text-slate-400"
      }`}
      aria-label="Customer photo"
    >
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
      </svg>
    </div>
  );
};

// The locked top bar of a Vehicle loan's Modify and Profile view pages.
// Compact on purpose (to make room for the customer photo): PREV / BACK in
// the top-left, the one-word title and the loan / vehicle number shapes in
// the middle, NEXT / status / photo down the right, last call bottom-left.
// `onBack` and `showLastCall` are only passed on the Modify page.
const VehicleLoanTopBar = ({
  title,
  loan,
  loanId,
  hasPrev,
  hasNext,
  goPrev,
  goNext,
  onBack,
  showLastCall = false,
}) => (
  <div className="sticky top-16 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-2 mb-8 border-b border-slate-100 flex items-stretch gap-3 transition-all duration-300">
    <div className="flex-1 min-w-0 flex flex-col justify-between">
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1.5 items-start">
        <PrevButton disabled={!hasPrev} onClick={goPrev} />
        <h1 className="h-[38px] flex items-center text-xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
          {title}
        </h1>
        {onBack ? (
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
          >
            <span className="text-base leading-none">←</span> Back
          </button>
        ) : (
          <div />
        )}
        <div className="flex flex-col items-start gap-1">
          <span className="text-[13px] font-black text-primary uppercase tracking-tight bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            {loan?.loanTerms?.loanNumber || loan?.loanNumber}
            {loan?.customerDetails?.customerName ? `, ${loan.customerDetails.customerName}` : ""}
          </span>
          <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            {loan?.vehicleInformation?.vehicleNumber || "—"}
          </span>
        </div>
      </div>
      {showLastCall && <LoanCallRecord loanId={loanId} loanModel="Loan" className="mt-1.5" />}
    </div>
    <div className="w-[88px] shrink-0 flex flex-col items-stretch gap-1.5">
      <NextButton disabled={!hasNext} onClick={goNext} />
      <div className="flex justify-center">
        <LoanStatusBadge status={loan?.status?.status || loan?.status} />
      </div>
      <div className="flex justify-center">
        <CustomerPhotoBox />
      </div>
    </div>
  </div>
);

export default VehicleLoanTopBar;
