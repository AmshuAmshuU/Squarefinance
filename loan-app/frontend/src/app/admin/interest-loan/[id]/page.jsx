"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import InterestLoanDetails from "@/components/InterestLoanDetails";
import interestLoanService from "@/services/interestLoanService";
import { useToast } from "@/context/ToastContext";

const ViewInterestLoanPage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loan, setLoan] = useState(null);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      const res = await interestLoanService.getLoanById(id);
      setLoan(res.data.loan);
      setEmis(res.data.emis || []);
    } catch (err) {
      showToast(err.message || "Failed to fetch loan data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLoanData();
  }, [id]);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
              {loading ? (
                <div className="text-center py-12 text-slate-400 font-bold">Loading profile...</div>
              ) : loan ? (
                <>
                  <div className="mb-8 flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Interest Loan Profile</h1>
                      <p className="text-slate-500 font-medium text-sm">Loan Number: {loan.loanNumber} • {loan.customerName}</p>
                    </div>
                    <button 
                      onClick={() => router.push(`/admin/interest-loan/edit/${loan._id}`)}
                      className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                      Edit Profile
                    </button>
                  </div>
                  <InterestLoanDetails loan={loan} emis={emis} onRefresh={fetchLoanData} />
                </>
              ) : (
                <div className="text-center py-12 text-red-400 font-bold">Loan not found</div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default ViewInterestLoanPage;
