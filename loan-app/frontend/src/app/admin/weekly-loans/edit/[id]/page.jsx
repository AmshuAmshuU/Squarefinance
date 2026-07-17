"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../../../../../components/Sidebar";
import Navbar from "../../../../../components/Navbar";
import AuthGuard from "../../../../../components/AuthGuard";
import WeeklyLoanForm from "../../../../../components/WeeklyLoanForm";
import EMITable from "../../../../../components/EMITable";
import {
  getWeeklyLoanById,
  updateWeeklyLoan,
  getWeeklyLoanEMIs,
} from "../../../../../services/weeklyLoan.service";
import { useToast } from "../../../../../context/ToastContext";
import { format } from "date-fns";
import LoanStatusBadge from "../../../../../components/LoanStatusBadge";
import { useUI } from "../../../../../context/UIContext";

const EditWeeklyLoanPage = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const router = useRouter();
  const { isDarkMode } = useUI();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/admin/weekly-loans";
  const { showToast } = useToast();
  const [loanData, setLoanData] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [loanRes, emiRes] = await Promise.all([
        getWeeklyLoanById(params.id),
        getWeeklyLoanEMIs(params.id),
      ]);
      const data = loanRes.data;
      const emiData = emiRes.data || [];

      // Format dates for the form
      if (data.startDate)
        data.startDate = format(new Date(data.startDate), "yyyy-MM-dd");
      if (data.emiStartDate)
        data.emiStartDate = format(new Date(data.emiStartDate), "yyyy-MM-dd");
      if (data.nextFollowUpDate)
        data.nextFollowUpDate = format(
          new Date(data.nextFollowUpDate),
          "yyyy-MM-dd",
        );

      setLoanData(data);
      setEmis(emiData);
    } catch (err) {
      if (!silent) {
        showToast(err.message || "Failed to fetch details", "error");
        router.push("/admin/weekly-loans");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [params.id, router, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Smart Polling: Refresh data automatically if any EMI is waiting for approval
  useEffect(() => {
    let interval;
    const hasWaitingApprovals = emis.some(emi => emi.status === "Waiting for Approval");
    
    if (hasWaitingApprovals) {
      interval = setInterval(() => {
        fetchData(true); // Silent refresh
      }, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [emis, fetchData]);

  const refreshEMIs = async () => {
    try {
      const response = await getWeeklyLoanEMIs(params.id);
      setEmis(response.data || []);
    } catch (err) {
      console.error("Failed to refresh EMIs:", err);
    }
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const res = await updateWeeklyLoan(params.id, formData);
      const msg = res?.message || "";
      if (msg.toLowerCase().includes("approval")) {
        showToast("Changes submitted for approval by Super Admin", "info");
      } else {
        showToast("Weekly loan record updated successfully", "success");
      }
      await fetchData();
    } catch (err) {
      showToast(err.message || "Failed to update weekly loan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Scoped weekly loan edit page dark mode overrides. Prefixed with
           .weekly-loan-edit-dark-mode so nothing here can affect any other
           page. WeeklyLoanForm and EMITable style themselves. */
        .weekly-loan-edit-dark-mode {
          background-color: #0f172a;
        }
        .weekly-loan-edit-dark-mode .bg-\[\#F8FAFC\]\/80 {
          background-color: rgba(15, 23, 42, 0.8) !important;
        }
        .weekly-loan-edit-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .weekly-loan-edit-dark-mode .hover\:bg-slate-50:hover {
          background-color: #334155 !important;
        }
        .weekly-loan-edit-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .weekly-loan-edit-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .weekly-loan-edit-dark-mode .border-slate-100,
        .weekly-loan-edit-dark-mode .border-slate-200 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      <div className={`flex min-h-screen bg-[#F8FAFC] transition-colors duration-300 ${isDarkMode ? "weekly-loan-edit-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 py-8 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="sticky top-16 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-4 mb-8 border-b border-slate-100 flex justify-between items-center transition-all duration-300">
              <button
                  onClick={() => router.push(returnTo)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                >
                  <span className="text-base leading-none">←</span> Back
                </button>
                <div className="flex items-center gap-4">
                  <span className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-2xl">
                    📝
                  </span>
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                      Edit Weekly Loan
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">
                      Updating loan record: {loanData?.loanNumber}
                    </p>
                  </div>
                </div>
                <LoanStatusBadge status={loanData?.status} />
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <WeeklyLoanForm
                    initialData={loanData}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push("/admin/weekly-loans")}
                    submitting={submitting}
                  />

                  <div className="mt-12">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-6 flex items-center gap-3">
                      <span className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center text-lg">
                        📋
                      </span>
                      EMI Payment Schedule
                    </h2>
                    <EMITable
                      emis={emis}
                      isEditMode={true}
                      onUpdateSuccess={refreshEMIs}
                    />
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EditWeeklyLoanPage;
