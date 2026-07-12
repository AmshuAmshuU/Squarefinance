import React, { useState, useEffect } from "react";

const SoldVehicleModal = ({ isOpen, onClose, onConfirm, loan }) => {
  const [step, setStep] = useState(1); // 1: Input, 2: Preview
  const [formData, setFormData] = useState({
    sellAmount: "",
    miscellaneousAmount: "0",
    totalAmount: 0,
  });
  const [error, setError] = useState("");

  const { sellAmount, miscellaneousAmount } = formData;

  useEffect(() => {
    const sell = Math.ceil(parseFloat(sellAmount) || 0);
    const misc = Math.ceil(parseFloat(miscellaneousAmount) || 0);
    setFormData((prev) => ({ ...prev, totalAmount: sell + misc }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellAmount, miscellaneousAmount, setFormData]);

  if (!isOpen) return null;

  const handlePay = () => {
    if (!formData.sellAmount || parseFloat(formData.sellAmount) <= 0) {
      setError("Please enter a valid sell amount");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleFinalConfirm = () => {
    onConfirm(formData);
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {step === 1 ? "Record Vehicle Sale" : "Confirm Sale Details"}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Loan: {loan?.loanTerms?.loanNumber || loan?.loanNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-slate-600 transition-all border border-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                {error}
              </p>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Sell Amount
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.sellAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, sellAmount: e.target.value })
                    }
                    placeholder="ENTER AMOUNT"
                    className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Miscellaneous Amount
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.miscellaneousAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        miscellaneousAmount: e.target.value,
                      })
                    }
                    placeholder="ENTER AMOUNT"
                    className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-200"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest text-center mb-1">
                  Total Sale Amount
                </p>
                <p className="text-2xl font-black text-emerald-600 text-center tracking-tight">
                  ₹
                  {formData.totalAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 0,
                  })}
                </p>
              </div>

              <button
                onClick={handlePay}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all active:scale-[0.98] mt-2"
              >
                Proceed to Pay
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Sell Amount
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    ₹{parseFloat(formData.sellAmount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Miscellaneous
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    ₹{parseFloat(formData.miscellaneousAmount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-4 bg-slate-50 px-4 rounded-xl">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                    Total Amount
                  </span>
                  <span className="text-lg font-black text-primary tracking-tight">
                    ₹{formData.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
               
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleFinalConfirm}
                  className="flex-[2] bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-[0.98]"
                >
                  Confirm Sale
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoldVehicleModal;
