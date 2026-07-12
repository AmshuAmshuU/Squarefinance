"use client";
import React from "react";
import { format } from "date-fns";

const PrincipalPaymentList = ({ payments = [] }) => {
  if (!payments || payments.length === 0) {
    return (
      <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl p-8 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
          No principal payments recorded
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Payment Mode</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payments.map((p, idx) => (
              <tr key={p._id || idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-xs font-bold text-slate-600">
                  {p.paymentDate ? format(new Date(p.paymentDate), "dd/MM/yyyy") : "N/A"}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                    p.paymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-600' : 
                    p.paymentMode === 'Online' ? 'bg-blue-50 text-blue-600' : 
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {p.paymentMode || "Cash"}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">
                  ₹{(parseFloat(p.amount) || 0).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50/80">
              <td colSpan="2" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Paid Principal</td>
              <td className="px-6 py-4 text-sm font-black text-primary text-right">
                ₹{payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString("en-IN")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PrincipalPaymentList;
