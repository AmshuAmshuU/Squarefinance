"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const TableActionMenu = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right - 110 + window.scrollX, // Adjust based on width
      });
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 focus:outline-none"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            className="w-auto min-w-[120px] bg-white rounded-xl shadow-2xl border border-slate-100 z-[999] overflow-hidden animate-in fade-in zoom-in duration-100 origin-top-right"
          >
            <div className="py-1">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors whitespace-nowrap ${
                    action.variant === "danger"
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default TableActionMenu;
