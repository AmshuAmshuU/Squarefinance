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
  { value: "1HR", label: "1 hr" },
  { value: "2HR", label: "2 hr" },
  { value: "3HR", label: "3 hr" },
  { value: "4HR", label: "4 hr" },
  { value: "5HR", label: "5 hr" },
  { value: "6HR", label: "6 hr" },
  { value: "CLEAR", label: "Clear" },
];

const PILL_CLASS = {
  NP: "bg-red-50 text-red-600",
  EOD: "bg-amber-50 text-amber-600",
  SWO: "bg-slate-200 text-slate-600",
  "1HR": "bg-amber-50 text-amber-600", // same amber as EOD
  "2HR": "bg-amber-50 text-amber-600", // same amber as EOD
  "3HR": "bg-amber-50 text-amber-600", // same amber as EOD
  "4HR": "bg-amber-50 text-amber-600", // same amber as EOD
  "5HR": "bg-amber-50 text-amber-600", // same amber as EOD
  "6HR": "bg-amber-50 text-amber-600", // same amber as EOD
};

// "3HR" is stored; the pill reads "3 HR".
const pillText = (response) => (/^\dHR$/.test(response) ? `${response[0]} HR` : response);

// One loan's last-call note with the NP / EOD / SWO / 1-6 hr / Clear dropdown. Used in both
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
    // 10 options now - taller than some phone screens, so the menu is capped
    // to the screen height (scrolls if needed) and kept fully on screen.
    const height = Math.min(OPTIONS.length * 38 + 8, window.innerHeight - 16);
    const fitsBelow = rect.bottom + 4 + height <= window.innerHeight - 8;
    const fitsAbove = rect.top - height - 4 >= 8;
    const y = fitsBelow ? rect.bottom + 4 : fitsAbove ? rect.top - height - 4 : Math.max(8, window.innerHeight - height - 8);
    setMenu({ x: Math.min(rect.left, window.innerWidth - 176), y, maxHeight: height });
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
                isDarkMode && record.response === "SWO"
                  ? ""
                  : PILL_CLASS[record.response] || "bg-slate-100 text-slate-600"
              }`}
              // SWO's light-mode grey turned into a pale box with weak letters in
              // dark mode - give it its own dark colours (no class, so the page's
              // dark-mode overrides can't touch it).
              style={
                isDarkMode && record.response === "SWO"
                  ? { backgroundColor: "rgba(148,163,184,0.28)", color: "#e2e8f0" }
                  : undefined
              }
            >
              {pillText(record.response)}
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
              maxHeight: menu.maxHeight,
              overflowY: "auto",
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
