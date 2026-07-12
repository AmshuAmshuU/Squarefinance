"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getUserFromToken } from "../../../utils/auth";
import { getExpiredDocLoans } from "../../../services/loan.service";
import Pagination from "../../../components/Pagination";

const ExpiredLoansPage = () => {
  const router = useRouter();
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canEdit = isSuperAdmin || user?.permissions?.loans?.edit;

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchExpiredLoans(currentPage);
  }, [currentPage, filterType, dateFilter]);

  const fetchExpiredLoans = async (page) => {
    try {
      setLoading(true);
      const res = await getExpiredDocLoans({
        page,
        limit,
        search: searchTerm,
        filterType: filterType === "all" ? "" : filterType,
        date: dateFilter
      });
      if (res.data && res.data.loans) {
        setLoans(res.data.loans);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchExpiredLoans(1);
  };

  const toggleHighlight = (e, id) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    setSelectedRowId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isDateExpired = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Expired Documents
                  </h1>
                  <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
                    {totalRecords} LOANS WITH EXPIRED FC/INSURANCE
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search Loan #, Name, or Vehicle #..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                    />
                    <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-md shadow-primary/20"
                  >
                    Search
                  </button>
                </form>

                {/* Filter Options */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <select
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm cursor-pointer min-w-[160px]"
                    >
                      <option value="all">1. Document: All</option>
                      <option value="vehicle">1. Vehicle (All)</option>
                      <option value="fc">2. FC Expired</option>
                      <option value="insurance">3. Insurance Expired</option>
                    </select>
                    <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className="relative">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm h-full"
                    />
                  </div>

                  {(searchTerm || filterType !== "all" || dateFilter) && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterType("all");
                        setDateFilter("");
                        setCurrentPage(1);
                      }}
                      className="px-4 py-3 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-slate-50 z-20 shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                          Loan Number
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Customer Name
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Vehicle Number
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          FC Date
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Insurance Date
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">
                            Loading...
                          </td>
                        </tr>
                      ) : loans.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">
                            No expired documents found
                          </td>
                        </tr>
                      ) : (
                        loans.map((loan) => (
                          <tr
                            key={loan._id}
                            onClick={(e) => toggleHighlight(e, loan._id)}
                            className={`cursor-pointer transition-colors ${
                              selectedRowId === loan._id ? "bg-blue-50/80" : "hover:bg-slate-50"
                            }`}
                          >
                            <td className={`px-6 py-4 whitespace-nowrap sticky left-0 z-10 transition-colors shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                              selectedRowId === loan._id ? "bg-blue-50/80" : "bg-white hover:bg-slate-50"
                            }`}>
                              <Link
                                href={`/admin/loans/edit/${loan._id}`}
                                className="font-black text-slate-900 uppercase text-xs hover:text-primary transition-all border-b-2 border-transparent hover:border-primary"
                              >
                                {loan.loanTerms?.loanNumber}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-800 text-xs uppercase">
                              {loan.customerDetails?.customerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-600 text-xs uppercase">
                              {loan.vehicleInformation?.vehicleNumber || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`text-[11px] font-black ${isDateExpired(loan.vehicleInformation?.fcDate) ? "text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100" : "text-slate-500"}`}>
                                {formatDate(loan.vehicleInformation?.fcDate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`text-[11px] font-black ${isDateExpired(loan.vehicleInformation?.insuranceDate) ? "text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100" : "text-slate-500"}`}>
                                {formatDate(loan.vehicleInformation?.insuranceDate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center gap-3">
                                <button
                                  onClick={() => router.push(`/admin/loans/edit/${loan._id}`)}
                                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white border border-primary/10 transition-all shadow-sm"
                                  title="Edit Loan"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
                totalRecords={totalRecords}
                limit={limit}
              />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default ExpiredLoansPage;
