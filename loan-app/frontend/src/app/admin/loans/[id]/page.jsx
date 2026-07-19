"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "../../../../components/AuthGuard";
import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";
import LoanForm from "../../../../components/LoanForm";
import EMITable from "../../../../components/EMITable";
import { useToast } from "../../../../context/ToastContext";
import {
  getLoanById,
  getFollowupHistory,
} from "../../../../services/loan.service";
import { getEMIsByLoanId } from "../../../../services/customer";
import { flattenLoan } from "../../../../utils/loanUtils";
import FollowupHistory from "../../../../components/FollowupHistory";
import LoanStatusBadge from "../../../../components/LoanStatusBadge";
import { useUI } from "../../../../context/UIContext";

const ViewLoanPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { isDarkMode } = useUI();
  const [loan, setLoan] = useState(null);
  const [emis, setEmis] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchLoanData = async () => {
      try {
        const [loanRes, emiRes, historyRes] = await Promise.all([
          getLoanById(id),
          getEMIsByLoanId(id),
          getFollowupHistory(id),
        ]);

        const data = loanRes.data; // Already structured from backend
        const emiData = emiRes.data || [];
        setHistory(historyRes.data || []);
        setHistoryLoading(false);

        // Format dates for input[type="date"]
        const formattedData = {
          ...data,
          loanTerms: {
            ...data.loanTerms,
            dateLoanDisbursed: data.loanTerms?.dateLoanDisbursed
              ? new Date(data.loanTerms.dateLoanDisbursed)
                  .toISOString()
                  .split("T")[0]
              : "",
            emiStartDate: data.loanTerms?.emiStartDate
              ? new Date(data.loanTerms.emiStartDate)
                  .toISOString()
                  .split("T")[0]
              : "",
            emiEndDate: data.loanTerms?.emiEndDate
              ? new Date(data.loanTerms.emiEndDate).toISOString().split("T")[0]
              : "",
          },
          vehicleInformation: {
            ...data.vehicleInformation,
            fcDate: data.vehicleInformation?.fcDate
              ? new Date(data.vehicleInformation.fcDate)
                  .toISOString()
                  .split("T")[0]
              : "",
            insuranceDate: data.vehicleInformation?.insuranceDate
              ? new Date(data.vehicleInformation.insuranceDate)
                  .toISOString()
                  .split("T")[0]
              : "",
          },
          status: {
            ...data.status,
            nextFollowUpDate: data.status?.nextFollowUpDate
              ? new Date(data.status.nextFollowUpDate)
                  .toISOString()
                  .split("T")[0]
              : "",
            foreclosureDetails: data.status?.foreclosureDetails
              ? {
                  ...data.status.foreclosureDetails,
                  foreclosureDate: data.status.foreclosureDetails
                    .foreclosureDate
                    ? new Date(data.status.foreclosureDetails.foreclosureDate)
                        .toISOString()
                        .split("T")[0]
                    : "",
                }
              : undefined,
          },
        };

        setLoan(formattedData);
        setEmis(emiData);
      } catch (err) {
        showToast(err.message || "Failed to fetch loan data", "error");
      } finally {
        setLoading(false);
      }
    };

    if (id && id !== "undefined") {
      fetchLoanData();
    } else if (id === "undefined") {
      setLoading(false);
      showToast("Invalid Loan ID provided", "error");
      router.push("/admin/loans");
    }
  }, [id]);

  if (loading) {
    return (
      <AuthGuard>
        <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "loan-view-dark-mode" : ""}`}>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar />
            <main className="py-8 px-4 sm:px-8 flex items-center justify-center">
              <p className="text-slate-400 font-bold">
                Loading loan profile...
              </p>
            </main>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Scoped loan view page dark mode overrides. Prefixed with
           .loan-view-dark-mode so nothing here can affect any other page.
           LoanForm, EMITable and FollowupHistory style themselves. */
        .loan-view-dark-mode {
          background-color: #0f172a;
        }
        .loan-view-dark-mode .bg-\[\#F8FAFC\]\/80 {
          background-color: rgba(15, 23, 42, 0.8) !important;
        }
        .loan-view-dark-mode .bg-blue-50 {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
        .loan-view-dark-mode .bg-slate-100 {
          background-color: #334155 !important;
        }
        .loan-view-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .loan-view-dark-mode .text-slate-300 {
          color: #94a3b8 !important;
        }
        .loan-view-dark-mode .border-slate-100,
        .loan-view-dark-mode .border-slate-200,
        .loan-view-dark-mode .border-blue-100,
        .loan-view-dark-mode .border-amber-100,
        .loan-view-dark-mode .border-red-100 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "loan-view-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="sticky top-16 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-4 mb-8 border-b border-slate-100 flex justify-between items-center transition-all duration-300">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Loan Profile View
                  </h1>
                   <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan Number</span>
                      <span className="text-[13px] font-black text-primary uppercase tracking-tight bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {loan?.loanTerms?.loanNumber || loan?.loanNumber}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-slate-200">|</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Number</span>
                      <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {loan?.vehicleInformation?.vehicleNumber || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <LoanStatusBadge
                    status={loan?.status?.status || loan?.status}
                  />
                </div>
              </div>

              {loan && (
                <>
                  {loan.status?.foreclosureDetails && (
                    <div className="mb-8 bg-white rounded-3xl border border-amber-100 p-8 shadow-sm">
                      <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-4">
                        Foreclosure Settlement
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                            Settlement Amount
                          </span>
                          <p className="text-sm font-black text-slate-900">
                            ₹{(loan.status.foreclosureDetails.foreclosureAmount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                            Settlement Date
                          </span>
                          <p className="text-sm font-black text-slate-900">
                            {loan.status.foreclosureDetails.foreclosureDate
                              ? new Date(loan.status.foreclosureDetails.foreclosureDate).toLocaleDateString("en-IN")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                            Foreclosure Charge
                          </span>
                          <p className="text-sm font-black text-slate-900">
                            ₹{(loan.status.foreclosureDetails.foreclosureChargeAmount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                            Processed By
                          </span>
                          <p className="text-sm font-black text-slate-900 uppercase">
                            {loan.status.foreclosureDetails.foreclosedBy?.name || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {loan.status?.soldDetails?.sellAmount > 0 && (
                    <div className="mb-8 bg-white rounded-3xl border border-red-100 p-8 shadow-sm">
                      <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-4">
                        Sold Vehicle Details
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                            Sell Amount
                          </span>
                          <p className="text-sm font-black text-slate-900">
                            ₹{(loan.status.soldDetails.sellAmount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                            Misc. Amount
                          </span>
                          <p className="text-sm font-black text-slate-900">
                            ₹{(loan.status.soldDetails.miscellaneousAmount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                            Total Amount
                          </span>
                          <p className="text-sm font-black text-slate-900">
                            ₹{(loan.status.soldDetails.totalAmount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                            Sold Date
                          </span>
                          <p className="text-sm font-black text-slate-900">
                            {loan.status.soldDetails.soldDate
                              ? new Date(loan.status.soldDetails.soldDate).toLocaleDateString("en-IN")
                              : "—"}
                          </p>
                        </div>
                      </div>
                      {loan.status.soldDetails.soldBy?.name && (
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                          Sold By: <span className="text-slate-600">{loan.status.soldDetails.soldBy.name}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <LoanForm
                    initialData={loan}
                    isViewOnly={true}
                    onCancel={() => router.push("/admin/loans")}
                    emis={emis}
                  />

                  <div className="mt-12">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-6">
                      EMI Payment Schedule
                    </h2>
                    <EMITable
                      emis={
                        loan?.status?.status?.toLowerCase() === "closed"
                          ? emis.filter((emi) => (emi.amountPaid || 0) > 0)
                          : emis
                      }
                      isEditMode={false}
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

export default ViewLoanPage;
