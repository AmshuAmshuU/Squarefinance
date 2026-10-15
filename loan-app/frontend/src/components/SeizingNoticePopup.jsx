"use client";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useUI } from "../context/UIContext";

// The customer notice sent before a Vehicle loan is marked "For Seizing" (a
// government compliance requirement - everyone, Super Admin included). The
// employee sends it from their own phone: WhatsApp and SMS open with the
// message already typed. This page cannot see whether a message was really
// sent, so the tick boxes are honour-based; the server records who/when/which
// number and shows it as proof on the loan and on the approval card.

// Exact wording confirmed by Karthik (English, blank line, Kannada).
export const buildSeizingMessage = (customerName, vehicleNumber) => {
  const name = (customerName || "").trim();
  const vehicle = (vehicleNumber || "").trim();
  return (
    `Dear ${name} ,this is your vehicle ${vehicle} seizing notice issued by Square Finance due to loan payments pending.\n\n` +
    `${name}, ನಿಮ್ಮ ವಾಹನದ ${vehicle} ಸಾಲದ ಕಂತು ಬಾಕಿ ಇರುವ ಕಾರಣ, ಸ್ಕ್ವೇರ್ ಫೈನಾನ್ಸ್ ವತಿಯಿಂದ ವಾಹನ ಜಪ್ತಿ ನೋಟಿಸ್ ನೀಡಲಾಗಿದೆ.`
  );
};

const tenDigits = (v) => String(v ?? "").replace(/\D/g, "").slice(-10);

const whatsappLink = (number, message) => `https://wa.me/91${number}?text=${encodeURIComponent(message)}`;
// "?&body=" is the form both iPhone and Android accept.
const smsLink = (number, message) => `sms:+91${number}?&body=${encodeURIComponent(message)}`;

const emptyChannel = (firstNumber) => ({
  choice: firstNumber || "typed", // a saved number, "typed", or "skip"
  typedValue: "",
  opened: false,
  ticked: false,
});

const channelNumber = (ch) => (ch.choice === "typed" ? tenDigits(ch.typedValue) : ch.choice === "skip" ? "" : ch.choice);
const channelDone = (ch) =>
  ch.choice === "skip" || (channelNumber(ch).length === 10 && ch.opened && ch.ticked);
const channelResult = (ch) =>
  ch.choice === "skip"
    ? { status: "skipped" }
    : { status: "sent", number: channelNumber(ch), typed: ch.choice === "typed" };

const SeizingNoticePopup = ({ loan, onClose, onConfirm, confirming = false }) => {
  const { isDarkMode } = useUI();

  const savedNumbers = useMemo(() => {
    const seen = new Set();
    return (loan?.mobileNumbers || [])
      .map(tenDigits)
      .filter((n) => n.length === 10 && !seen.has(n) && seen.add(n));
  }, [loan]);

  const message = useMemo(
    () => buildSeizingMessage(loan?.customerName, loan?.vehicleNumber),
    [loan],
  );

  const [wa, setWa] = useState(() => emptyChannel(savedNumbers[0]));
  const [sms, setSms] = useState(() => emptyChannel(savedNumbers[0]));

  const c = isDarkMode
    ? { card: "#1e293b", box: "#0f172a", border: "rgba(255,255,255,0.14)", text: "#f1f5f9", muted: "#94a3b8", chip: "#334155", chipText: "#e2e8f0", blue: "#3b82f6", green: "#22c55e", greenText: "#052e16", disabled: "#334155", disabledText: "#64748b", warn: "#fbbf24" }
    : { card: "#ffffff", box: "#f8fafc", border: "#e2e8f0", text: "#0f172a", muted: "#64748b", chip: "#f1f5f9", chipText: "#334155", blue: "#2563eb", green: "#16a34a", greenText: "#ffffff", disabled: "#e2e8f0", disabledText: "#94a3b8", warn: "#b45309" };

  const allDone = channelDone(wa) && channelDone(sms);

  const confirm = () => {
    if (!allDone || confirming) return;
    onConfirm({ whatsapp: channelResult(wa), sms: channelResult(sms) });
  };

  const chipStyle = (active) => ({
    fontSize: 12,
    fontWeight: 800,
    padding: "7px 11px",
    borderRadius: 10,
    border: `1px solid ${active ? c.blue : c.border}`,
    background: active ? c.blue : c.chip,
    color: active ? "#ffffff" : c.chipText,
    cursor: "pointer",
  });

  const renderStep = (label, icon, ch, setCh, makeLink, openLabel) => {
    const number = channelNumber(ch);
    const canOpen = ch.choice !== "skip" && number.length === 10;
    const done = channelDone(ch);
    return (
      <div style={{ border: `1px solid ${done ? c.green : c.border}`, borderRadius: 14, padding: 12, marginTop: 12, background: c.box }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: c.text }}>{icon} {label}</span>
          {done && <span style={{ fontSize: 10, fontWeight: 900, color: c.green, letterSpacing: 1 }}>{ch.choice === "skip" ? "SKIPPED" : "DONE"}</span>}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {savedNumbers.map((n) => (
            <button key={n} type="button" style={chipStyle(ch.choice === n)} onClick={() => setCh({ ...ch, choice: n, opened: false, ticked: false })}>
              {n}
            </button>
          ))}
          <button type="button" style={chipStyle(ch.choice === "typed")} onClick={() => setCh({ ...ch, choice: "typed", opened: false, ticked: false })}>
            Type a number
          </button>
          <button type="button" style={chipStyle(ch.choice === "skip")} onClick={() => setCh({ ...ch, choice: "skip", opened: false, ticked: false })}>
            Skip
          </button>
        </div>

        {ch.choice === "typed" && (
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={ch.typedValue}
            onChange={(e) => setCh({ ...ch, typedValue: e.target.value.replace(/\D/g, "").slice(0, 10), opened: false, ticked: false })}
            style={{ marginTop: 8, width: "100%", boxSizing: "border-box", fontSize: 14, fontWeight: 700, padding: "9px 11px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.card, color: c.text, outline: "none" }}
          />
        )}

        {ch.choice === "skip" ? (
          <p style={{ margin: "10px 0 0", fontSize: 11, fontWeight: 700, color: c.warn }}>
            Skipped - this will be shown to the Super Admin.
          </p>
        ) : (
          <>
            <a
              href={canOpen ? makeLink(number, message) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!canOpen) {
                  e.preventDefault();
                  return;
                }
                setCh({ ...ch, opened: true });
              }}
              style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 12, fontWeight: 900, letterSpacing: 0.5, padding: "11px 12px", borderRadius: 11, textDecoration: "none", background: canOpen ? c.blue : c.disabled, color: canOpen ? "#ffffff" : c.disabledText, pointerEvents: canOpen ? "auto" : "none" }}
            >
              {openLabel}
            </a>
            <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 10, fontSize: 12, fontWeight: 800, color: ch.opened ? c.text : c.disabledText, cursor: ch.opened ? "pointer" : "not-allowed" }}>
              <input
                type="checkbox"
                checked={ch.ticked}
                disabled={!ch.opened}
                onChange={(e) => setCh({ ...ch, ticked: e.target.checked })}
                style={{ width: 20, height: 20, accentColor: c.green }}
              />
              I pressed send
            </label>
          </>
        )}
      </div>
    );
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}
      onClick={() => !confirming && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, maxHeight: "92vh", overflowY: "auto", background: c.card, border: `1px solid ${c.border}`, borderRadius: 20, padding: 16, boxSizing: "border-box" }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: c.text, textTransform: "uppercase", letterSpacing: 0.3 }}>
          Send seizing notice
        </h3>
        <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: c.muted }}>
          {loan?.customerName || "Customer"} {loan?.vehicleNumber ? `· ${loan.vehicleNumber}` : ""}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 700, color: c.muted }}>
          Tell the customer on WhatsApp and SMS first. The message is already typed - just press send in each app, then come back and tick.
        </p>

        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: `1px dashed ${c.border}`, background: c.box, fontSize: 11, lineHeight: 1.5, color: c.muted, whiteSpace: "pre-wrap", maxHeight: 130, overflowY: "auto" }}>
          {message}
        </div>

        {renderStep("1. WhatsApp", "💬", wa, setWa, whatsappLink, "OPEN WHATSAPP")}
        {renderStep("2. SMS", "✉️", sms, setSms, smsLink, "OPEN SMS")}

        {/* Sticky so the final button is always on screen, even on a short phone. */}
        <div style={{ position: "sticky", bottom: -16, background: c.card, margin: "12px -16px -16px", padding: "12px 16px 16px", borderTop: `1px solid ${c.border}` }}>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            style={{ flex: 1, padding: "13px 10px", borderRadius: 12, border: "none", background: c.chip, color: c.chipText, fontSize: 12, fontWeight: 900, letterSpacing: 0.5, cursor: "pointer" }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!allDone || confirming}
            style={{ flex: 2, padding: "13px 10px", borderRadius: 12, border: "none", background: allDone && !confirming ? c.green : c.disabled, color: allDone && !confirming ? c.greenText : c.disabledText, fontSize: 12, fontWeight: 900, letterSpacing: 0.5, cursor: allDone && !confirming ? "pointer" : "not-allowed" }}
          >
            {confirming ? "SAVING..." : "BOTH DONE - MARK FOR SEIZING"}
          </button>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 10, fontWeight: 700, color: c.muted, textAlign: "center" }}>
          Cancel leaves the loan exactly as it is.
        </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SeizingNoticePopup;
