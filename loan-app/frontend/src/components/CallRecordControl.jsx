"use client";
import React, { useState, useEffect } from "react";
import { setCallRecord } from "../services/callRecord.service";
import { useToast } from "../context/ToastContext";
import { useUI } from "../context/UIContext";

// Maps a loan-type label used by the follow-up lists to the backend model.
export const LOAN_MODEL_BY_TYPE = {
  Vehicle: "Loan",
  Monthly: "Loan",
  Weekly: "WeeklyLoan",
  Daily: "DailyLoan",
  Interest: "InterestLoan",
};

// Another user's call arrives over the socket (see NotificationContext) as a
// window event so any list on screen can patch that loan live.
export const useCallRecordEvents = (handler) => {
  useEffect(() => {
    const listener = (e) => handler(e.detail);
    window.addEventListener("call-record-updated", listener);
    return () => window.removeEventListener("call-record-updated", listener);
  }, [handler]);
};

const IST = "Asia/Kolkata";
const istDay = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: IST });

// "3:42p" - as short as possible for the follow-up tables.
const shortTime = (d) =>
  new Date(d)
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST })
    .replace(/\s?([ap])m$/i, (_, x) => x.toLowerCase());

const OPTIONS = [
  { value: "NP", label: "NP - not picking" },
  { value: "EOD", label: "EOD - end of day" },
  { value: "SWO", label: "SWO - switched off" },
  { value: "CLEAR", label: "Clear" },
];

const PILL_CLASS = {
  NP: "bg-red-50 text-red-600",
  EOD: "bg-amber-50 text-amber-600",
  SWO: "bg-slate-200 text-slate-600",
};

// One loan's last-call note with the NP / EOD / Clear dropdown. Used in both
// follow-up lists and on the loan details page, so the note reads the same
// everywhere. `record` is { response, calledByName, calledAt } or null;
// `onChange(record)` receives the new record (null after Clear).
const CallRecordControl = ({ loanId, loanModel, record, onChange, showDate = false }) => {
  const { showToast } = useToast();
  const { isDarkMode } = useUI();
  const [menu, setMenu] = useState(null); // { x, y } | null
  const [saving, setSaving] = useState(false);

  const openMenu = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const height = 172; // 4 options now (NP, EOD, SWO, Clear)
    const above = rect.bottom + height > window.innerHeight;
    setMenu({ x: Math.min(rect.left, window.innerWidth - 176), y: above ? rect.top - height - 4 : rect.bottom + 4 });
  };

  const choose = async (value) => {
    setMenu(null);
    setSaving(true);
    try {
      const res = await setCallRecord(loanId, loanModel, value);
      onChange?.(res.data?.record || null);
    } catch (err) {
      showToast(err.message || "Couldn't save the call record", "error");
    } finally {
      setSaving(false);
    }
  };

  const isToday = record && istDay(record.calledAt) === istDay(new Date());
  const when = record
    ? showDate && !isToday
      ? `${new Date(record.calledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: IST })}, ${shortTime(record.calledAt)}`
      : shortTime(record.calledAt)
    : "";

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        disabled={saving}
        aria-label="Log a call"
        className="text-left disabled:opacity-50"
      >
        {record ? (
          <span className="flex flex-col items-start gap-0.5">
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
                PILL_CLASS[record.response] || "bg-slate-100 text-slate-600"
              }`}
            >
              {record.response}
            </span>
            <span className="text-[10px] font-bold text-slate-500 leading-tight whitespace-nowrap">
              {record.calledByName.slice(0, 4)} · {when}
            </span>
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded-md border border-dashed border-slate-300 text-[10px] font-bold text-slate-400 whitespace-nowrap">
            + Log
          </span>
        )}
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-44 rounded-xl border shadow-xl py-1"
            style={{
              left: menu.x,
              top: menu.y,
              backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
              borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "#e2e8f0",
            }}
          >
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => choose(opt.value)}
                className="w-full text-left px-3 py-2.5 text-xs font-bold hover:bg-slate-500/20 active:bg-slate-500/30 transition-colors"
                style={{ color: isDarkMode ? "#f1f5f9" : "#0f172a" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default CallRecordControl;
