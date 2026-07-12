import React from "react";

const SuccessModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden animate-scale-up text-center p-8">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center animate-bounce-subtle">
            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
          Success!
        </h3>

        <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8">
          {message || "Action completed successfully."}
        </p>

        <button
          onClick={onClose}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98]"
        >
          Got it
        </button>
      </div>

      <style jsx>{`
        @keyframes bounce-subtle {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SuccessModal;
