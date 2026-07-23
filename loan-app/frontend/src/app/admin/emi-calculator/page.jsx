"use client";
import React, { useState } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { useUI } from "../../../context/UIContext";

// Mirrors the Vehicle loan flat-interest formula exactly:
// EMI = Principal/Tenure + Principal x Rate/100 (see CLAUDE.md - the flat
// rate is applied directly, not divided by 12, despite the field being
// called an "annual" rate elsewhere - that's established, intentional
// business logic, not a bug).
const calculateEmi = (principal, tenure, rate) => {
  if (!principal || !tenure) return 0;
  return Math.ceil(principal / tenure + (principal * rate) / 100);
};

// Solves for tenure given a target EMI, WITHOUT rounding - shown as an
// exact decimal (e.g. 12.67) rather than rounded to a whole month. Karthik
// wants to see how close a target EMI lands to a whole month so staff can
// judge whether to offer 12 or 13 months, rather than the calculator
// silently picking one for them.
const calculateTenure = (principal, emi, rate) => {
  const denominator = emi - (principal * rate) / 100;
  if (!principal || denominator <= 0) return "";
  return (principal / denominator).toFixed(2);
};

const EmiCalculatorPage = () => {
  const { isDarkMode } = useUI();
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("2.00");
  const [tenure, setTenure] = useState("12");
  const [emi, setEmi] = useState(String(calculateEmi(100000, 12, 2)));
  const [lastEdited, setLastEdited] = useState("tenure");

  const recompute = (nextPrincipal, nextRate, nextTenure, nextEmi, editedField) => {
    const P = parseFloat(nextPrincipal) || 0;
    const R = parseFloat(nextRate) || 0;

    if (editedField === "tenure" || (editedField !== "emi" && lastEdited === "tenure")) {
      const T = parseFloat(nextTenure) || 0;
      setEmi(T > 0 ? String(calculateEmi(P, T, R)) : "");
    } else {
      const E = parseFloat(nextEmi) || 0;
      setTenure(calculateTenure(P, E, R));
    }
  };

  const handlePrincipalChange = (v) => {
    setPrincipal(v);
    recompute(v, rate, tenure, emi, null);
  };
  const handleRateChange = (v) => {
    setRate(v);
    recompute(principal, v, tenure, emi, null);
  };
  const handleTenureChange = (v) => {
    setTenure(v);
    setLastEdited("tenure");
    recompute(principal, rate, v, emi, "tenure");
  };
  const handleEmiChange = (v) => {
    setEmi(v);
    setLastEdited("emi");
    recompute(principal, rate, tenure, v, "emi");
  };

  const tenureIsAuto = lastEdited === "emi";
  const emiIsAuto = lastEdited === "tenure";

  return (
    <AuthGuard>
      <style jsx global>{`
        .emi-calc-dark-mode {
          background-color: #0f172a;
        }
        .emi-calc-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .emi-calc-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .emi-calc-dark-mode .text-slate-600,
        .emi-calc-dark-mode .text-slate-500 {
          color: #cbd5e1 !important;
        }
        .emi-calc-dark-mode .text-slate-400 {
          color: #94a3b8 !important;
        }
        .emi-calc-dark-mode .border-slate-200,
        .emi-calc-dark-mode .border-slate-100 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .emi-calc-dark-mode .bg-slate-50 {
          background-color: #334155 !important;
        }
        .emi-calc-dark-mode input {
          color-scheme: dark;
        }
        .emi-calc-dark-mode input:focus {
          border-color: #60a5fa !important;
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.45) !important;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "emi-calc-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-2xl mx-auto">
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                  EMI Calculator
                </h1>
                <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
                  Vehicle loans only
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 p-6 sm:p-8">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Principal (₹)
                    </label>
                    <input
                      type="number"
                      value={principal}
                      onChange={(e) => handlePrincipalChange(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Interest rate (% / month)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={rate}
                      onChange={(e) => handleRateChange(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Tenure (months){tenureIsAuto && <span className="text-primary"> (Auto - exact)</span>}
                    </label>
                    <input
                      type="text"
                      value={tenure}
                      onChange={(e) => handleTenureChange(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      EMI (₹){emiIsAuto && <span className="text-primary"> (Auto)</span>}
                    </label>
                    <input
                      type="number"
                      value={emi}
                      onChange={(e) => handleEmiChange(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-6 italic">
                  Principal and interest rate are fixed inputs. Edit tenure or EMI - whichever you touch last recalculates the other.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EmiCalculatorPage;
