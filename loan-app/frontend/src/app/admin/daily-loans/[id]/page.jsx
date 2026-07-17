"use client";
import React, { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import Navbar from "../../../../components/Navbar";
import AuthGuard from "../../../../components/AuthGuard";
import DailyLoanForm from "../../../../components/DailyLoanForm";
import EMITable from "../../../../components/EMITable";
import {
  getDailyLoanById,
  getDailyLoanEMIs,
} from "../../../../services/dailyLoan.service";
import { getFollowupHistory } from "../../../../services/loan.service";
import FollowupHistory from "../../../../components/FollowupHistory";
import { useToast } from "../../../../context/ToastContext";
import { format } from "date-fns";
import LoanStatusBadge from "../../../../components/LoanStatusBadge";
import { useUI } from "../../../../context/UIContext";

const ViewDailyLoanPage = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const router = useRouter();
  const { isDarkMode } = useUI();
  const { showToast } = useToast();
  const [loanData, setLoanData] = useState(null);
  const [emis, setEmis] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [loanRes, emiRes, historyRes] = await Promise.all([
        getDailyLoanById(params.id),
        getDailyLoanEMIs(params.id),
        getFollowupHistory(params.id),
      ]);
      const data = loanRes.data;
      const emiData = emiRes.data || [];
      setHistory(historyRes.data || []);
      setHistoryLoading(false);

      // Format dates for the form
      if (data.startDate)
        data.startDate = format(new Date(data.startDate), "yyyy-MM-dd");
      if (data.emiStartDate)
        data.emiStartDate = format(new Date(data.emiStartDate), "yyyy-MM-dd");
      if (data.emiEndDate)
        data.emiEndDate = format(new Date(data.emiEndDate), "yyyy-MM-dd");
      if (data.nextFollowUpDate)
        data.nextFollowUpDate = format(
          new Date(data.nextFollowUpDate),
          "yyyy-MM-dd",
        );

      setLoanData(data);
      setEmis(emiData);
    } catch (err) {
      showToast(err.message || "Failed to fetch details", "error");
      router.push("/admin/daily-loans");
    } finally {
      setLoading(false);
    }
  }, [params.id, router, showToast]);

  useEffect(() => {
    fetchData();
  }, [params.id, fetchData]);

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Scoped daily loan view page dark mode overrides. Prefixed with
           .daily-loan-view-dark-mode so nothing here can affect any other
           page. DailyLoanForm, EMITable and FollowupHistory style
           themselves. */
        .daily-loan-view-dark-mode {
          background-color: #0f172a;
        }
        .daily-loan-view-dark-mode .bg-\[\#F8FAFC\]\/80 {
          background-color: rgba(15, 23, 42, 0.8) !important;
        }
        .daily-loan-view-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .daily-loan-view-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .daily-loan-view-dark-mode .border-slate-100 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      <div className={`flex min-h-screen bg-[#F8FAFC] transition-colors duration-300 ${isDarkMode ? "daily-loan-view-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 py-8 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="sticky top-16 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-4 mb-8 border-b border-slate-100 flex justify-between items-center transition-all duration-300">
                <div className="flex items-center gap-4">
                  <span className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">
                    📄
                  </span>
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                      View Daily Loan
                    </h1>
                    <p className="text-slate-500 font-medium text-sm text-left">
                      Loan Number: {loanData?.loanNumber}
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
                  <DailyLoanForm
                    initialData={loanData}
                    isViewOnly={true}
                    onCancel={() => router.push("/admin/daily-loans")}
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
                      isEditMode={false}
                      onUpdateSuccess={fetchData}
                    />
                  </div>

                  <FollowupHistory history={history} loading={historyLoading} />
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default ViewDailyLoanPage;
