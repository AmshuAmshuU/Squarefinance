"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import LoanForm from "../../../../../components/LoanForm";
import EMITable from "../../../../../components/EMITable";
import { useToast } from "../../../../../context/ToastContext";
import {
  getLoanById,
  updateLoan,
  toggleSeized,
} from "../../../../../services/loan.service";
import LoanStatusBadge from "../../../../../components/LoanStatusBadge";
import { getEMIsByLoanId } from "../../../../../services/customer";
import { flattenLoan } from "../../../../../utils/loanUtils";

const EditLoanPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/admin/loans";
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const fetchLoanData = async () => {
    try {
      const [loanRes, emiRes] = await Promise.all([
        getLoanById(id),
        getEMIsByLoanId(id),
      ]);

      const data = loanRes.data; // Already structured from backend
      const emiData = emiRes.data || [];

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
            ? new Date(data.loanTerms.emiStartDate).toISOString().split("T")[0]
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
            ? new Date(data.status.nextFollowUpDate).toISOString().split("T")[0]
            : "",
          foreclosureDetails: data.status?.foreclosureDetails
            ? {
                ...data.status.foreclosureDetails,
                foreclosureDate: data.status.foreclosureDetails.foreclosureDate
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

  useEffect(() => {
    if (id) {
      fetchLoanData();
    }
  }, [id]);

  // Smart Polling: Refresh data automatically if any EMI is waiting for approval
  useEffect(() => {
    let interval;
    const hasWaitingApprovals = emis.some(emi => emi.status === "Waiting for Approval");
    
    if (hasWaitingApprovals) {
      interval = setInterval(() => {
        fetchLoanData();
      }, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [emis, id]);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await updateLoan(id, formData);
      showToast("Loan profile updated and EMIs synchronized", "success");
      await fetchLoanData();
    } catch (err) {
      showToast(err.message || "Failed to update loan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSeized = async () => {
    try {
      setSubmitting(true);
      await toggleSeized(id);
      showToast(
        loan.isSeized
          ? "Loan unseized successfully"
          : "Loan seized successfully",
        "success",
      );
      await fetchLoanData();
    } catch (err) {
      showToast(err.message || "Failed to toggle seized status", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEMIUpdate = async () => {
    // Refresh EMI data after update
    try {
      const emiRes = await getEMIsByLoanId(id);
      setEmis(emiRes.data || []);
    } catch (err) {
      console.error("Error refreshing EMI data:", err);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F8FAFC] flex">
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
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="sticky top-16 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-4 mb-8 border-b border-slate-100 flex justify-between items-center transition-all duration-300">
              <button
                  onClick={() => router.push(returnTo)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                >
                  <span className="text-base leading-none">←</span> Back
                </button>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Modify Loan Parameters
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
                  <LoanForm
                    initialData={loan}
                    onSubmit={handleSubmit}
                    onCancel={() => router.push(returnTo)}
                    submitting={submitting}
                    emis={emis}
                    renderExtraActions={() => null}
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
                      isEditMode={true}
                      onUpdateSuccess={handleEMIUpdate}
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

export default EditLoanPage;
