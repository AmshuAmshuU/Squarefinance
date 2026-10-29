"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { useUI } from "../context/UIContext";

// "Choose a theme" popup. Tapping a tile applies it straight away (so you can see it);
// Cancel puts back whatever was chosen before, Done keeps it.
const ThemeChooser = ({ onClose }) => {
  const { theme, setTheme, isDarkMode } = useUI();
  // the theme in use when the popup opened (it is mounted fresh each time), so Cancel can restore it
  const [before] = useState(theme);

  const tile = (id, label, note, preview) => {
    const selected = theme === id;
    return (
      <button
        type="button"
        onClick={() => setTheme(id)}
        aria-pressed={selected}
        className={`text-left rounded-2xl p-2 border-2 transition-colors ${
          selected ? "border-amber-300" : isDarkMode ? "border-white/10" : "border-slate-200"
        }`}
      >
        <div className="rounded-xl overflow-hidden h-24">{preview}</div>
        <div className="flex items-center justify-between px-1 pt-2 pb-0.5">
          <span className="text-sm font-black">{label}</span>
          {selected ? <Check className="w-4 h-4 text-amber-300" /> : <span className="text-[10px] opacity-60">{note}</span>}
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60">
      <div
        className={`w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl p-5 ${
          isDarkMode ? "bg-[#0c1130] text-slate-100" : "bg-white text-slate-900"
        }`}
        role="dialog"
        aria-label="Choose a theme"
      >
        <h3 className="text-lg font-black tracking-tight">Choose a theme</h3>
        <p className={`text-xs mb-4 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Tap one to see it right away.</p>
        <div className="grid grid-cols-2 gap-3">
          {tile(
            "default",
            "Default",
            "Simple",
            <div style={{ height: "100%", width: "100%", background: "#f8fafc", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ height: 20, borderRadius: 6, background: "#ffffff", border: "1px solid #e2e8f0" }} />
              <div style={{ height: 10, width: "66%", borderRadius: 4, background: "#e2e8f0" }} />
              <div style={{ height: 10, width: "50%", borderRadius: 4, background: "#e2e8f0" }} />
            </div>,
          )}
          {tile(
            "space",
            "Space",
            "NASA photos",
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/themes/space/tile.webp" alt="Space theme preview" className="h-full w-full object-cover" />,
          )}
          {tile(
            "desert",
            "Desert",
            "Dunes",
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/themes/desert/tile.webp" alt="Desert theme preview" className="h-full w-full object-cover" />,
          )}
          {tile(
            "rainforest",
            "Rainforest",
            "Rain",
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/themes/rainforest/tile.webp" alt="Rainforest theme preview" className="h-full w-full object-cover" />,
          )}
          {tile(
            "beach",
            "Island beach",
            "Sunny",
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/themes/beach/tile.webp" alt="Island beach theme preview" className="h-full w-full object-cover" />,
          )}
          {tile(
            "supercars",
            "Supercars",
            "Hypercars",
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/themes/supercars/tile.webp" alt="Supercars theme preview" className="h-full w-full object-cover" />,
          )}
          {tile(
            "superbikes",
            "Superbikes",
            "Bikes",
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/themes/superbikes/tile.webp" alt="Superbikes theme preview" className="h-full w-full object-cover" />,
          )}
        </div>
        <p className={`text-[11px] mt-3 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Each theme shows a different photo on each section of the app. Island beach is the bright one; the others are easy on the eyes at night.
        </p>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => {
              setTheme(before);
              onClose();
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest ${
              isDarkMode ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeChooser;
