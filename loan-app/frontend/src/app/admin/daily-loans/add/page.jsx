"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import Navbar from "../../../../components/Navbar";
import AuthGuard from "../../../../components/AuthGuard";
import DailyLoanForm from "../../../../components/DailyLoanForm";
import { createDailyLoan } from "../../../../services/dailyLoan.service";
import { useToast } from "../../../../context/ToastContext";

const AddDailyLoanPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const initialData = {
    loanNumber: "",
    customerName: "",
    mobileNumbers: [""],
    guarantorMobileNumbers: [""],
    disbursementAmount: "",
    startDate: new Date().toISOString().split("T")[0],
    totalEmis: 100,
    paidEmis: 0,
    processingFeeRate: 10,
    emiStartDate: "",
    status: "Active",
    clientResponse: "",
    nextFollowUpDate: "",
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await createDailyLoan(formData);
      showToast("Daily loan record created successfully", "success");
      router.push("/admin/daily-loans");
    } catch (err) {
      showToast(err.message || "Failed to create daily loan", "error");
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
                  Add Daily Loan
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Create a new daily repayment loan record
                </p>
              </div>

              <DailyLoanForm
                initialData={initialData}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/admin/daily-loans")}
                submitting={submitting}
              />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AddDailyLoanPage;
