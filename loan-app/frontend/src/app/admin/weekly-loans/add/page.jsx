"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import Navbar from "../../../../components/Navbar";
import AuthGuard from "../../../../components/AuthGuard";
import WeeklyLoanForm from "../../../../components/WeeklyLoanForm";
import { createWeeklyLoan } from "../../../../services/weeklyLoan.service";
import { useToast } from "../../../../context/ToastContext";
import { useUI } from "../../../../context/UIContext";

const AddWeeklyLoanPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const { isDarkMode } = useUI();
  const [submitting, setSubmitting] = useState(false);

  const initialData = {
    loanNumber: "",
    customerName: "",
    mobileNumbers: [""],
    guarantorMobileNumbers: [""],
    disbursementAmount: "",
    startDate: "",
    totalEmis: "",
    status: "Active",
    clientResponse: "",
    nextFollowUpDate: "",
    paidEmis: 0,
    processingFeeRate: 10,
    emiStartDate: "",
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await createWeeklyLoan(formData);
      showToast("Weekly loan record created successfully", "success");
      router.push("/admin/weekly-loans");
    } catch (err) {
      showToast(err.message || "Failed to create weekly loan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <style jsx global>{`
        .weekly-loan-add-dark-mode {
          background-color: #0f172a;
        }
        .weekly-loan-add-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .weekly-loan-add-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
      `}</style>
      <div className={`flex min-h-screen bg-[#F8FAFC] transition-colors duration-300 ${isDarkMode ? "weekly-loan-add-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 py-8 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  Add Weekly Loan
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Create a new weekly repayment loan record
                </p>
              </div>

              <WeeklyLoanForm
                initialData={initialData}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/admin/weekly-loans")}
                submitting={submitting}
              />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AddWeeklyLoanPage;
