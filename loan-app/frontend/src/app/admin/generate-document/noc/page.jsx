"use client";
import { useState } from "react";
import AuthGuard from "../../../../components/AuthGuard";
import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";
import { searchLoan, getLoanById } from "../../../../services/loan.service";
import { useToast } from "../../../../context/ToastContext";
import NOCGenerator from "../../../../components/NOCGenerator";
import { getUserFromToken } from "../../../../utils/auth";

const NOCPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSeal, setShowSeal] = useState(false);
  const { showToast } = useToast();
  const user = getUserFromToken();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await searchLoan(searchQuery);
      if (res.data) {
        // searchLoan might return an array or a single object based on backend implementation
        // Usually search endpoints return arrays. Let's handle both.
        const loanData = Array.isArray(res.data) ? res.data[0] : res.data;
        if (loanData) {
          // Fetch full loan details if search only returns partial
          const fullLoanRes = await getLoanById(loanData._id);
          setLoan(fullLoanRes.data);
          showToast("Loan details fetched successfully", "success");
        } else {
          showToast("No loan found with this number", "error");
          setLoan(null);
        }
      }
    } catch (err) {
      showToast(err.message || "Failed to find loan", "error");
      setLoan(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    NOC Generation
                  </h1>
                  <p className="text-slate-500 font-medium text-sm mt-1">
                    Search and generate No Objection Certificates for closed
                    loans
                  </p>
                </div>
              </div>

              {/* Search Section */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-8">
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col md:flex-row gap-4"
                >
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search Loan Number (e.g. LN-001)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                      🔍
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    {loading ? "Searching..." : "Search Loan"}
                  </button>
                </form>
              </div>

              {/* Loan Details Section */}
              {loan ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        Loan Parameters
                      </h2>
                      <span
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          loan.status?.status?.toLowerCase() === "closed"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}
                      >
                        {loan.status?.status || "Active"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Loan Number
                        </p>
                        <p className="text-sm font-black text-slate-900">
                          {loan.loanTerms?.loanNumber}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Customer Name
                        </p>
                        <p className="text-sm font-black text-slate-900">
                          {loan.customerDetails?.customerName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Vehicle Number
                        </p>
                        <p className="text-sm font-black text-slate-900">
                          {loan.vehicleInformation?.vehicleNumber}
                        </p>
                      </div>
                    </div>

                    {loan.status?.status?.toLowerCase() !== "closed" && (
                      <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                          ⚠️ Warning: This loan is still active. Usually, NOCs
                          are only generated for closed accounts.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Seal Toggle - Super Admin Only */}
                  {user?.role === "SUPER_ADMIN" && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-xl">
                          ✍️
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                            Add Seal & Signature
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Officially stamp this document
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={showSeal}
                          onChange={(e) => setShowSeal(e.target.checked)}
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-center">
                    <NOCGenerator loan={loan} showSeal={showSeal} />
                  </div>
                </div>
              ) : (
                !loading && (
                  <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
                    <p className="text-slate-400 font-bold text-sm">
                      Enter a loan number above to start
                    </p>
                  </div>
                )
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default NOCPage;
