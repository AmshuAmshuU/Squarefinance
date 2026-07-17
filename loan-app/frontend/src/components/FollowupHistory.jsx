"use client";
import React from "react";
import { format } from "date-fns";
import { useUI } from "../context/UIContext";

const FollowupHistory = ({ history = [], loading = false }) => {
  const { isDarkMode } = useUI();

  return (
    <>
      {/* Scoped follow-up history dark mode overrides. Shared by Loans,
         Weekly Loans, and Daily Loans detail pages. Prefixed with
         .followup-history-dark-mode so nothing here can affect any other
         page. This is the only <style jsx> tag in this component -
         styled-jsx does not allow more than one per component, so it must
         stay unconditional even though the JSX below branches three ways. */}
      <style jsx global>{`
        .followup-history-dark-mode {
          background-color: #1e293b !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .followup-history-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .followup-history-dark-mode .bg-slate-50\/50 {
          background-color: rgba(51, 65, 85, 0.5) !important;
        }
        .followup-history-dark-mode .hover\:bg-slate-50:hover {
          background-color: #334155 !important;
        }
        .followup-history-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .followup-history-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .followup-history-dark-mode .border-slate-100,
        .followup-history-dark-mode .border-slate-200 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      {loading ? (
        <div className={`mt-8 bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 font-bold text-xs uppercase ${isDarkMode ? "followup-history-dark-mode" : ""}`}>
          Loading follow-up history...
        </div>
      ) : !history || history.length === 0 ? (
        <div className={`mt-8 bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 font-bold text-xs uppercase ${isDarkMode ? "followup-history-dark-mode" : ""}`}>
          No follow-up history found
        </div>
      ) : (
        <div className={`mt-12 ${isDarkMode ? "followup-history-dark-mode" : ""}`}>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-6">
            Follow-up History
          </h2>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      User
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      Response
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">
                      Next Follow-up
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap text-[11px] font-black text-slate-900 uppercase">
                        {item.followupDate ? format(new Date(item.followupDate), "dd MMM yyyy, hh:mm a") : "—"}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-[11px] font-bold text-slate-600 uppercase">
                        {item.followedUpBy?.name || "System"}
                      </td>
                      <td className="px-6 py-5 text-[12px] font-bold text-slate-600 max-w-md break-words">
                        {item.clientResponse || "—"}
                      </td>
                      <td className="px-6 py-5 text-center whitespace-nowrap text-[11px] font-black text-primary uppercase">
                        {item.nextFollowupDate
                          ? format(new Date(item.nextFollowupDate), "dd MMM yyyy")
                          : "Resolved"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FollowupHistory;
