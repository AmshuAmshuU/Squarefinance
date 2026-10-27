"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";
import { isAuthenticated, getUser } from "../utils/auth";
import { refreshSession } from "../services/api";
import { pingDevice } from "../services/device.service";
import { useUI } from "../context/UIContext";

// Runs quietly in the background of every admin page. Each time the app is
// opened (or comes back to the front, or every 10 minutes while open) it tells
// the server "this device is here", with the exact location if the person has
// allowed it. The browser's own location prompt is shown only once per device,
// after a short explanation. Nothing here blocks or changes how the app is used.

const ASKED_KEY = "sf_location_asked_v1";
const LAST_PING_KEY = "sf_device_last_ping";
const MIN_GAP_MS = 5 * 60 * 1000; // never ping more often than this
const POLL_MS = 10 * 60 * 1000; // while the app stays open in the foreground

const readPosition = () =>
  new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ status: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          status: "granted",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => resolve({ status: err && err.code === 1 ? "denied" : "unknown" }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });

const isInstalledApp = () => {
  try {
    return (
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
};

// remembered per login (device id), so a fresh login always sends its first update
const readLastPing = () => {
  try {
    return JSON.parse(localStorage.getItem(LAST_PING_KEY) || "null");
  } catch {
    return null;
  }
};

const permissionState = async () => {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const p = await navigator.permissions.query({ name: "geolocation" });
      return p.state; // "granted" | "denied" | "prompt"
    }
  } catch {
    /* some browsers don't support this query */
  }
  return "unknown";
};

const DeviceLocationPinger = () => {
  const pathname = usePathname();
  const { isDarkMode } = useUI();
  const [showAsk, setShowAsk] = useState(false);
  const busy = useRef(false);

  const send = useCallback(async (loc) => {
    try {
      await pingDevice({ ...loc, standalone: isInstalledApp() });
      const me = getUser();
      localStorage.setItem(LAST_PING_KEY, JSON.stringify({ sid: me && me.sid, at: Date.now() }));
    } catch {
      /* quiet by design */
    }
  }, []);

  const run = useCallback(async () => {
    if (busy.current || typeof window === "undefined") return;
    if (!isAuthenticated()) return;
    const last = readLastPing();
    const current = getUser();
    if (last && current && current.sid && last.sid === current.sid && Date.now() - last.at < MIN_GAP_MS) return;

    busy.current = true;
    try {
      // A login made before this feature has no device id yet: renew it once
      // (no re-login needed) so this device starts showing up.
      const me = getUser();
      if (!me || !me.sid) {
        const ok = await refreshSession();
        if (!ok) return;
      }

      const state = await permissionState();
      const asked = localStorage.getItem(ASKED_KEY) === "1";

      if (state === "granted") {
        await send(await readPosition());
      } else if (state === "denied") {
        await send({ status: "denied" });
      } else if (!asked) {
        // first time on this device: explain, then let the browser ask
        await send({ status: "unknown" });
        setShowAsk(true);
      } else if (state === "unknown") {
        // browser can't tell us the state; try quietly (it may re-ask on some phones)
        await send(await readPosition());
      } else {
        await send({ status: "skipped" });
      }
    } catch {
      /* quiet by design */
    } finally {
      busy.current = false;
    }
  }, [send]);

  // after login / on every page change (throttled inside run)
  useEffect(() => {
    run();
  }, [pathname, run]);

  // coming back to the app, and a slow heartbeat while it stays open
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [run]);

  const allow = async () => {
    localStorage.setItem(ASKED_KEY, "1");
    setShowAsk(false);
    await send(await readPosition()); // this triggers the browser's own prompt
  };

  const notNow = async () => {
    localStorage.setItem(ASKED_KEY, "1");
    setShowAsk(false);
    await send({ status: "skipped" });
  };

  if (!showAsk) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-3xl shadow-2xl p-7 text-center ${
          isDarkMode ? "bg-slate-800 text-slate-100" : "bg-white text-slate-900"
        }`}
      >
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
          }`}
        >
          <MapPin className="w-7 h-7 text-blue-500" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-tight mb-2">Allow location?</h3>
        <p className={`text-sm font-medium mb-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
          We save where this device is each time you open the app, for account security.
        </p>
        <div className="flex gap-3">
          <button
            onClick={notNow}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              isDarkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Not now
          </button>
          <button
            onClick={allow}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceLocationPinger;
