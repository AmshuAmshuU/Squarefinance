"use client";
import React, { useState } from "react";
import ClientResponseSection from "./ClientResponseSection";
import { updateFollowup } from "../services/loan.service";
import { toISTDateString } from "../utils/dateUtils";

const LOAN_TYPE_TO_MODEL = {
  Vehicle: "Loan",
  Weekly: "WeeklyLoan",
  Daily: "DailyLoan",
  Interest: "InterestLoan",
};

// Small popup wrapper around the same "Status Update (Client Response)"
// section every loan's own edit page already uses, so a follow-up call can
// be logged right from the Dashboard without opening the loan itself.
const FollowupEditModal = ({ loan, onClose, onSaved }) => {
  const [clientResponse, setClientResponse] = useState(loan.clientResponse || "");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(toISTDateString(loan.nextFollowUpDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "nextFollowUpDate") setNextFollowUpDate(value);
    else setClientResponse(value);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateFollowup(loan._id, {
        loanModel: LOAN_TYPE_TO_MODEL[loan.loanType] || "Loan",
        clientResponse,
        nextFollowUpDate: nextFollowUpDate || null,
      });
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="w-full max-w-xl">
        <div className="bg-[#0A0C14] rounded-t-xl px-6 pt-5 pb-1 -mb-1 border border-b-0 border-slate-800 flex items-center justify-between">
          <p className="text-xs font-black text-slate-200 uppercase tracking-wide">
            {loan.loanNumber} &middot; {loan.customerName}
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 transition-all"
          >
            ✕
          </button>
        </div>
        <ClientResponseSection
          clientResponse={clientResponse}
          nextFollowUpDate={nextFollowUpDate}
          onChange={handleChange}
          isViewOnly={saving}
        />
        <div className="bg-[#0A0C14] rounded-b-xl px-6 pb-6 pt-2 border border-t-0 border-slate-800">
          {error && (
            <p className="text-[10px] font-black text-red-400 uppercase tracking-wide mb-3">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 border border-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-900 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowupEditModal;
