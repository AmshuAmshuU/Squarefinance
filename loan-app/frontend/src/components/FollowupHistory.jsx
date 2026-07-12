"use client";
import React from "react";
import { format } from "date-fns";

const FollowupHistory = ({ history = [], loading = false }) => {
  if (loading) {
    return (
      <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 font-bold text-xs uppercase">
        Loading follow-up history...
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-400 font-bold text-xs uppercase">
        No follow-up history found
      </div>
    );
  }

  return (
    <div className="mt-12">
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
  );
};

export default FollowupHistory;
