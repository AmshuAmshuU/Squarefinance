"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import InterestLoanForm from "@/components/InterestLoanForm";
import interestLoanService from "@/services/interestLoanService";
import { useToast } from "@/context/ToastContext";
import { useUI } from "@/context/UIContext";

const EditInterestLoanPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/admin/interest-loan";
  const { id } = useParams();
  const { showToast } = useToast();
  const { isDarkMode } = useUI();
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
      const res = await interestLoanService.updateLoan(id, values);
      const msg = res?.message || "";
      if (msg.toLowerCase().includes("approval")) {
        showToast("Changes submitted for approval by Super Admin", "info");
      } else {
        showToast("Interest loan updated successfully", "success");
      }
      await fetchLoan();
    } catch (err) {
      showToast(err.message || "Failed to update", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Scoped interest loan edit page dark mode overrides. Prefixed
           with .interest-loan-edit-dark-mode so nothing here can affect
           any other page. InterestLoanForm styles itself. */
        .interest-loan-edit-dark-mode {
          background-color: #0f172a;
        }
        .interest-loan-edit-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .interest-loan-edit-dark-mode .bg-slate-50 {
          background-color: #334155 !important;
        }
        .interest-loan-edit-dark-mode .bg-emerald-50 {
          background-color: rgba(16, 185, 129, 0.15) !important;
        }
        .interest-loan-edit-dark-mode .hover\:bg-slate-50:hover {
          background-color: #334155 !important;
        }
        .interest-loan-edit-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .interest-loan-edit-dark-mode .text-slate-600,
        .interest-loan-edit-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .interest-loan-edit-dark-mode .border-slate-100,
        .interest-loan-edit-dark-mode .border-slate-200,
        .interest-loan-edit-dark-mode .border-emerald-100 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      <div className={`flex min-h-screen bg-[#F8FAFC] transition-colors duration-300 ${isDarkMode ? "interest-loan-edit-dark-mode" : ""}`}>
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
