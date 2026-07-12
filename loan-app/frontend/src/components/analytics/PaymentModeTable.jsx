import React from "react";
import { Wallet, Landmark, ArrowUpRight, ArrowDownLeft } from "lucide-react";

const PaymentModeTable = ({ data = {} }) => {
  const { disbursement = {}, collection = {} } = data;

  const formatCurrency = (value) => 
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const stats = [
    { 
      label: "CASH BALANCE", 
      icon: <Wallet className="text-emerald-500" size={16} />,
      disbursed: disbursement.cash,
      collected: collection.cash,
      color: "bg-emerald-50"
    },
    { 
      label: "ACCOUNT BALANCE", 
      icon: <Landmark className="text-blue-500" size={16} />,
      disbursed: disbursement.account,
      collected: collection.account,
      color: "bg-blue-50"
    },
    { 
      label: "TOTAL SUMMARY", 
      icon: <div className="w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center text-[8px] text-white font-bold">∑</div>,
      disbursed: disbursement.total,
      collected: collection.total,
      color: "bg-slate-50"
    },
  ];

  return (
    <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 flex flex-col h-full overflow-hidden">
      <div className="mb-8">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
           <span className="w-2 h-6 bg-slate-900 rounded-full" />
           PAYMENT MODE ANALYSIS
        </h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-4">
          Cash vs Bank transaction summary
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                <div className="flex items-center justify-end gap-1">
                   <ArrowUpRight size={10} className="text-red-400" /> Disbursed
                </div>
              </th>
              <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                <div className="flex items-center justify-end gap-1">
                   <ArrowDownLeft size={10} className="text-emerald-400" /> Collected
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {stats.map((row, idx) => (
              <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                <td className="py-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${row.color}`}>
                       {row.icon}
                    </div>
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{row.label}</span>
                  </div>
                </td>
                <td className="py-5 text-right">
                   <p className="text-xs font-black text-slate-900">{formatCurrency(row.disbursed)}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Payment Outs</p>
                </td>
                <td className="py-5 text-right">
                   <p className="text-xs font-black text-emerald-600">{formatCurrency(row.collected)}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Revenue Ins</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Cash Flow</p>
             <p className={`text-sm font-black ${collection.cash >= disbursement.cash ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(collection.cash - disbursement.cash)}
             </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Bank Flow</p>
             <p className={`text-sm font-black ${collection.account >= disbursement.account ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(collection.account - disbursement.account)}
             </p>
          </div>
      </div>
    </div>
  );
};

export default PaymentModeTable;
