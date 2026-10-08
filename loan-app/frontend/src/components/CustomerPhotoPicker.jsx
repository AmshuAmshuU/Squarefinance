"use client";
import React, { useState } from "react";
import { uploadTempPhoto } from "../services/photo.service";
import PhotoCaptureFlow from "./PhotoCaptureFlow";
import { useToast } from "../context/ToastContext";
import { useUI } from "../context/UIContext";

// Optional "Customer photo" field at the top of every Add Loan page. Staff on a
// phone can take the photo right then; on a computer they can skip it and add the
// photo later by tapping the photo box on the loan.
//   value: { token, thumbUrl } | null     onChange(value | null)
// The picture is uploaded straight away as a temporary file; the loan's create
// request carries the token and the server attaches it once the loan exists.
const CustomerPhotoPicker = ({ loanModel, value, onChange }) => {
  const { isDarkMode } = useUI();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);

  const handlePhoto = async (blob) => {
    const res = await uploadTempPhoto(loanModel, blob);
    onChange({ token: res.data.token, thumbUrl: res.data.thumbUrl });
    showToast("Photo ready - it will be saved with the loan", "success");
  };

  const card = isDarkMode ? "bg-slate-800 border-white/10" : "bg-white border-slate-200";
  const head = isDarkMode ? "text-slate-100" : "text-slate-900";
  const sub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const box = isDarkMode ? "bg-slate-700 border-white/10 text-slate-400" : "bg-slate-200 border-slate-300 text-slate-400";
  const quiet = isDarkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200";

  return (
    <div className={`mb-6 rounded-3xl border shadow-sm p-4 flex items-center gap-4 ${card}`}>
      <div className={`w-[76px] h-[76px] shrink-0 rounded-xl border flex items-center justify-center overflow-hidden ${box}`}>
        {value?.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.thumbUrl} alt="Customer" className="w-full h-full object-cover" />
        ) : (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-black uppercase tracking-widest ${head}`}>Customer photo</p>
        <p className={`text-xs font-semibold mt-0.5 ${sub}`}>
          {value ? "Photo added - it will be saved with the loan." : "Optional. Take it now on your phone, or add it later from the loan."}
        </p>
        <div className="flex gap-2 mt-2">
          <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700">
            {value ? "Change photo" : "Add photo"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest ${quiet}`}>
              Remove
            </button>
          )}
        </div>
      </div>
      {open && <PhotoCaptureFlow onClose={() => setOpen(false)} onPhoto={handlePhoto} />}
    </div>
  );
};

export default CustomerPhotoPicker;
