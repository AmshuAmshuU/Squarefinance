"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import { useUI } from "../context/UIContext";
import { PASSPORT_ASPECT, prepareForFraming, cropAndCompress } from "../utils/photoCompress";

// Take a photo with the phone camera (or pick one from the gallery), frame it in
// a passport-shaped box, shrink it to ~100 KB, and hand the finished picture to
// the parent (which uploads it). Works the same for every loan type.
//   Render it only while open ({open && <PhotoCaptureFlow ... />}).
//   onPhoto(blob): async - upload it; throw to show an error here.
const PhotoCaptureFlow = ({ onClose, onPhoto, title = "Customer photo" }) => {
  const { isDarkMode } = useUI();
  const [step, setStep] = useState("choose"); // choose | frame | working
  const [framedUrl, setFramedUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [error, setError] = useState("");
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const urlRef = useRef(null);

  // Mounted only while open, so closing it throws all of this away; just free the
  // framing copy of the picture when it goes.
  useEffect(() => {
    urlRef.current = framedUrl;
  }, [framedUrl]);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const reset = useCallback(() => {
    setStep("choose");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setError("");
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    setFramedUrl(null);
  }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same picture again still triggers
    if (!file) return;
    setError("");
    setStep("working");
    try {
      const url = await prepareForFraming(file);
      setFramedUrl(url);
      setStep("frame");
    } catch (err) {
      setError(err.message || "Could not read that picture");
      setStep("choose");
    }
  };

  const usePhoto = async () => {
    if (!framedUrl || !area) return;
    setError("");
    setStep("working");
    try {
      const blob = await cropAndCompress(framedUrl, area);
      await onPhoto(blob);
      onClose();
    } catch (err) {
      setError(err.message || "Could not save the photo");
      setStep("frame");
    }
  };

  const card = isDarkMode ? "bg-slate-800 border-white/10 text-slate-100" : "bg-white border-slate-100 text-slate-900";
  const sub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const bigBtn = isDarkMode
    ? "bg-slate-700 hover:bg-slate-600 text-slate-100 border-white/10"
    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200";
  const quietBtn = isDarkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200";

  // Rendered at page level: the locked top bar's blur effect would otherwise
  // trap a "fixed" pop-up inside the bar.
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-3xl shadow-2xl border p-5 ${card}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
          <button type="button" onClick={onClose} disabled={step === "working"} className={`w-8 h-8 rounded-full text-lg leading-none ${quietBtn} disabled:opacity-50`} aria-label="Close">
            ×
          </button>
        </div>

        {/* hidden pickers: "capture" opens the phone camera straight away */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
        <input ref={galleryRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

        {step === "choose" && (
          <div className="flex flex-col gap-3">
            <p className={`text-xs font-semibold ${sub}`}>Take a clear, front-facing photo of the customer, or pick one you already have.</p>
            <button type="button" onClick={() => cameraRef.current?.click()} className={`w-full py-4 rounded-2xl border font-black text-xs uppercase tracking-widest ${bigBtn}`}>
              📷 Take photo
            </button>
            <button type="button" onClick={() => galleryRef.current?.click()} className={`w-full py-4 rounded-2xl border font-black text-xs uppercase tracking-widest ${bigBtn}`}>
              🖼️ Choose from gallery
            </button>
          </div>
        )}

        {step === "frame" && framedUrl && (
          <div className="flex flex-col gap-3">
            <p className={`text-xs font-semibold ${sub}`}>Drag to move and pinch (or use the slider) to fit the face inside the frame.</p>
            <div className="relative w-full h-[340px] rounded-2xl overflow-hidden bg-black">
              <Cropper
                image={framedUrl}
                crop={crop}
                zoom={zoom}
                aspect={PASSPORT_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setArea(pixels)}
                showGrid={false}
              />
            </div>
            <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" aria-label="Zoom" />
            <div className="flex gap-3">
              <button type="button" onClick={reset} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest ${quietBtn}`}>
                Choose another
              </button>
              <button type="button" onClick={usePhoto} disabled={!area} className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-primary text-white hover:bg-blue-700 disabled:opacity-50">
                Use photo
              </button>
            </div>
          </div>
        )}

        {step === "working" && (
          <div className="py-10 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className={`text-xs font-bold uppercase tracking-widest ${sub}`}>Please wait…</p>
          </div>
        )}

        {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}
      </div>
    </div>,
    document.body,
  );
};

export default PhotoCaptureFlow;
