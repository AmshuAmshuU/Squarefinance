"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import InterestLoanForm from "@/components/InterestLoanForm";
import interestLoanService from "@/services/interestLoanService";
import { useToast } from "@/context/ToastContext";

const EditInterestLoanPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/admin/interest-loan";
  const { id } = useParams();
  const { showToast } = useToast();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [emis, setEmis] = useState([]);

  const fetchLoan = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await interestLoanService.getLoanById(id);
      setLoan(res.data.loan);
      setEmis(res.data.emis || []);
    } catch (err) {
      if (!silent) showToast(err.message || "Failed to fetch loan", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLoan();
  }, [id]);

  // Smart Polling: Refresh data automatically if any EMI is waiting for approval
  useEffect(() => {
    let interval;
    const hasWaitingApprovals = emis.some(emi => emi.status === "Waiting for Approval");
    
    if (hasWaitingApprovals) {
      interval = setInterval(() => {
        fetchLoan(true); // Silent refresh
      }, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [emis, id]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await interestLoanService.updateLoan(id, values);
      showToast("Interest loan updated successfully", "success");
      await fetchLoan();
    } catch (err) {
      showToast(err.message || "Failed to update", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
              <div className="mb-4">
              <button
                  onClick={() => router.push(returnTo)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                >
                  <span className="text-base leading-none">←</span> Back
                </button>
              </div>
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Modify Loan Parameters
                  </h1>
                  <p className="text-slate-500 font-medium text-sm mt-1">
                    Updating loan record: <span className="text-slate-900 font-bold">{loan?.loanNumber}</span>
                  </p>
                </div>
                {loan && (
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                    loan.status === 'Active' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-slate-50 text-slate-600 border-slate-100'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${loan.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    {loan.status}
                  </div>
                )}
              </div>
              {loading ? (
                <div className="text-center py-12 text-slate-400 font-bold">Loading...</div>
              ) : (
                <InterestLoanForm 
                  initialData={loan} 
                  onSubmit={handleSubmit} 
                  submitting={submitting} 
                  emis={emis}
                  onRefresh={fetchLoan}
                  onCancel={() => router.push(returnTo)} 
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EditInterestLoanPage;
