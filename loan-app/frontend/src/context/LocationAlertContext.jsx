"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getToken } from "../utils/auth";
import {
  getUnseenLocationUpdates,
  markLocationUpdateSeen,
  markAllLocationUpdatesSeen,
} from "../services/locationUpdate.service";

// Customer-location alerts. When a customer shares their location through the
// link on their loan, EVERY signed-in person gets:
//   - a red banner over whatever page they are on (this file), with a chime,
//   - the browser tab title flashing if the app is in the background,
//   - a red number on the "Location Updates" menu item,
//   - a phone push (sent by the server, shown by public/sw.js).
// Each person's banner and number are their own: they stay until THAT person
// taps Seen. Nothing here touches the loan pages or the WhatsApp link itself.

const LocationAlertContext = createContext({
  count: 0,
  items: [],
  markSeen: async () => {},
  markAllSeen: async () => {},
  refresh: async () => {},
});

export const useLocationAlerts = () => useContext(LocationAlertContext);

export const loanPathFor = (loanModel, loanId) => {
  const base = {
    Loan: "/admin/loans",
    WeeklyLoan: "/admin/weekly-loans",
    DailyLoan: "/admin/daily-loans",
    InterestLoan: "/admin/interest-loan",
  }[loanModel];
  return base ? `${base}/${loanId}` : "/admin/dashboard";
};

export const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

const IST = "Asia/Kolkata";
export const whenIST = (d) =>
  new Date(d).toLocaleString("en-IN", { timeZone: IST, day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

// Three short beeps. Browsers only allow sound after the person has touched
// the page once; if not allowed yet, this quietly does nothing.
const playChime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    [0, 0.28, 0.56].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.22);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch (err) {
    // No sound - the banner is still there.
  }
};

const Banner = ({ items, count, markSeen }) => {
  const pathname = usePathname();
  // The Location Updates page already lists everything - no banner on it,
  // nor on the login page.
  if (!items.length || pathname === "/admin/location-updates" || pathname === "/admin/login") return null;
  // Only the newest one in full: several tall red cards would cover most of a
  // phone screen and the form being edited. The rest sit behind the chip.
  const shown = items.slice(0, 1);
  const more = count - shown.length;

  return (
    <div
      aria-live="assertive"
      style={{ position: "fixed", top: 72, left: 0, right: 0, zIndex: 9998, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "0 12px", pointerEvents: "none" }}
    >
      {shown.map((u) => (
        <div
          key={u._id}
          role="alert"
          style={{ pointerEvents: "auto", width: "100%", maxWidth: 560, background: "#b91c1c", color: "#fff", borderRadius: 14, padding: "10px 12px", boxShadow: "0 8px 24px rgba(185,28,28,0.45)", border: "1px solid rgba(255,255,255,0.25)" }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.02em" }}>📍 Customer location updated</div>
          <div style={{ fontSize: 12, marginTop: 2, opacity: 0.95 }}>
            Loan {u.loanNumber || "-"} · {u.customerName || "-"} · {whenIST(u.at)}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => window.open(mapsLink(u.lat, u.lng), "_blank", "noopener,noreferrer")}
              style={{ fontSize: 11, fontWeight: 800, padding: "6px 10px", borderRadius: 8, border: "none", background: "#fff", color: "#b91c1c", cursor: "pointer" }}
            >
              Open map
            </button>
            <Link
              href={loanPathFor(u.loanModel, u.loanId)}
              style={{ fontSize: 11, fontWeight: 800, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.2)", color: "#fff", textDecoration: "none" }}
            >
              Open loan
            </Link>
            <button
              type="button"
              onClick={() => markSeen(u._id)}
              style={{ fontSize: 11, fontWeight: 800, padding: "6px 10px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer" }}
            >
              Seen
            </button>
          </div>
        </div>
      ))}
      {more > 0 && (
        <Link
          href="/admin/location-updates"
          style={{ pointerEvents: "auto", fontSize: 11, fontWeight: 800, background: "#7f1d1d", color: "#fff", borderRadius: 999, padding: "5px 12px", textDecoration: "none" }}
        >
          +{more} more - see all
        </Link>
      )}
    </div>
  );
};

export const LocationAlertProvider = ({ children }) => {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const knownIds = useRef(null); // null until the first load, so opening the app never chimes
  const titleRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await getUnseenLocationUpdates();
      const data = res.data || { count: 0, items: [] };
      const ids = new Set(data.items.map((i) => String(i._id)));
      if (knownIds.current && data.items.some((i) => !knownIds.current.has(String(i._id)))) playChime();
      knownIds.current = ids;
      setCount(data.count);
      setItems(data.items);
    } catch (err) {
      // Backend asleep or offline - try again on the next event / focus.
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  // A customer just shared (live event from NotificationContext's socket), or
  // the person came back to this tab/app: look again.
  useEffect(() => {
    const onEvent = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("location-updated", onEvent);
    window.addEventListener("focus", onEvent);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("location-updated", onEvent);
      window.removeEventListener("focus", onEvent);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Flash the browser tab title while the app is in the background and
  // something is unseen.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (titleRef.current === null) titleRef.current = document.title;
    if (!count) {
      document.title = titleRef.current;
      return;
    }
    let on = false;
    const timer = setInterval(() => {
      if (document.hidden) {
        on = !on;
        document.title = on ? `(${count}) 📍 Location updated` : titleRef.current;
      } else {
        document.title = titleRef.current;
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      document.title = titleRef.current;
    };
  }, [count]);

  const markSeen = useCallback(
    async (id) => {
      setItems((prev) => prev.filter((i) => String(i._id) !== String(id)));
      setCount((prev) => Math.max(0, prev - 1));
      try {
        await markLocationUpdateSeen(id);
      } catch (err) {
        refresh();
      }
    },
    [refresh],
  );

  const markAllSeen = useCallback(async () => {
    setItems([]);
    setCount(0);
    try {
      await markAllLocationUpdatesSeen();
    } catch (err) {
      refresh();
    }
  }, [refresh]);

  return (
    <LocationAlertContext.Provider value={{ count, items, markSeen, markAllSeen, refresh }}>
      {children}
      <Banner items={items} count={count} markSeen={markSeen} />
    </LocationAlertContext.Provider>
  );
};
