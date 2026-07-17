"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import InterestLoanDetails from "@/components/InterestLoanDetails";
import interestLoanService from "@/services/interestLoanService";
import { useToast } from "@/context/ToastContext";
import { useUI } from "@/context/UIContext";

const ViewInterestLoanPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { showToast } = useToast();
  const { isDarkMode } = useUI();
  const [loan, setLoan] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      const res = await interestLoanService.getLoanById(id);
      setLoan(res.data.loan);
      setEmis(res.data.emis || []);
    } catch (err) {
      showToast(err.message || "Failed to fetch loan data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLoanData();
  }, [id]);

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Scoped interest loan view page dark mode overrides. Prefixed
           with .interest-loan-view-dark-mode so nothing here can affect
           any other page. InterestLoanDetails styles itself. */
        .interest-loan-view-dark-mode {
          background-color: #0f172a;
        }
        .interest-loan-view-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .interest-loan-view-dark-mode .hover\:bg-slate-50:hover {
          background-color: #334155 !important;
        }
        .interest-loan-view-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .interest-loan-view-dark-mode .text-slate-600,
        .interest-loan-view-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .interest-loan-view-dark-mode .border-slate-200 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      <div className={`flex min-h-screen bg-[#F8FAFC] transition-colors duration-300 ${isDarkMode ? "interest-loan-view-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
              {loading ? (
                <div className="text-center py-12 text-slate-400 font-bold">Loading profile...</div>
              ) : loan ? (
                <>
                  <div className="mb-8 flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Interest Loan Profile</h1>
                      <p className="text-slate-500 font-medium text-sm">Loan Number: {loan.loanNumber} • {loan.customerName}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/admin/interest-loan/edit/${loan._id}`)}
                      className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                      Edit Profile
                    </button>
                  </div>
                  <InterestLoanDetails loan={loan} emis={emis} onRefresh={fetchLoanData} />
                </>
              ) : (
                <div className="text-center py-12 text-red-400 font-bold">Loan not found</div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default ViewInterestLoanPage;
