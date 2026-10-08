"use client";
import React from "react";
import { useUI } from "../context/UIContext";

// Customer photo tile for the loans lists: passport proportions (47 x 60 px, the
// same 35:45 shape as the photo itself, so faces are never stretched), fitted to
// the row height. `compact` (43 x 55) is for the dashboard follow-up lists; `small` (36 x 46) is for the compact computer table of the Vehicle list. A grey silhouette means no photo has been added yet - the same
// grey icon the loan's top bar shows.
const ListPhoto = ({ url, small = false, compact = false }) => {
  const { isDarkMode } = useUI();
  const size = compact ? "w-[43px] h-[55px]" : small ? "w-[36px] h-[46px]" : "w-[47px] h-[60px]";
  const look = isDarkMode ? "bg-slate-700 border-white/10 text-slate-400" : "bg-slate-200 border-slate-300 text-slate-400";
  const iconSize = compact ? 28 : small ? 24 : 30;
  return (
    <div className={`mx-auto ${size} rounded-md border overflow-hidden flex items-center justify-center ${look}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
      )}
    </div>
  );
};

export default ListPhoto;
