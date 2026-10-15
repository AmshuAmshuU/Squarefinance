"use client";
import React from "react";
import { useUI } from "../context/UIContext";

// Proof that the customer was sent the "For Seizing" notice: who, when, which
// number, which channel (or skipped). Shown at the bottom of the Vehicle loan
// page (just above Return on Investment) and on the Super Admin's approval
// card. Renders nothing when no notice has been recorded.

const when = (d) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

const channelText = (label, ch) => {
  if (!ch) return `${label}: -`;
  if (ch.status === "skipped") return `${label}: skipped`;
  return `${label}: ${ch.number}${ch.typed ? " (typed)" : ""}`;
};

export const SeizingNoticeLine = ({ notice, color }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color, lineHeight: 1.5 }}>
    <span style={{ fontWeight: 900 }}>{notice.sentByName || "Staff"}</span>
    {notice.sentAt ? ` · ${when(notice.sentAt)}` : ""}
    <br />
    {channelText("WhatsApp", notice.whatsapp)} &nbsp;|&nbsp; {channelText("SMS", notice.sms)}
  </div>
);

const SeizingNoticeRecord = ({ notices }) => {
  const { isDarkMode } = useUI();
  if (!Array.isArray(notices) || notices.length === 0) return null;

  const c = isDarkMode
    ? { border: "rgba(255,255,255,0.12)", head: "#94a3b8", text: "#e2e8f0", ok: "#34d399", box: "#0f172a" }
    : { border: "#e2e8f0", head: "#64748b", text: "#334155", ok: "#059669", box: "#f8fafc" };
  const ordered = [...notices].reverse(); // newest first

  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${c.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: c.ok, marginBottom: 10 }}>
        ✓ Seizing notice sent to customer
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ordered.map((n, i) => (
          <div key={`${n.sentAt}-${i}`} style={{ border: `1px solid ${c.border}`, background: c.box, borderRadius: 12, padding: "9px 12px" }}>
            <SeizingNoticeLine notice={n} color={c.text} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeizingNoticeRecord;
