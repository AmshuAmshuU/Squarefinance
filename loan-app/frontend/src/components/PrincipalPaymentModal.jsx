"use client";
import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { format } from "date-fns";
import PaymentModeSelector from "./PaymentModeSelector";

const PrincipalPaymentModal = ({ isOpen, onClose, onApply, initialData = [], loanBalance = 0, loanNumber = "" }) => {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.length > 0) {
        const grouped = initialData.reduce((acc, curr) => {
          const dateStr = curr.paymentDate ? format(new Date(curr.paymentDate), "yyyy-MM-dd") : "";
          let group = acc.find((g) => g.date === dateStr);
          if (!group) {
            group = { date: dateStr, items: [] };
            acc.push(group);
          }
          group.items.push({
            amount: curr.amount || "",
            mode: curr.paymentMode || "Cash",
            remarks: curr.remarks || "",
            _id: curr._id,
          });
          return acc;
        }, []);
        queueMicrotask(() => setGroups(grouped));
      } else {
        queueMicrotask(() => setGroups([{ 
          id: Date.now(),
          date: format(new Date(), "yyyy-MM-dd"), 
          items: [{ id: Date.now() + 1, mode: "Cash", amount: "", remarks: "" }] 
        }]));
      }
    }
  }, [isOpen, initialData]);

  const handleAddDateGroup = () => {
    setGroups([...groups, { 
      id: Date.now(),
      date: format(new Date(), "yyyy-MM-dd"), 
      items: [{ id: Date.now() + 1, mode: "Cash", amount: "", remarks: "" }] 
    }]);
  };

  const handleRemoveDateGroup = (groupIndex) => {
    setGroups(groups.filter((_, i) => i !== groupIndex));
  };

  const handleAddItem = (groupIndex) => {
    const newGroups = [...groups];
    newGroups[groupIndex].items.push({ id: Date.now(), mode: "Cash", amount: "", remarks: "" });
    setGroups(newGroups);
  };

  const handleRemoveItem = (groupIndex, itemIndex) => {
    const newGroups = [...groups];
    newGroups[groupIndex].items = newGroups[groupIndex].items.filter((_, i) => i !== itemIndex);
    if (newGroups[groupIndex].items.length === 0) {
      handleRemoveDateGroup(groupIndex);
    } else {
      setGroups(newGroups);
    }
  };

  const handleGroupDateChange = (groupIndex, value) => {
    const newGroups = [...groups];
    newGroups[groupIndex].date = value;
    setGroups(newGroups);
  };

  const handleItemChange = (groupIndex, itemIndex, field, value) => {
    const newGroups = [...groups];
    newGroups[groupIndex].items[itemIndex][field] = value;
    setGroups(newGroups);
  };

  const calculateTotalPayingNow = () => {
    return groups.reduce((total, group) => {
      return total + group.items.reduce((gTotal, item) => gTotal + (parseFloat(item.amount) || 0), 0);
    }, 0);
  };

  const currentRemaining = Math.max(0, loanBalance - calculateTotalPayingNow());

  const handleApply = () => {
    const flattened = groups.reduce((acc, group) => {
      group.items.forEach(item => {
        if (item.amount) {
          acc.push({
            paymentDate: group.date,
            amount: parseFloat(item.amount),
            paymentMode: item.mode,
            remarks: item.remarks,
            _id: item._id,
          });
        }
      });
      return acc;
    }, []);
    onApply(flattened);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Add Principal Payment
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Loan: {loanNumber} | Current Bal: ₹{loanBalance.toLocaleString("en-IN")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:shadow-sm transition-all shadow-sm"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Remaining Amount Card */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">
              Remaining Principal After Payment
            </label>
            <div className={`text-3xl font-black transition-colors ${currentRemaining === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
              ₹{currentRemaining.toLocaleString()}
            </div>
          </div>

          {/* Payment Groups */}
          <div className="space-y-10">
            {groups.map((group, gIndex) => (
              <div key={group.id || gIndex} className="space-y-6 pt-2 first:pt-0">
                
                {/* Date Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Payment Date
                    </label>
                    <button
                      type="button"
                      onClick={() => handleGroupDateChange(gIndex, "")}
                      className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                    >
                      CLEAR
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={group.date}
                      onChange={(e) => handleGroupDateChange(gIndex, e.target.value)}
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 hover:border-slate-300 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Payments within Date */}
                <div className="space-y-6 pl-4 border-l-2 border-slate-100">
                  {group.items.map((item, iIndex) => (
                    <div key={item.id || iIndex} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        <PaymentModeSelector
                          label="Payment Mode"
                          value={item.mode}
                          onChange={(val) => handleItemChange(gIndex, iIndex, "mode", val)}
                        />
                        <div className="relative">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Amount
                          </label>
                          <div className="relative">
                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">₹</span>
                             <input
                              type="number"
                              value={item.amount}
                              placeholder="0.00"
                              onChange={(e) => handleItemChange(gIndex, iIndex, "amount", e.target.value)}
                              className="w-full pl-9 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                            {group.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(gIndex, iIndex)}
                                className="absolute -right-3 -top-3 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-all"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddItem(gIndex)}
                    className="text-[11px] font-black text-primary uppercase tracking-widest hover:text-primary/70 flex items-center gap-2 transition-all"
                  >
                    <span className="text-lg leading-none">+</span> ADD MORE
                  </button>
                </div>
              </div>
            ))}

            {/* Add Date Button */}
            <button
              type="button"
              onClick={handleAddDateGroup}
              className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-[11px] font-black text-slate-400 uppercase tracking-widest hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl leading-none">+</span> ADD DATE
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 bg-white">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-8 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={handleApply}
              className="flex-[2] px-8 py-4 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              APPLY PAYMENTS
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrincipalPaymentModal;
