"use client";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "../context/ToastContext";
import { useUI } from "../context/UIContext";
import { sendLocationLinkToCustomer } from "../services/location.service";
import { getLoanLocationHistory } from "../services/locationUpdate.service";

// Small discreet control pair shown on every loan's view/edit page:
//   - "Customer location" opens the last-shared coordinates in Google Maps
//     (just the coordinates, no reverse-geocoded address - Karthik's
//     explicit ask, keeps this free).
//   - "Send link to customer" fires the WhatsApp message on demand -
//     manual only, by Karthik's explicit choice (2026-08-13): no automatic
//     sending at loan creation or on any schedule, he wants control over
//     when it goes out.
const CustomerLocationPanel = ({ lat, lng, lastLocationAt, loanModel, loanId }) => {
  const { showToast } = useToast();
  const { isDarkMode } = useUI();
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const hasLocation = typeof lat === "number" && typeof lng === "number";

  // Every time this customer shared their location (newest first). Opened on
  // demand, visible to everyone.
  const openHistory = async () => {
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const res = await getLoanLocationHistory(loanModel, loanId);
      setHistory(res.data?.items || []);
    } catch (err) {
      setHistory([]);
      showToast(err.message || "Could not load the location history", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const hc = isDarkMode
    ? { card: "#1e293b", border: "rgba(255,255,255,0.12)", text: "#f1f5f9", muted: "#94a3b8", btnBg: "rgba(59,130,246,0.2)", btnText: "#93c5fd", ok: "#34d399" }
    : { card: "#ffffff", border: "#e2e8f0", text: "#0f172a", muted: "#64748b", btnBg: "#eff6ff", btnText: "#2563eb", ok: "#059669" };

  const openMap = () => {
    if (!hasLocation) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank", "noopener,noreferrer");
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await sendLocationLinkToCustomer(loanModel, loanId);
      showToast("Location link sent to customer", "success");
    } catch (err) {
      showToast(err.message || "Could not send the link", "error");
    } finally {
      setSending(false);
    }
  };

  const lastUpdatedText = lastLocationAt
    ? new Date(lastLocationAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <>
      <div className="customer-location-panel flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openMap}
          disabled={!hasLocation}
          className={`customer-location-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${
            hasLocation
              ? "text-slate-500 border-slate-200 hover:bg-slate-50 cursor-pointer"
              : "text-slate-300 border-slate-100 cursor-not-allowed"
          }`}
          title={hasLocation ? "Open last shared location in Google Maps" : "Customer has not shared a location yet"}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Customer location
        </button>

        <button
          type="button"
          onClick={openHistory}
          className="customer-location-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors text-slate-500 border-slate-200 hover:bg-slate-50 cursor-pointer"
          title="Every time this customer shared their location"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          Location history
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="customer-location-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border text-slate-500 border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
          </svg>
          {sending ? "Sending..." : "Send link to customer"}
        </button>

        {lastUpdatedText && (
          <span className="customer-location-updated text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Last updated {lastUpdatedText}
          </span>
        )}
      </div>

      {showHistory &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={() => setShowHistory(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 440, maxHeight: "80vh", overflowY: "auto", background: hc.card, border: `1px solid ${hc.border}`, borderRadius: 18, padding: 16 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: hc.text }}>Location history</h3>
                <button type="button" onClick={() => setShowHistory(false)} style={{ fontSize: 11, fontWeight: 800, color: hc.muted, background: "transparent", border: "none", cursor: "pointer" }}>
                  Close
                </button>
              </div>
              {historyLoading ? (
                <p style={{ fontSize: 12, color: hc.muted }}>Loading...</p>
              ) : history.length === 0 ? (
                <p style={{ fontSize: 12, color: hc.muted }}>This customer has not shared a location yet.</p>
              ) : (
                history.map((h, i) => (
                  <div key={h._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 0", borderTop: i ? `1px solid ${hc.border}` : "none" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: hc.text }}>
                        {new Date(h.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                        {i === 0 && <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 900, color: hc.ok }}>LATEST</span>}
                      </div>
                      <div style={{ fontSize: 11, color: hc.muted, marginTop: 2 }}>
                        {Number(h.lat).toFixed(5)}, {Number(h.lng).toFixed(5)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.open(`https://www.google.com/maps?q=${h.lat},${h.lng}`, "_blank", "noopener,noreferrer")}
                      style={{ fontSize: 11, fontWeight: 800, padding: "7px 12px", borderRadius: 10, border: "none", background: hc.btnBg, color: hc.btnText, cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      Open map
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}

      <style jsx global>{`
        .loan-view-dark-mode .customer-location-btn,
        .weekly-loan-view-dark-mode .customer-location-btn,
        .daily-loan-view-dark-mode .customer-location-btn,
        .interest-loan-view-dark-mode .customer-location-btn,
        .loan-edit-dark-mode .customer-location-btn,
        .weekly-loan-edit-dark-mode .customer-location-btn,
        .daily-loan-edit-dark-mode .customer-location-btn,
        .interest-loan-edit-dark-mode .customer-location-btn {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .loan-view-dark-mode .customer-location-updated,
        .weekly-loan-view-dark-mode .customer-location-updated,
        .daily-loan-view-dark-mode .customer-location-updated,
        .interest-loan-view-dark-mode .customer-location-updated,
        .loan-edit-dark-mode .customer-location-updated,
        .weekly-loan-edit-dark-mode .customer-location-updated,
        .daily-loan-edit-dark-mode .customer-location-updated,
        .interest-loan-edit-dark-mode .customer-location-updated {
          color: #94a3b8 !important;
        }
      `}</style>
    </>
  );
};

export default CustomerLocationPanel;
