"use client";
import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { format } from "date-fns";

const DisbursementModal = ({ isOpen, onClose, onApply, initialData = [] }) => {
  // We'll store it in a grouped format for the UI: { date, items: [{ mode, amount, chequeNumber }] }
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.length > 0) {
        const grouped = initialData.reduce((acc, curr) => {
          const dateStr = curr.date ? format(new Date(curr.date), "yyyy-MM-dd") : "";
          let group = acc.find((g) => g.date === dateStr);
          if (!group) {
            group = { date: dateStr, items: [] };
            acc.push(group);
          }
          group.items.push({
            amount: curr.amount || "",
            mode: curr.mode || "Cash",
            chequeNumber: curr.chequeNumber || "",
            _id: curr._id,
            addedAt: curr.addedAt
          });
          return acc;
        }, []);
        
        // Use a microtask to avoid synchronous setState within useEffect error
        queueMicrotask(() => setGroups(grouped));
      } else {
        // Start with one empty group
        queueMicrotask(() => setGroups([{ 
          date: format(new Date(), "yyyy-MM-dd"), 
          items: [{ mode: "Cash", amount: "", chequeNumber: "" }] 
        }]));
      }
    }
  }, [isOpen, initialData]);

  const handleAddDateGroup = () => {
    setGroups([...groups, { date: format(new Date(), "yyyy-MM-dd"), items: [{ mode: "Cash", amount: "", chequeNumber: "" }] }]);
  };

  const handleRemoveDateGroup = (groupIndex) => {
    setGroups(groups.filter((_, i) => i !== groupIndex));
  };

  const handleAddItem = (groupIndex) => {
    const newGroups = [...groups];
    newGroups[groupIndex].items.push({ mode: "Cash", amount: "", chequeNumber: "" });
    setGroups(newGroups);
  };

  const handleRemoveItem = (groupIndex, itemIndex) => {
    const newGroups = [...groups];
    newGroups[groupIndex].items = newGroups[groupIndex].items.filter((_, i) => i !== itemIndex);
    // If no items left, remove the group
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

  const calculateTotal = () => {
    return groups.reduce((total, group) => {
      return total + group.items.reduce((gTotal, item) => gTotal + (parseFloat(item.amount) || 0), 0);
    }, 0);
  };

  const handleApply = () => {
    // Flatten the groups back to the backend format
    const flattened = groups.reduce((acc, group) => {
      group.items.forEach(item => {
        if (item.amount) {
          acc.push({
            date: group.date,
            amount: parseFloat(item.amount),
            mode: item.mode,
            chequeNumber: item.mode === "Cheque" ? item.chequeNumber : "",
            _id: item._id,
            addedAt: item.addedAt
          });
        }
      });
      return acc;
    }, []);
    onApply(flattened);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Disbursement Details" size="2xl">
      <div className="space-y-4">
        {groups.map((group, gIndex) => (
          <div key={gIndex} className="bg-slate-50/50 rounded-[2rem] p-5 border border-slate-100 relative transition-all hover:bg-slate-50">
            <button 
              type="button"
              onClick={() => handleRemoveDateGroup(gIndex)}
              className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-50"
            >
              ✕
            </button>
            <div className="flex items-center gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">
                  Payment Date
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={group.date}
                    onChange={(e) => handleGroupDateChange(gIndex, e.target.value)}
                    className="bg-white border-slate-100 text-slate-700 focus:ring-primary/20 w-40 rounded-xl px-4 py-2 text-xs font-bold border transition-all focus:outline-none focus:ring-2 shadow-sm"
                  />
                  {group.date && (
                    <button 
                      type="button"
                      onClick={() => handleGroupDateChange(gIndex, "")}
                      className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1.5 hover:text-red-500 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {group.items.map((item, iIndex) => (
                <div key={iIndex} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400/80 ml-1">
                      Mode
                    </label>
                    <select
                      value={item.mode}
                      onChange={(e) => handleItemChange(gIndex, iIndex, "mode", e.target.value)}
                      className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div className={`${item.mode === "Cheque" ? "md:col-span-3" : "md:col-span-6"} space-y-1`}>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400/80 ml-1">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={item.amount}
                        onChange={(e) => handleItemChange(gIndex, iIndex, "amount", e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-xl pl-7 pr-3 py-2 text-xs font-black text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                      />
                    </div>
                  </div>
                  {item.mode === "Cheque" && (
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400/80 ml-1">
                        Cheque #
                      </label>
                      <input
                        type="text"
                        placeholder="6 digits"
                        maxLength="6"
                        value={item.chequeNumber}
                        onChange={(e) => handleItemChange(gIndex, iIndex, "chequeNumber", e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      type="button"
                      onClick={() => handleRemoveItem(gIndex, iIndex)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                type="button"
                onClick={() => handleAddItem(gIndex)}
                className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 px-3 py-2 hover:text-primary/70 transition-all"
              >
                <span className="text-sm">+</span> Add More
              </button>
            </div>
          </div>
        ))}

        <button 
          type="button"
          onClick={handleAddDateGroup}
          className="w-full py-3 border-2 border-dashed border-slate-100 rounded-[1.5rem] text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
        >
          <span className="text-base">+</span> Add New Date
        </button>

        <div className="pt-5 mt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-6 px-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Amount</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1">
                <span className="text-slate-300 text-lg">₹</span>
                {calculateTotal().toLocaleString("en-IN")}
              </h3>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleApply}
              className="px-8 py-2.5 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DisbursementModal;
