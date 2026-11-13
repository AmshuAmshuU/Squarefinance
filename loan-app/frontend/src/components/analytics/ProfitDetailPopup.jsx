"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { useUI } from "../../context/UIContext";

const fullAmount = (n) => `${n < 0 ? "−" : ""}₹${Math.abs(Math.round(n || 0)).toLocaleString("en-IN")}`;

// Bottom sheet (centred on desktop) for the Profit Overview card's "Today" option: every item that makes up one green
// per-type profit number, grouped by where the profit comes from (EMI interest, processing fees, ...), with a subtotal
// per group and the total at the bottom. Same look as the other loan-list popups; lives on document.body so it carries
// its own light / dark colours.
//   rows: [{ group, loanId, loanNumber, customerName, detail, amount }]
const ProfitDetailPopup = ({ title, subtitle, loading, error, rows, total, editPathFor, markedKey, initialScroll = 0, onScroll, onOpenLoan, onClose }) => {
  const { isDarkMode: isDark } = useUI();
  const listRef = useRef(null);
  const pendingScroll = useRef(initialScroll > 0 ? initialScroll : null);

  useEffect(() => {
    if (loading || !rows || pendingScroll.current === null) return;
    const y = pendingScroll.current;
    pendingScroll.current = null;
    if (listRef.current) listRef.current.scrollTop = y;
  }, [loading, rows]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const pop = isDark
    ? { bg: "#1e293b", text: "#f1f5f9", name: "#cbd5e1", muted: "#94a3b8", line: "rgba(255,255,255,0.08)", chip: "rgba(255,255,255,0.1)", foot: "rgba(255,255,255,0.04)", link: "#7db4ff", green: "#34d399", red: "#f87171", mark: "rgba(251,191,36,0.16)", head: "rgba(255,255,255,0.05)" }
    : { bg: "#ffffff", text: "#0f172a", name: "#334155", muted: "#94a3b8", line: "#f1f5f9", chip: "#f1f5f9", foot: "#f8fafc", link: "#2563eb", green: "#059669", red: "#dc2626", mark: "#fffbeb", head: "#f8fafc" };
  const amountColor = (n) => (n < 0 ? pop.red : pop.green);

  // Rows arrive already ordered by group - cut them into sections
  const sections = [];
  (rows || []).forEach((r, i) => {
    let s = sections[sections.length - 1];
    if (!s || s.group !== r.group) {
      s = { group: r.group, items: [], sum: 0 };
      sections.push(s);
    }
    s.items.push({ ...r, key: `${r.group}|${r.loanId}|${i}` });
    s.sum += r.amount;
  });

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: pop.bg, color: pop.text }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${pop.line}` }}>
          <div className="min-w-0">
            <h4 className="text-sm font-black tracking-tight" style={{ color: pop.text }}>{title}</h4>
            <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: pop.muted }}>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full cursor-pointer" style={{ background: pop.chip, color: pop.muted }}>
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto" onScroll={(e) => onScroll && onScroll(Math.round(e.currentTarget.scrollTop))}>
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Loading...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-xs font-bold uppercase tracking-tight">{error}</div>
          ) : rows && rows.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold" style={{ color: pop.muted }}>No profit items today.</div>
          ) : (
            sections.map((s) => (
              <div key={s.group}>
                <div className="flex items-center justify-between gap-3 px-4 py-2" style={{ background: pop.head, borderTop: `1px solid ${pop.line}` }}>
                  <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: pop.muted }}>{s.group}</span>
                  <span className="text-[11px] font-black" style={{ color: amountColor(s.sum) }}>{fullAmount(s.sum)}</span>
                </div>
                <ul>
                  {s.items.map((r) => (
                    <li key={r.key} className="flex items-center gap-3 px-4 py-2" style={{ borderTop: `1px solid ${pop.line}`, background: markedKey === r.key ? pop.mark : "transparent" }}>
                      <Link
                        href={editPathFor(r.loanId)}
                        onClick={() => onOpenLoan && onOpenLoan(r, Math.round(listRef.current?.scrollTop || 0))}
                        className="shrink-0 min-w-[40px] text-xs font-black underline underline-offset-2"
                        style={{ color: pop.link }}
                      >
                        {r.loanNumber || "—"}
                      </Link>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-xs font-bold uppercase" style={{ color: pop.name }}>{r.customerName}</span>
                        <span className="block truncate text-[10px] font-bold" style={{ color: pop.muted }}>{r.detail}</span>
                      </span>
                      <span className="shrink-0 text-xs font-black" style={{ color: amountColor(r.amount) }}>{fullAmount(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {rows && !loading && !error && (
          <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderTop: `1px solid ${pop.line}`, background: pop.foot }}>
            <span className="text-xs font-black" style={{ color: pop.text }}>Total profit today</span>
            <span className="text-sm font-black" style={{ color: amountColor(total) }}>{fullAmount(total)}</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default ProfitDetailPopup;
