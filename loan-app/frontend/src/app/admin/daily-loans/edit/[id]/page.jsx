"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Sidebar from "../../../../../components/Sidebar";
import Navbar from "../../../../../components/Navbar";
import AuthGuard from "../../../../../components/AuthGuard";
import DailyLoanForm from "../../../../../components/DailyLoanForm";
import EMITable from "../../../../../components/EMITable";
import {
  getDailyLoanById,
  updateDailyLoan,
  getDailyLoanEMIs,
} from "../../../../../services/dailyLoan.service";
import { useToast } from "../../../../../context/ToastContext";
import LoanStatusBadge from "../../../../../components/LoanStatusBadge";

const EditDailyLoanPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/admin/daily-loans";
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loanData, setLoanData] = useState(null);
  const [emis, setEmis] = useState([]);

  const fetchData = React.useCallback(async (silent = false) => {
    if (!id) return;
    try {
      if (!silent) setLoading(true);
      const [loanRes, emiRes] = await Promise.all([
        getDailyLoanById(id),
        getDailyLoanEMIs(id),
      ]);

      if (loanRes.data) {
        const loan = loanRes.data;
        setLoanData({
          ...loan,
          startDate: loan.startDate ? loan.startDate.split("T")[0] : "",
          emiStartDate: loan.emiStartDate
            ? loan.emiStartDate.split("T")[0]
            : "",
          nextFollowUpDate: loan.nextFollowUpDate
            ? loan.nextFollowUpDate.split("T")[0]
            : "",
        });
      }
      if (emiRes.data) {
        setEmis(emiRes.data);
      }
    } catch (err) {
      if (!silent) {
        showToast(err.message || "Failed to fetch loan details", "error");
        router.push("/admin/daily-loans");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, router, showToast]);

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

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const res = await updateDailyLoan(id, formData);
      const msg = res?.message || "";
      if (msg.toLowerCase().includes("approval")) {
        showToast("Changes submitted for approval by Super Admin", "info");
      } else {
        showToast("Daily loan updated successfully", "success");
      }
      await fetchData();
    } catch (err) {
      showToast(err.message || "Failed to update daily loan", "error");
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
                      Edit Daily Loan
                    </h1>
                    <p className="text-slate-500 font-medium text-sm">
                      Updating loan record: {loanData?.loanNumber}
                    </p>
                  </div>
                </div>
                <LoanStatusBadge status={loanData?.status} />
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <DailyLoanForm
                    initialData={loanData}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push("/admin/daily-loans")}
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
                      onUpdateSuccess={fetchData}
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

export default EditDailyLoanPage;
