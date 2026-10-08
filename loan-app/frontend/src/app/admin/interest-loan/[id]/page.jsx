"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import InterestLoanDetails from "@/components/InterestLoanDetails";
import LoanROICard from "@/components/LoanROICard";
import CustomerLocationPanel from "@/components/CustomerLocationPanel";
import interestLoanService from "@/services/interestLoanService";
import { useToast } from "@/context/ToastContext";
import { useUI } from "@/context/UIContext";
import { useLoanPrevNext } from "@/components/LoanPrevNext";
import LoanTopBar from "@/components/LoanTopBar";

const ViewInterestLoanPage = () => {
  const router = useRouter();
  const returnTo = useSearchParams().get("returnTo") || "/admin/interest-loan";
  const { id } = useParams();
  const { showToast } = useToast();
  const { isDarkMode } = useUI();
  const [loan, setLoan] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const { hasPrev, hasNext, goPrev, goNext } = useLoanPrevNext({ loanModel: "InterestLoan", id: id, mode: "view" });

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
        .interest-loan-view-dark-mode .bg-\[\#F8FAFC\]\/80 {
          background-color: rgba(15, 23, 42, 0.8) !important;
        }
        .interest-loan-view-dark-mode .bg-blue-50 {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
        .interest-loan-view-dark-mode .border-slate-100,
        .interest-loan-view-dark-mode .border-blue-100 {
          border-color: rgba(255, 255, 255, 0.08) !important;
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
                  <LoanTopBar
                    title="View"
                    loanModel="InterestLoan"
                    loanId={id}
                    loanNumber={loan?.loanNumber}
                    customerName={loan?.customerName}
                    status={loan?.status}
                    hasPrev={hasPrev}
                    hasNext={hasNext}
                    goPrev={goPrev}
                    goNext={goNext}
                    onBack={() => router.push(returnTo)}
                  />

                  <InterestLoanDetails loan={loan} emis={emis} onRefresh={fetchLoanData} />

                  <div className="mt-6">
                    <CustomerLocationPanel
                      lat={loan?.lastLocationLat}
                      lng={loan?.lastLocationLng}
                      lastLocationAt={loan?.lastLocationAt}
                      loanModel="InterestLoan"
                      loanId={id}
                    />
                  </div>

                  <LoanROICard fetchFn={interestLoanService.getLoanROI} loanId={id} />
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
