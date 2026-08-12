"use client";
import React, { useState } from "react";
import { useToast } from "../context/ToastContext";
import { sendLocationLinkToCustomer } from "../services/location.service";

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
  const [sending, setSending] = useState(false);
  const hasLocation = typeof lat === "number" && typeof lng === "number";

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
