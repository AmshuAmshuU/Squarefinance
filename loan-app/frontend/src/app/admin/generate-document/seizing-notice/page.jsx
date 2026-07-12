"use client";
import { useState } from "react";
import AuthGuard from "../../../../components/AuthGuard";
import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";
import { searchLoan, getLoanById } from "../../../../services/loan.service";
import { getEMIsByLoanId } from "../../../../services/customer";
import { useToast } from "../../../../context/ToastContext";
import SeizingNoticeGenerator from "../../../../components/SeizingNoticeGenerator";
import { format } from "date-fns";
import { getUserFromToken } from "../../../../utils/auth";

const SeizingNoticePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loan, setLoan] = useState(null);
  const [pendingEmis, setPendingEmis] = useState([]);
  const [bearerName, setBearerName] = useState("");
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
        const loanData = Array.isArray(res.data) ? res.data[0] : res.data;
        if (loanData) {
          const fullLoanRes = await getLoanById(loanData._id);
          setLoan(fullLoanRes.data);

          // Fetch EMIs
          const emisRes = await getEMIsByLoanId(loanData._id);
          const allEmis = emisRes.data || [];
          const pending = allEmis.filter(
            (e) =>
              e.status === "Overdue" ||
              e.status === "Partially Paid" ||
              (e.status === "Pending" &&
                new Date(e.dueDate) <= new Date(new Date().setHours(23, 59, 59))),
          );
          setPendingEmis(pending);

          showToast("Loan details fetched successfully", "success");
        } else {
          showToast("No loan found with this number", "error");
          setLoan(null);
          setPendingEmis([]);
        }
      }
    } catch (err) {
      showToast(err.message || "Failed to find loan", "error");
      setLoan(null);
      setPendingEmis([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch {
      return "-";
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
                    Seizing Notice Generator
                  </h1>
                  <p className="text-slate-500 font-medium text-sm mt-1">
                    Generate repossessing authority letters for delinquent
                    accounts
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
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all"
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
                  {/* Customer & Loan Details */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        Loan Details
                      </h2>
                      <span
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          loan.status?.status?.toLowerCase() === "closed"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : loan.status?.isSeized
                              ? "bg-red-50 text-red-600 border border-red-100"
                              : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}
                      >
                        {loan.status?.isSeized
                          ? "Seized"
                          : loan.status?.status || "Active"}
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
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          EMI Amount
                        </p>
                        <p className="text-sm font-black text-slate-900">
                          ₹{loan.loanTerms?.monthlyEMI?.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Model Year
                        </p>
                        <p className="text-sm font-black text-slate-900">
                          {!loan.vehicleInformation?.modelYear ||
                          loan.vehicleInformation?.modelYear === "N/A"
                            ? "-"
                            : loan.vehicleInformation.modelYear}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Engine No
                        </span>
                        <p className="text-sm font-bold text-slate-700 uppercase">
                          {!loan.vehicleInformation?.engineNumber ||
                          loan.vehicleInformation?.engineNumber === "N/A"
                            ? "-"
                            : loan.vehicleInformation.engineNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pending EMI Info */}
                  {pendingEmis.length > 0 && (
                    <div className="bg-red-50 rounded-3xl p-8 border border-red-100 shadow-sm">
                      <h2 className="text-lg font-black text-red-700 uppercase tracking-tight mb-4">
                        ⚠️ Pending EMIs — {pendingEmis.length} Month
                        {pendingEmis.length > 1 ? "s" : ""} Unpaid
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl p-5 border border-red-100">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
                            Pending Since
                          </p>
                          <p className="text-sm font-black text-red-700">
                            {formatDate(
                              [...pendingEmis].sort(
                                (a, b) =>
                                  new Date(a.dueDate) - new Date(b.dueDate),
                              )[0]?.dueDate,
                            )}
                          </p>
                        </div>
                        <div className="bg-white rounded-2xl p-5 border border-red-100">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
                            Total Pending Amount
                          </p>
                          <p className="text-sm font-black text-red-700">
                            ₹
                            {pendingEmis
                              .reduce(
                                (sum, e) =>
                                  sum + (e.emiAmount - (e.amountPaid || 0)),
                                0,
                              )
                              .toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-white rounded-2xl p-5 border border-red-100">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">
                            Months Overdue
                          </p>
                          <p className="text-sm font-black text-red-700">
                            {pendingEmis.length} Month
                            {pendingEmis.length > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      {/* Pending EMI List */}
                      <div className="mt-6 max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-red-400 font-black uppercase tracking-widest">
                              <th className="text-left py-2">EMI #</th>
                              <th className="text-left py-2">Due Date</th>
                              <th className="text-left py-2">Amount</th>
                              <th className="text-left py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...pendingEmis]
                              .sort(
                                (a, b) =>
                                  new Date(a.dueDate) - new Date(b.dueDate),
                              )
                              .map((emi) => (
                                <tr
                                  key={emi._id}
                                  className="border-t border-red-100"
                                >
                                  <td className="py-2 font-bold text-red-700">
                                    {emi.emiNumber}
                                  </td>
                                  <td className="py-2 font-medium text-red-600">
                                    {formatDate(emi.dueDate)}
                                  </td>
                                  <td className="py-2 font-bold text-red-700">
                                    ₹{emi.emiAmount?.toLocaleString()}
                                  </td>
                                  <td className="py-2">
                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase">
                                      {emi.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Bearer Name Input */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">
                      Bearer Details
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mb-4">
                      Enter the name of the person authorized to repossess the
                      vehicle. This name will appear on the seizing notice PDF.
                    </p>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        Mr.
                      </span>
                      <input
                        type="text"
                        placeholder="Enter bearer's full name"
                        value={bearerName}
                        onChange={(e) => setBearerName(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all"
                      />
                    </div>
                  </div>

                  {/* Seal Toggle - Super Admin Only */}
                  {user?.role === "SUPER_ADMIN" && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-xl">
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
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-center">
                    <SeizingNoticeGenerator
                      loan={loan}
                      bearerName={bearerName}
                      pendingEmis={pendingEmis}
                      showSeal={showSeal}
                    />
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

export default SeizingNoticePage;
