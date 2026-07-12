"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../../components/AuthGuard";
import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";
import LoanForm from "../../../../components/LoanForm";
import { createLoan } from "../../../../services/loan.service";
import { useToast } from "../../../../context/ToastContext";

const AddLoanPage = () => {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const initialData = {
    customerDetails: {
      customerName: "",
      address: "",
      ownRent: "Own",
      panNumber: "",
      aadharNumber: "",
      mobileNumbers: [""],
      guarantorName: "",
      guarantorMobileNumbers: [""],
    },
    loanTerms: {
      loanNumber: "",
      principalAmount: "",
      annualInterestRate: "",
      tenureMonths: "",
      tenureType: "Monthly",
      dateLoanDisbursed: "",
      emiStartDate: "",
      emiEndDate: "",
      monthlyEMI: "",
      totalInterestAmount: "",
      processingFee: "",
      processingFeeRate: "0",
    },
    vehicleInformation: {
      vehicleNumber: "",
      chassisNumber: "",
      engineNumber: "",
      modelYear: "",
      typeOfVehicle: "",
      ywBoard: "Yellow",
      dealerName: "",
      dealerNumber: "",
      fcDate: "",
      insuranceDate: "",
      rtoWorkPending: [],
    },
    status: {
      status: "Active",
      clientResponse: "",
      nextFollowUpDate: "",
    },
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await createLoan(formData);
      showToast("Loan profile created successfully", "success");
      router.push("/admin/loans");
    } catch (err) {
      showToast(err.message || "Failed to create loan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  Create New Loan Profile
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Initialize a new loan record in the system
                </p>
              </div>

              <LoanForm
                initialData={initialData}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/admin/loans")}
                submitting={submitting}
              />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AddLoanPage;
