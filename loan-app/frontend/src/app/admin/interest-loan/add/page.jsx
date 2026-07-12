"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import InterestLoanForm from "@/components/InterestLoanForm";
import interestLoanService from "@/services/interestLoanService";
import { useToast } from "@/context/ToastContext";

const AddInterestLoanPage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await interestLoanService.createLoan(values);
      showToast("Interest loan created successfully", "success");
      router.push("/admin/interest-loan");
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "error");
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
          <main className="flex-1 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Add New Interest Loan</h1>
                <p className="text-slate-500 font-medium text-sm">Create a new standalone interest-based loan profile.</p>
              </div>
              <InterestLoanForm 
                onSubmit={handleSubmit} 
                submitting={submitting} 
                onCancel={() => router.push("/admin/interest-loan")} 
              />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AddInterestLoanPage;
