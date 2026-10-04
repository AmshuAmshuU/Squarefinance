"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "../../../../components/AuthGuard";
import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";
import LoanForm from "../../../../components/LoanForm";
import LoanDraftsPanel from "../../../../components/LoanDraftsPanel";
import { createLoan } from "../../../../services/loan.service";
import { saveRateDraft, getLoanDraft } from "../../../../services/loanDraft.service";
import { useToast } from "../../../../context/ToastContext";
import { useUI } from "../../../../context/UIContext";

const AddLoanPage = () => {
  const router = useRouter();
  const { isDarkMode } = useUI();
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");
  const [draft, setDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(!!draftId);

  const blankData = {
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

  // Continuing a saved draft: load the form exactly as it was left.
  useEffect(() => {
    if (!draftId) {
      setDraft(null);
      setDraftLoading(false);
      return;
    }
    let cancelled = false;
    setDraftLoading(true);
    getLoanDraft(draftId)
      .then((res) => {
        if (cancelled) return;
        if (res.data.status === "Completed") {
          showToast("This draft was already used to create a loan", "error");
          router.replace("/admin/loans/add");
          return;
        }
        setDraft(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        showToast(err.message || "Could not open this draft", "error");
        router.replace("/admin/loans/add");
      })
      .finally(() => {
        if (!cancelled) setDraftLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const initialData = draft?.formData
    ? {
        customerDetails: { ...blankData.customerDetails, ...draft.formData.customerDetails },
        loanTerms: { ...blankData.loanTerms, ...draft.formData.loanTerms },
        vehicleInformation: { ...blankData.vehicleInformation, ...draft.formData.vehicleInformation },
        status: { ...blankData.status, ...draft.formData.status },
      }
    : blankData;

  // Interest rate below 2.00: save the form as a draft and ask the Super
  // Admin to approve it. The employee can leave and come back later.
  const handleRequestRateApproval = async (values) => {
    try {
      const res = await saveRateDraft(draft?._id, values);
      showToast(res.message || "Draft saved", "success");
      if (!draft?._id) {
        router.replace(`/admin/loans/add?draft=${res.data._id}`);
      } else {
        const fresh = await getLoanDraft(draft._id);
        setDraft(fresh.data);
      }
    } catch (err) {
      showToast(err.message || "Could not save the draft", "error");
    }
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await createLoan(draft?._id ? { ...formData, draftId: draft._id } : formData);
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
      <style jsx global>{`
        .loan-add-dark-mode {
          background-color: #0f172a;
        }
        .loan-add-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .loan-add-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "loan-add-dark-mode" : ""}`}>
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
                  {draft
                    ? `Continuing a saved draft${draft.loanNumber ? ` - loan ${draft.loanNumber}` : ""}`
                    : "Initialize a new loan record in the system"}
                </p>
              </div>

              <LoanDraftsPanel activeDraftId={draft?._id} />

              {draftLoading ? (
                <div className="text-center py-12 text-slate-400 font-bold">Opening draft...</div>
              ) : (
                <LoanForm
                  key={draft?._id || "new"}
                  initialData={initialData}
                  onSubmit={handleSubmit}
                  onCancel={() => router.push("/admin/loans")}
                  submitting={submitting}
                  rateDraft={draft}
                  onRequestRateApproval={handleRequestRateApproval}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

const AddLoanPageWithSuspense = () => (
  <Suspense fallback={null}>
    <AddLoanPage />
  </Suspense>
);

export default AddLoanPageWithSuspense;
