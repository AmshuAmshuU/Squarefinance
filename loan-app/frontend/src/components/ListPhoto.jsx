"use client";
import React from "react";
import { useUI } from "../context/UIContext";

// Customer photo tile for the loans lists: passport proportions (47 x 60 px, the
// same 35:45 shape as the photo itself, so faces are never stretched), fitted to
// the row height. `fill` sizes it to its table cell; `small` (36 x 46) is for the compact computer table of the Vehicle list. A grey silhouette means no photo has been added yet - the same
// grey icon the loan's top bar shows.
const ListPhoto = ({ url, small = false, fill = false }) => {
  const { isDarkMode } = useUI();
  const size = small ? "w-[36px] h-[46px]" : "w-[47px] h-[60px]";
  const look = isDarkMode ? "bg-slate-700 border-white/10 text-slate-400" : "bg-slate-200 border-slate-300 text-slate-400";
  // `fill`: as tall as its (relatively positioned, padding-free) table cell allows
  // - 3px of space above and below, capped at 64px - with the width following the
  // passport proportions, so the picture is never stretched.
  const box = fill
    ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[calc(100%-6px)] max-h-[64px] aspect-[35/45]"
    : `mx-auto ${size}`;
  const icon = fill ? { className: "w-[55%] h-[55%]" } : { width: small ? 24 : 30, height: small ? 24 : 30 };
  return (
    <div className={`${box} rounded-md border overflow-hidden flex items-center justify-center ${look}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <svg {...icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
      )}
    </div>
  );
};

export default ListPhoto;
