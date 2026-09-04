"use client";
import React, { useState } from "react";
import { getTodayIST } from "../utils/dateUtils";

// Shared foreclosure modal - combines charge entry + preview (step 1) and
// payment breakdown (step 2) into one self-contained flow, styled to match
// the existing Vehicle foreclosure page. Used both by the standalone
// /admin/foreclosure-payments page and by a "Foreclose" button embedded
// directly on a Weekly/Daily loan's own view/edit page. `onForeclose` does
// the actual API call (loan-type-specific); this component only collects
// and validates the input.
const ForeclosureModal = ({
  loanNumber,
  customerName,
  remainingPrincipal,
  onForeclose,
  onSuccess,
  onClose,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    foreclosureChargePercent: 0,
    foreclosureChargeAmount: 0,
    od: 0,
    miscellaneousFee: 0,
    remarks: "",
    paymentMode: "Online",
    chequeNumber: "",
  });

  const [paymentData, setPaymentData] = useState({
    paymentBreakdown: [{ mode: "CASH", amount: 0, chequeNumber: "" }],
    paymentDate: getTodayIST(),
  });

  const totalAmount =
    (remainingPrincipal || 0) +
    formData.foreclosureChargeAmount +
    formData.od +
    formData.miscellaneousFee;

  const handleChargeChange = (e) => {
    const { name, value } = e.target;
    if (name === "remarks") {
      setFormData((prev) => ({ ...prev, remarks: value }));
      return;
    }
    if (name === "chequeNumber") {
      setFormData((prev) => ({ ...prev, chequeNumber: value.replace(/\D/g, "").slice(0, 6) }));
      return;
    }
    const numValue = parseFloat(value) || 0;
    setFormData((prev) => {
      const updated = { ...prev, [name]: numValue };
      if (name === "foreclosureChargePercent") {
        updated.foreclosureChargeAmount = Math.ceil(((remainingPrincipal || 0) * numValue) / 100);
      }
      return updated;
    });
  };

  const handlePaymentChange = (index, field, value) => {
    setPaymentData((prev) => {
      const newBreakdown = [...prev.paymentBreakdown];
      let finalValue = value;
      if (field === "amount") finalValue = parseFloat(value) || 0;
      else if (field === "chequeNumber") finalValue = value.replace(/\D/g, "");
      newBreakdown[index] = { ...newBreakdown[index], [field]: finalValue };
      return { ...prev, paymentBreakdown: newBreakdown };
    });
  };

  const addPaymentRow = () => {
    setPaymentData((prev) => ({
      ...prev,
      paymentBreakdown: [...prev.paymentBreakdown, { mode: "CASH", amount: 0, chequeNumber: "" }],
    }));
  };

  const removePaymentRow = (index) => {
    setPaymentData((prev) => ({
      ...prev,
      paymentBreakdown: prev.paymentBreakdown.filter((_, i) => i !== index),
    }));
  };

  const receivedTotal = paymentData.paymentBreakdown.reduce((acc, curr) => acc + curr.amount, 0);

  const goToPayment = () => {
    setPaymentData((prev) => ({
      ...prev,
      paymentBreakdown: [{ mode: "CASH", amount: totalAmount, chequeNumber: "" }],
    }));
    setStep(2);
  };

  const handleConfirm = async () => {
    setError("");
    if (formData.paymentMode === "Cheque" && formData.chequeNumber.length !== 6) {
      setError("Cheque number must be exactly 6 digits");
      return;
    }
    if (receivedTotal < totalAmount - 0.1) {
      setError("Received amount is less than total amount");
      return;
    }
    for (const p of paymentData.paymentBreakdown) {
      if (p.mode === "CHEQUE" && (!p.chequeNumber || p.chequeNumber.length !== 6)) {
        setError("Cheque number must be exactly 6 digits");
        return;
      }
    }

    setLoading(true);
    try {
      await onForeclose({
        ...formData,
        ...paymentData,
        totalAmount,
        remainingPrincipal,
      });
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Failed to foreclose loan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-none">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {step === 1 ? "Foreclosure Preview" : "Payment Details"}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-wide">
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</label>
                  <p className="text-xs font-black text-slate-900 uppercase">{customerName}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loan Number</label>
                  <p className="text-xs font-black text-primary uppercase">{loanNumber}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-black text-primary uppercase tracking-widest">Remaining Principal</label>
                  <p className="text-base font-black text-primary tracking-tight">
                    ₹{(remainingPrincipal || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Foreclosure Charge (%)
                  </label>
                  <input
                    type="number"
                    name="foreclosureChargePercent"
                    value={formData.foreclosureChargePercent}
                    onChange={handleChargeChange}
                    className="w-full bg-transparent text-base font-black text-slate-800 focus:outline-none"
                  />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Charge Amount</label>
                  <p className="text-base font-black text-slate-800 tracking-tight">
                    ₹{formData.foreclosureChargeAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">OD Amount</label>
                  <input
                    type="number"
                    name="od"
                    value={formData.od}
                    onChange={handleChargeChange}
                    className="w-full bg-transparent text-base font-black text-red-500 focus:outline-none"
                  />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Misc. Fee</label>
                  <input
                    type="number"
                    name="miscellaneousFee"
                    value={formData.miscellaneousFee}
                    onChange={handleChargeChange}
                    className="w-full bg-transparent text-base font-black text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChargeChange}
                  className="w-full p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none resize-none h-20"
                  placeholder="Add a remark for this foreclosure..."
                />
              </div>

              <div className="bg-slate-900 rounded-[1.2rem] p-4 text-center space-y-0.5 max-w-[220px] mx-auto">
                <label className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em]">
                  Total Foreclosure Amount
                </label>
                <p className="text-lg font-black text-white tracking-tighter">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                  <span className="text-lg">⚠️</span>
                  <p className="text-[9px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
                    Warning: This action will close the loan permanently. All pending EMIs will be marked as paid. This process cannot be undone.
                  </p>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[9px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={goToPayment}
                    className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
                  >
                    PROCEED TO PAYMENT
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Breakdown</label>
                    <button onClick={addPaymentRow} className="text-[9px] font-black text-primary uppercase tracking-tighter hover:underline">
                      + Add Mode
                    </button>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {paymentData.paymentBreakdown.map((row, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={row.mode}
                          onChange={(e) => handlePaymentChange(index, "mode", e.target.value)}
                          className="w-1/3 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                        >
                          <option value="CASH">CASH</option>
                          <option value="BANK">BANK</option>
                          <option value="PAYTM">PAYTM</option>
                          <option value="CHEQUE">CHEQUE</option>
                          <option value="OTHERS">OTHERS</option>
                        </select>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) => handlePaymentChange(index, "amount", e.target.value)}
                            className="w-full pl-7 pr-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:outline-none"
                          />
                        </div>
                        {row.mode === "CHEQUE" && (
                          <div className="flex-1">
                            <input
                              type="text"
                              maxLength="6"
                              value={row.chequeNumber || ""}
                              onChange={(e) => handlePaymentChange(index, "chequeNumber", e.target.value)}
                              className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:outline-none font-mono"
                              placeholder="Cheque No."
                            />
                          </div>
                        )}
                        {paymentData.paymentBreakdown.length > 1 && (
                          <button
                            onClick={() => removePaymentRow(index)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Received Total</span>
                    <span className={`text-sm font-black tracking-tight ${receivedTotal < totalAmount - 0.1 ? "text-red-500" : "text-green-600"}`}>
                      ₹{receivedTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {receivedTotal < totalAmount - 0.1 && (
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-tight text-right pr-2 mt-1">
                      Must be at least: ₹{totalAmount.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[9px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                >
                  BACK
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading || receivedTotal < totalAmount - 0.1}
                  className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-30 disabled:grayscale"
                >
                  {loading ? "PROCESSING..." : "CONFIRM & CLOSE LOAN"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForeclosureModal;
