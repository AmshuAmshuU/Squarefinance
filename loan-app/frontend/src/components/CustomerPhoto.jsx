"use client";
import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { getPhoto, setPhoto, deletePhoto } from "../services/photo.service";
import PhotoCaptureFlow from "./PhotoCaptureFlow";
import { useToast } from "../context/ToastContext";
import { useUI } from "../context/UIContext";

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

const Silhouette = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);

// The 2cm customer photo in the locked top bar. Tap: opens the full photo with
// Change / Delete (or, when there is no photo yet, goes straight to adding one).
// Super Admin's changes apply at once; anyone else's go for approval.
const CustomerPhoto = ({ loanModel, loanId }) => {
  const { isDarkMode } = useUI();
  const { showToast } = useToast();
  const [info, setInfo] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!loanId) return;
    try {
      const res = await getPhoto(loanModel, loanId);
      setInfo(res.data);
    } catch {
      setInfo(null); // keep the placeholder; nothing else on the page depends on this
    }
  }, [loanModel, loanId]);

  useEffect(() => {
    setInfo(null);
    load();
  }, [load]);

  const afterChange = async (res, doneMsg) => {
    const applied = res?.data?.applied;
    showToast(applied ? doneMsg : res?.message || "Sent to Super Admin for approval", applied ? "success" : "info");
    await load();
  };

  const handleNewPhoto = async (blob) => {
    const res = await setPhoto(loanModel, loanId, blob);
    await afterChange(res, "Photo saved");
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const res = await deletePhoto(loanModel, loanId);
      setDialogOpen(false);
      setConfirmDelete(false);
      await afterChange(res, "Photo deleted");
    } catch (err) {
      showToast(err.message || "Could not delete the photo", "error");
    } finally {
      setBusy(false);
    }
  };

  const onTap = () => {
    if (info?.hasPhoto) setDialogOpen(true);
    else if (info?.canChange && !info?.pending) setCaptureOpen(true);
    else if (info?.pending) showToast("A photo request is waiting for approval", "info");
    else showToast("No photo added yet", "info");
  };

  const boxLook = isDarkMode ? "bg-slate-700 border-white/10 text-slate-400" : "bg-slate-200 border-slate-300 text-slate-400";
  const card = isDarkMode ? "bg-slate-800 border-white/10 text-slate-100" : "bg-white border-slate-100 text-slate-900";
  const sub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const quietBtn = isDarkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200";

  return (
    <>
      <button
        type="button"
        onClick={onTap}
        aria-label="Customer photo"
        className={`relative w-[76px] h-[76px] rounded-xl border flex items-center justify-center overflow-hidden ${boxLook}`}
      >
        {info?.thumbUrl ? <img src={info.thumbUrl} alt="Customer" className="w-full h-full object-cover" /> : <Silhouette />}
        {info?.pending && (
          <span className="absolute bottom-0 inset-x-0 text-[8px] font-black uppercase tracking-wider text-center py-0.5 bg-amber-400 text-amber-950">Pending</span>
        )}
        {!info?.hasPhoto && info?.canChange && !info?.pending && (
          <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-primary text-white text-sm font-black leading-5 text-center">+</span>
        )}
      </button>

      {dialogOpen &&
        createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={() => !busy && setDialogOpen(false)}>
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl border p-5 ${card}`} onClick={(e) => e.stopPropagation()}>
            {info?.fullUrl && <img src={info.fullUrl} alt="Customer" className="w-full max-h-[62vh] object-contain rounded-2xl bg-black/5" />}
            <p className={`text-xs font-semibold mt-3 ${sub}`}>
              {info?.uploadedByName ? `Added by ${info.uploadedByName}` : "Added"}
              {info?.uploadedAt ? ` on ${fmt(info.uploadedAt)}` : ""}
            </p>
            {info?.pending && (
              <p className="mt-2 text-xs font-bold text-amber-600">
                {info.pending.requestedByName ? `${info.pending.requestedByName} asked to ` : "A request to "}
                {info.pending.action === "delete" ? "delete" : "change"} this photo - waiting for Super Admin approval.
              </p>
            )}
            {confirmDelete ? (
              <div className="mt-4">
                <p className="text-sm font-black mb-3">Delete this photo?</p>
                <div className="flex gap-3">
                  <button type="button" onClick={handleDelete} disabled={busy} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-600 disabled:opacity-50">
                    {busy ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest ${quietBtn}`}>
                    No
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-3">
                {info?.canChange && !info?.pending && (
                  <>
                    <button type="button" onClick={() => { setDialogOpen(false); setCaptureOpen(true); }} className="flex-1 py-3 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700">
                      Change
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(true)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest ${isDarkMode ? "bg-red-500/15 text-red-300 hover:bg-red-500/25" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                      Delete
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setDialogOpen(false)} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest ${quietBtn}`}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {captureOpen && <PhotoCaptureFlow onClose={() => setCaptureOpen(false)} onPhoto={handleNewPhoto} />}
    </>
  );
};

export default CustomerPhoto;
