"use client";
import React, { useState } from "react";
import { MapPin } from "lucide-react";
import { useUI } from "../context/UIContext";
import { getUserFromToken } from "../utils/auth";

// The customer's HOUSE location on Google Maps, kept on the loan right under
// the address. Staff either paste a Google Maps link (copied from Google Maps,
// or from a WhatsApp / SMS the customer sent) or tap "Use my current location"
// while standing at the house. Unrelated to the "Customer location" panel the
// customer fills by tapping a WhatsApp link - that one is untouched.
//
// value    : { link, savedBy, savedAt } | null/undefined
// onChange : (newValue | null) => void   (omit, or readOnly, for view-only)

const COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

// Same rule the server applies - only https Google Maps links are ever turned
// into a clickable button.
export const isSafeMapsLink = (raw) => {
  let url;
  try {
    url = new URL(String(raw || "").trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "maps.app.goo.gl") return true;
  if (/^maps\.google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return true;
  if (host === "goo.gl" || host === "www.goo.gl") return url.pathname.startsWith("/maps");
  if (/(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return url.pathname.startsWith("/maps");
  return false;
};

const coordsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

// "12.97, 77.59" or a Maps link -> a clean link, or null if it is neither.
const parseInput = (text) => {
  const t = String(text || "").trim();
  if (!t) return null;
  const m = t.match(COORDS);
  if (m) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? coordsLink(lat, lng) : null;
  }
  return isSafeMapsLink(t) ? t : null;
};

// A short readable label for the saved link: coordinates when they are in it.
const describeLink = (link) => {
  const m = String(link).match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) || String(link).match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) return `${parseFloat(m[1]).toFixed(5)}, ${parseFloat(m[2]).toFixed(5)}`;
  return "Google Maps link";
};

const whenText = (value) => {
  const parts = [];
  if (value?.savedBy) parts.push(value.savedBy);
  if (value?.savedAt) {
    const d = new Date(value.savedAt);
    if (!isNaN(d)) parts.push(d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }));
  }
  return parts.join(" · ");
};

const HouseLocationCard = ({ value, onChange, readOnly = false }) => {
  const { isDarkMode } = useUI();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  const editable = !readOnly && typeof onChange === "function";
  const hasValue = !!value?.link && isSafeMapsLink(value.link);

  const c = isDarkMode
    ? { bg: "#1e293b", border: "rgba(255,255,255,0.12)", label: "#94a3b8", text: "#f1f5f9", muted: "#94a3b8", inputBg: "#0f172a", inputBorder: "rgba(255,255,255,0.18)", ok: "#34d399", btnBg: "rgba(59,130,246,0.2)", btnText: "#93c5fd", err: "#f87171" }
    : { bg: "#f8fafc", border: "#e2e8f0", label: "#94a3b8", text: "#0f172a", muted: "#64748b", inputBg: "#ffffff", inputBorder: "#cbd5e1", ok: "#059669", btnBg: "#eff6ff", btnText: "#2563eb", err: "#dc2626" };

  const stamp = (link) => ({
    link,
    savedBy: getUserFromToken()?.name || "",
    savedAt: new Date().toISOString(),
  });

  const save = () => {
    const link = parseInput(text);
    if (!link) {
      setError("That is not a Google Maps link or coordinates. Copy the link from Google Maps, WhatsApp or SMS and paste it here.");
      return;
    }
    setError("");
    setText("");
    onChange(stamp(link));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("This phone or browser can't share its location.");
      return;
    }
    setError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange(stamp(coordsLink(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6))));
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === 1
            ? "Location permission was refused. Allow location for this site in the browser settings and try again."
            : "Couldn't get the location. Move to an open spot and try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const openMap = () => window.open(value.link, "_blank", "noopener,noreferrer");

  const btn = (extra = {}) => ({
    fontSize: 11,
    fontWeight: 800,
    padding: "7px 12px",
    borderRadius: 10,
    border: `1px solid ${c.inputBorder}`,
    background: "transparent",
    color: c.text,
    cursor: "pointer",
    whiteSpace: "nowrap",
    ...extra,
  });

  return (
    <div className="house-location-card" style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <MapPin size={12} color={c.label} />
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: c.label }}>House location</span>
      </div>

      {hasValue ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: c.ok }}>Location saved</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: c.muted }}>
              {describeLink(value.link)}
              {whenText(value) ? ` - ${whenText(value)}` : ""}
            </p>
          </div>
          <button type="button" onClick={openMap} style={btn({ background: c.btnBg, color: c.btnText, border: "1px solid transparent" })}>
            Open in Maps
          </button>
          {editable && (
            <button type="button" onClick={() => onChange(null)} style={btn({ color: c.err })}>
              Remove
            </button>
          )}
        </div>
      ) : editable ? (
        <div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="Paste a Google Maps link"
              style={{ flex: 1, minWidth: 0, fontSize: 13, padding: "8px 10px", borderRadius: 10, border: `1px solid ${c.inputBorder}`, background: c.inputBg, color: c.text, outline: "none" }}
            />
            <button type="button" onClick={save} style={btn({ background: c.btnBg, color: c.btnText, border: "1px solid transparent" })}>
              Save
            </button>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: c.muted, textAlign: "center" }}>or, if you are at the house</p>
          <button type="button" onClick={useMyLocation} disabled={locating} style={btn({ width: "100%", marginTop: 6, opacity: locating ? 0.6 : 1 })}>
            {locating ? "Finding you..." : "Use my current location"}
          </button>
          {error && <p style={{ margin: "8px 0 0", fontSize: 11, color: c.err }}>{error}</p>}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: c.muted }}>Not added</p>
      )}
    </div>
  );
};

export default HouseLocationCard;
