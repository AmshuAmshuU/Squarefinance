"use client";
import React from "react";
import { useUI } from "../context/UIContext";

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  const { isDarkMode } = useUI();

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <style jsx global>{`
        /* Shared modal dark mode overrides. Modal wraps arbitrary form
           content from many different pages, so this covers the common
           Tailwind classes those forms tend to use, not just Modal's own
           markup. Scoped under .modal-dark-mode so it can't affect
           anything outside an open modal. */
        .modal-dark-mode {
          background-color: #1e293b !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          color: #cbd5e1;
        }
        .modal-dark-mode .bg-white,
        .modal-dark-mode .bg-slate-50,
        .modal-dark-mode .bg-slate-100 {
          background-color: #334155 !important;
        }
        .modal-dark-mode .bg-slate-50\/50 {
          background-color: rgba(51, 65, 85, 0.5) !important;
        }
        .modal-dark-mode .hover\:bg-slate-100:hover,
        .modal-dark-mode .hover\:bg-slate-50:hover {
          background-color: #475569 !important;
        }
        .modal-dark-mode .border-slate-100,
        .modal-dark-mode .border-slate-200 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .modal-dark-mode .text-slate-900,
        .modal-dark-mode .text-slate-800 {
          color: #f1f5f9 !important;
        }
        .modal-dark-mode .text-slate-700 {
          color: #e2e8f0 !important;
        }
        .modal-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .modal-dark-mode .text-slate-400,
        .modal-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .modal-dark-mode input,
        .modal-dark-mode select,
        .modal-dark-mode textarea {
          color-scheme: dark;
        }
      `}</style>
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div
        className={`relative bg-white w-full ${sizeClasses[size] || sizeClasses.md} rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh] transition-colors duration-300 ${isDarkMode ? "modal-dark-mode" : ""}`}
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all font-bold"
          >
            ✕
          </button>
        </div>
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
