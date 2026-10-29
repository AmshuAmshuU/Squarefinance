"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { useUI } from "../../../context/UIContext";
import { useLocationAlerts, loanPathFor, mapsLink, whenIST } from "../../../context/LocationAlertContext";
import { getLocationUpdates } from "../../../services/locationUpdate.service";

// Every time a customer shared their location, newest first, with who has and
// has not seen each one. Each person's own "NEW" marks and red menu number
// clear when THEY mark it seen.
const LocationUpdatesPage = () => {
  const { isDarkMode, theme } = useUI();
  const { count, markSeen, markAllSeen } = useLocationAlerts();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState("");

  const c = isDarkMode
    ? { bg: "#0f172a", card: theme !== "default" ? "rgba(30,41,59,0.6)" : "#1e293b", border: "rgba(255,255,255,0.1)", text: "#f1f5f9", muted: "#94a3b8", newBg: "rgba(220,38,38,0.15)", newBorder: "#ef4444", ok: "#34d399", warn: "#fbbf24", btnBg: "rgba(59,130,246,0.2)", btnText: "#93c5fd", btnBorder: "rgba(255,255,255,0.18)" }
    : { bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0", text: "#0f172a", muted: "#64748b", newBg: "#fef2f2", newBorder: "#ef4444", ok: "#059669", warn: "#d97706", btnBg: "#eff6ff", btnText: "#2563eb", btnBorder: "#cbd5e1" };

  const load = useCallback(async (p) => {
    try {
      const res = await getLocationUpdates(p, 30);
      setItems(res.data.items);
      setPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load location updates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  useEffect(() => {
    setHighlight(new URLSearchParams(window.location.search).get("highlight") || "");
    const onNew = () => load(1);
    window.addEventListener("location-updated", onNew);
    return () => window.removeEventListener("location-updated", onNew);
  }, [load]);

  useEffect(() => {
    if (!highlight || loading) return;
    const el = document.getElementById(`lu-${highlight}`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight, loading, items]);

  const seen = async (id) => {
    setItems((prev) => prev.map((u) => (u._id === id ? { ...u, seenByMe: true } : u)));
    await markSeen(id);
    load(page);
  };
  const seenAll = async () => {
    await markAllSeen();
    load(page);
  };

  const btn = (extra = {}) => ({ fontSize: 11, fontWeight: 800, padding: "7px 12px", borderRadius: 10, border: `1px solid ${c.btnBorder}`, background: "transparent", color: c.text, cursor: "pointer", textDecoration: "none", display: "inline-block", ...extra });

  return (
    <AuthGuard>
      <div className="min-h-screen flex" style={{ background: c.bg }}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-6 px-4 sm:px-8" style={{ maxWidth: 820, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: c.text }}>📍 Location Updates</h1>
                <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: c.muted }}>
                  Every time a customer shared their location
                </p>
              </div>
              {count > 0 && (
                <button type="button" onClick={seenAll} style={btn({ background: c.btnBg, color: c.btnText, border: "1px solid transparent" })}>
                  Mark all {count} as seen
                </button>
              )}
            </div>

            {loading ? (
              <p style={{ color: c.muted, fontSize: 13 }}>Loading...</p>
            ) : error ? (
              <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>
            ) : items.length === 0 ? (
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, textAlign: "center", color: c.muted, fontSize: 13 }}>
                No customer has shared a location yet.
              </div>
            ) : (
              items.map((u) => {
                const isNew = !u.seenByMe;
                return (
                  <div
                    key={u._id}
                    id={`lu-${u._id}`}
                    style={{ background: isNew ? c.newBg : c.card, border: `1px solid ${isNew ? c.newBorder : c.border}`, borderRadius: 16, padding: "12px 14px", marginBottom: 10, outline: highlight === u._id ? "2px solid #2563eb" : "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Link href={loanPathFor(u.loanModel, u.loanId)} style={{ fontSize: 14, fontWeight: 900, color: c.btnText, textDecoration: "none" }}>
                        {u.loanNumber || "-"}
                      </Link>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{u.customerName || "-"}</span>
                      {isNew && <span style={{ fontSize: 9, fontWeight: 900, color: "#fff", background: "#dc2626", borderRadius: 6, padding: "2px 7px" }}>NEW</span>}
                      {u.backfilled && <span style={{ fontSize: 9, fontWeight: 800, color: c.muted, border: `1px solid ${c.border}`, borderRadius: 6, padding: "2px 7px" }}>BEFORE ALERTS STARTED</span>}
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: c.muted }}>{whenIST(u.at)}</p>
                    {!u.backfilled && (
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: c.muted }}>
                        {u.seenBy.length > 0 && <span style={{ color: c.ok }}>Seen by {u.seenBy.map((s) => s.name).join(", ")}. </span>}
                        {u.notSeenBy.length > 0 && <span style={{ color: c.warn }}>Not seen by: {u.notSeenBy.join(", ")}</span>}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => window.open(mapsLink(u.lat, u.lng), "_blank", "noopener,noreferrer")} style={btn({ background: c.btnBg, color: c.btnText, border: "1px solid transparent" })}>
                        Open map
                      </button>
                      <Link href={loanPathFor(u.loanModel, u.loanId)} style={btn()}>
                        Open loan
                      </Link>
                      {isNew && (
                        <button type="button" onClick={() => seen(u._id)} style={btn()}>
                          Mark seen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {pages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 }}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={btn({ opacity: page <= 1 ? 0.4 : 1 })}>
                  Newer
                </button>
                <span style={{ fontSize: 12, color: c.muted }}>
                  Page {page} of {pages} ({total} updates)
                </span>
                <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={btn({ opacity: page >= pages ? 0.4 : 1 })}>
                  Older
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default LocationUpdatesPage;
