"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import Navbar from "../../../../components/Navbar";
import AuthGuard from "../../../../components/AuthGuard";
import WeeklyLoanForm from "../../../../components/WeeklyLoanForm";
import { createWeeklyLoan } from "../../../../services/weeklyLoan.service";
import { useToast } from "../../../../context/ToastContext";

const AddWeeklyLoanPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
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
      <div className="flex min-h-screen bg-[#F8FAFC]">
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
