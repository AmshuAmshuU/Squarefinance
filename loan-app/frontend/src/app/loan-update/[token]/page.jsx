"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Logo from "../../../components/Logo";
import {
  getLoanByLocationToken,
  updateLoanLocation,
} from "../../../services/location.service";

// Public page opened from the permanent WhatsApp link - no login, no admin
// chrome. Deliberately minimal: one screen, one action.
const STATE = {
  LOADING: "loading",
  INVALID: "invalid",
  READY: "ready",
  REQUESTING: "requesting",
  SUCCESS: "success",
  DENIED: "denied",
  ERROR: "error",
};

const LoanUpdatePage = () => {
  const { token } = useParams();
  const [state, setState] = useState(STATE.LOADING);
  const [loan, setLoan] = useState(null);
  const resolvedRef = useRef(false);

  const handleUpdate = () => {
    if (!navigator.geolocation) {
      setState(STATE.ERROR);
      return;
    }
    setState(STATE.REQUESTING);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        resolvedRef.current = true;
        try {
          await updateLoanLocation(
            token,
            position.coords.latitude,
            position.coords.longitude
          );
          setState(STATE.SUCCESS);
        } catch {
          setState(STATE.ERROR);
        }
      },
      (err) => {
        resolvedRef.current = true;
        setState(err.code === err.PERMISSION_DENIED ? STATE.DENIED : STATE.ERROR);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => {
    if (!token) return;
    getLoanByLocationToken(token)
      .then((data) => {
        setLoan(data);
        setState(STATE.READY);
        // Try automatically - most phone browsers allow a location prompt
        // on page load without a prior tap, so this skips the extra "OK"
        // click for most people. If a browser silently blocks it (no
        // gesture), neither callback above fires, so fall back to showing
        // the manual OK button after a short wait.
        resolvedRef.current = false;
        handleUpdate();
        setTimeout(() => {
          if (!resolvedRef.current) {
            setState(STATE.READY);
          }
        }, 3000);
      })
      .catch(() => setState(STATE.INVALID));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="flex justify-center mb-5">
          <Logo size="sm" />
        </div>

        {state === STATE.LOADING && (
          <p className="text-sm text-slate-400 font-semibold">Loading...</p>
        )}

        {state === STATE.INVALID && (
          <p className="text-sm text-slate-500 font-semibold">
            This link is no longer valid.
          </p>
        )}

        {state === STATE.READY && (
          <>
            <p className="text-base font-bold text-slate-800 mb-6 leading-snug">
              Update loan number {loan?.loanNumber}, {loan?.customerName}
            </p>
            <button
              onClick={handleUpdate}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              OK
            </button>
          </>
        )}

        {state === STATE.REQUESTING && (
          <p className="text-sm text-slate-400 font-semibold">Updating...</p>
        )}

        {state === STATE.SUCCESS && (
          <p className="text-base font-bold text-emerald-600">Loan updated.</p>
        )}

        {(state === STATE.DENIED || state === STATE.ERROR) && (
          <>
            <p className="text-sm text-slate-500 font-semibold mb-5 leading-snug">
              {state === STATE.DENIED
                ? "Location permission was not given. Please allow location access and try again."
                : "Something went wrong. Please try again."}
            </p>
            <button
              onClick={handleUpdate}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoanUpdatePage;
