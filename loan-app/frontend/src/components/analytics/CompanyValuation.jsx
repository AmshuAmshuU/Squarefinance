"use client";
import React, { useState } from "react";
import { Landmark, Calendar, Loader2, RefreshCw, Wallet, TrendingUp } from "lucide-react";
import { getCompanyValuation } from "../../services/analytics.service";

const fmtRs = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN") : "—");
const fmtMultiple = (m) => (m === null || m === undefined ? "N/A" : `${m.toFixed(2)}×`);

const CompanyValuation = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calculated, setCalculated] = useState(false);

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCompanyValuation();
      setData(res.data);
      setCalculated(true);
    } catch (err) {
      console.error("Failed to calculate company valuation:", err);
      setError(err.message || "Failed to calculate valuation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Landmark className="w-6 h-6 text-amber-500" strokeWidth={3} />
          COMPANY VALUATION
        </h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1.5 px-1">
          The full outstanding loan book — calculated on demand
        </p>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Calendar size={12} />
            {data?.asOfDate ? `As of ${fmtDate(data.asOfDate)}` : "As of today"}
          </div>
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Calculate
          </button>
        </div>

        {!calculated && !loading && (
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-6">
            Click Calculate — this walks the full loan and expense history, so it isn't run automatically.
          </p>
        )}

        {error && (
          <p className="text-[9px] text-red-500 mt-2 mb-4 font-bold uppercase tracking-tight">{error}</p>
        )}

        {calculated && data && (
          <>
            <div className="text-center py-8 px-6 rounded-2xl bg-amber-50 border border-slate-100 mb-5">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.16em] mb-2">
                Estimated Company Valuation
              </p>
              <p className="text-4xl font-black text-slate-900 tracking-tight">
                {fmtRs(data.companyValuation)}
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-2.5">
                Full-value outstanding loan book, no risk discount — the business reinvests everything, so there's no separate idle cash to add
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="inline-flex p-2 rounded-xl mb-3 bg-emerald-50 text-emerald-600">
                  <Wallet className="w-4 h-4" />
                </div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Our Investment</p>
                <p className="text-xl font-black text-slate-900">{fmtRs(data.ourInvestment)}</p>
                <p className="text-[9px] text-slate-400 mt-1.5 leading-snug">
                  Total disbursed + total expenses − total collected, all time
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="inline-flex p-2 rounded-xl mb-3 bg-blue-50 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Growth Multiple</p>
                <p className="text-xl font-black text-slate-900">{fmtMultiple(data.growthMultiple)}</p>
                <p className="text-[9px] text-slate-400 mt-1.5 leading-snug">
                  Valuation ÷ Our Investment — how many times the capital put in has grown
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-5 pt-4 border-t border-slate-100">
              <span className="text-slate-600 font-bold">Our Investment</span> is the net capital that has gone into the business to reach today's numbers — the business is fully self-funded with zero external debt, so this gap can only be capital the founders have put in.{" "}
              <span className="text-slate-600 font-bold">Company Valuation</span> is valued at full face value with no collectibility discount, same &quot;no risk&quot; basis as the Return on Investment card above. This is the whole-company number only — how founder stakes split on new capital is handled separately, outside this app.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyValuation;
