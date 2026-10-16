import { useEffect, useRef } from "react";

// "Back" on a loan page returns to the exact page the user came from, with the
// list as they left it (search, filters, page and scroll position).
//
// - NavTracker (components/NavTracker.jsx) remembers the last page that was NOT
//   a loan's own page, in sessionStorage (per browser tab). That is the
//   "came from" page, query string included.
// - Back goes there (falling back to the loan type's main list when there is
//   none, e.g. the loan was opened in a new tab).
// - Lists keep a snapshot of their own state; Back flags the list it is about
//   to open so it picks that snapshot up. A list opened any other way (sidebar,
//   a link) starts fresh, as before.
// Everything here is wrapped in try/catch: storage can be unavailable, and
// navigation must still work without it.

const ORIGIN_KEY = "sf_back_origin";
const RESTORE_KEY = "sf_restore_list";
const snapKey = (key) => `sf_list_${key}`;
const scrollKey = (key) => `sf_list_scroll_${key}`;

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const LOAN_ROOTS = ["loans", "weekly-loans", "daily-loans", "interest-loan"];

// /admin/loans/<id>, /admin/loans/edit/<id> (and the weekly/daily/interest equivalents)
export const isLoanDetailPath = (pathname) => {
  const seg = (pathname || "").split("/").filter(Boolean);
  if (seg[0] !== "admin" || !LOAN_ROOTS.includes(seg[1])) return false;
  if (seg.length === 3) return OBJECT_ID.test(seg[2]);
  if (seg.length === 4 && seg[2] === "edit") return OBJECT_ID.test(seg[3]);
  return false;
};

export const rememberOrigin = (url) => {
  try {
    sessionStorage.setItem(ORIGIN_KEY, url);
  } catch {}
};

const pathOf = (url) => String(url || "").split("?")[0];

// Where Back should go: the page the user came from, else `fallback`.
// Also flags that page so a list there restores its own state.
export const prepareBack = (fallback) => {
  let target = fallback;
  try {
    const origin = sessionStorage.getItem(ORIGIN_KEY);
    if (origin && !isLoanDetailPath(pathOf(origin))) target = origin;
    sessionStorage.setItem(RESTORE_KEY, pathOf(target));
  } catch {}
  return target;
};

// The list's saved state - only when this page was just opened by Back.
export const readSnapshot = (key) => {
  try {
    if (typeof window === "undefined") return null;
    if (sessionStorage.getItem(RESTORE_KEY) !== key) return null;
    return JSON.parse(sessionStorage.getItem(snapKey(key)));
  } catch {
    return null;
  }
};

// Call from a list page. `key` = the list's own route (e.g. "/admin/loans"),
// `snapshot` = a plain object of what should survive (search, filters, page),
// `ready` = true once the list has finished loading (scroll is restored then).
export const useListMemory = (key, snapshot, ready) => {
  const pendingScroll = useRef(undefined);
  if (pendingScroll.current === undefined) {
    let y = null;
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(RESTORE_KEY) === key) {
        y = Number(sessionStorage.getItem(scrollKey(key))) || 0;
      }
    } catch {}
    pendingScroll.current = y;
  }

  // The restore flag has done its job once the page is open.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(RESTORE_KEY) === key) sessionStorage.removeItem(RESTORE_KEY);
    } catch {}
  }, [key]);

  const serialized = JSON.stringify(snapshot);
  useEffect(() => {
    try {
      sessionStorage.setItem(snapKey(key), serialized);
    } catch {}
  }, [key, serialized]);

  // Scroll position: remembered while scrolling (not while a restore is pending).
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (pendingScroll.current !== null || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        try {
          sessionStorage.setItem(scrollKey(key), String(window.scrollY));
        } catch {}
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [key]);

  useEffect(() => {
    if (!ready || pendingScroll.current === null) return;
    const y = pendingScroll.current;
    pendingScroll.current = null;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [ready]);
};
