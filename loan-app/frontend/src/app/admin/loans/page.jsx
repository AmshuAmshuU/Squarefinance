"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getUserFromToken } from "../../../utils/auth";
import { getLoans, searchLoan, deleteLoan } from "../../../services/loan.service";
import { Trash2 } from "lucide-react";
import { exportLoansToExcel } from "../../../utils/exportExcel";
import Pagination from "../../../components/Pagination";
import ContactActionMenu from "../../../components/ContactActionMenu";

const LoansPage = () => {
  const router = useRouter();
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canCreate = isSuperAdmin || user?.permissions?.loans?.create;
  const canEdit = isSuperAdmin || user?.permissions?.loans?.edit;

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: "",
    customerName: "",
    mobileNumber: "",
    vehicleNumber: "",
    tenureMonths: "",
    status: "",
  });
  const [selectedContact, setSelectedContact] = useState(null); // For contact details modal
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }
  const [selectedRowId, setSelectedRowId] = useState(null);

  const toggleHighlight = (e, id) => {
    // Don't toggle if clicking a link or button directly
    if (e.target.closest("button") || e.target.closest("a")) return;
    setSelectedRowId((prev) => (prev === id ? null : id));
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(25);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = { page: currentPage, limit };
      if (searchQuery.trim()) {
        params.loanNumber = searchQuery;
      }
      fetchLoans({ ...filters, ...params });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  const fetchLoans = async (filterParams = {}) => {
    try {
      setLoading(true);
      const res = await getLoans({ ...filterParams, limit });
      if (res.data && res.data.loans) {
        setLoans(res.data.loans);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      } else {
        setLoans(res.data || []);
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    handleAdvancedSearch();
  };

  const handleAdvancedSearch = (e) => {
    if (e) e.preventDefault();
    const params = { ...filters, page: 1 };
    if (searchQuery.trim()) params.loanNumber = searchQuery;
    setCurrentPage(1);
    fetchLoans(params);
    setIsFilterOpen(false);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    const emptyFilters = {
      loanNumber: "",
      customerName: "",
      mobileNumber: "",
      vehicleNumber: "",
      tenureMonths: "",
      status: "",
    };
    setFilters(emptyFilters);
    setSearchQuery("");
    setCurrentPage(1);
    fetchLoans({ page: 1 });
    setIsFilterOpen(false);
  };

  const handleExport = async () => {
    try {
      const exportParams = {
        ...filters,
        forExport: "true",
        limit: 10000, // Fetch all for export
      };
      if (searchQuery.trim()) exportParams.loanNumber = searchQuery;

      const res = await getLoans(exportParams);
      const loansToExport = res.data?.loans || res.data || [];

      if (loansToExport.length === 0) {
        alert("No records found to export");
        return;
      }

      await exportLoansToExcel(
        loansToExport,
        `Loans_Report_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`,
      );
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export loans. Please try again.");
    }
  };

  const handleDelete = async (loanId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this loan? This action will permanently remove all associated EMI and payment records.",
      )
    )
      return;

    try {
      await deleteLoan(loanId);
      // Refetch current page
      fetchLoans({ ...filters, page: currentPage });
    } catch (err) {
      alert("Error deleting loan: " + err.message);
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
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}
              {/* Header Section */}
              <div className="flex justify-between items-start mb-2 sm:mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Loan Management
                  </h1>
                  <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
                    {totalRecords} RECORDS FOUND
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    className="flex bg-slate-50 text-slate-500 border border-slate-100 px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-all items-center justify-center gap-1.5 shadow-sm"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Export
                  </button>
                  {canCreate && (
                    <button
                      onClick={() => router.push("/admin/loans/add")}
                      className="bg-[#2463EB] text-white px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <span className="text-lg leading-none">+</span> Add New
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px]">
                  <form
                    onSubmit={handleSearch}
                    className="flex-1 flex items-center px-4"
                  >
                    <div className="text-slate-300 text-lg">🔍</div>
                    <input
                      type="text"
                      placeholder="Search by Loan Number (e.g. LN-001)"
                      className="w-full px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-black uppercase bg-transparent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                </div>
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="flex-none w-[46px] h-[46px] bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
                  title="Advanced Filter"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </button>
                <button
                  onClick={resetFilters}
                  className="flex-none px-6 h-[46px] bg-red-50 border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  Clear
                </button>
              </div>

              {/* MOBILE VIEW (Table Optimized for small screens) */}
              <div className="md:hidden mb-8">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className="overflow-x-auto scrollbar-none">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 uppercase">
                          <th className="w-[80px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] whitespace-nowrap sticky left-0 bg-slate-50 z-20 shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                            LOAN NO
                          </th>
                           <th className="px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] whitespace-nowrap">
                            CUSTOMER NAME
                          </th>
                          <th className="px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] whitespace-nowrap">
                            VEHICLE NO
                          </th>
                          <th className="w-[120px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] whitespace-nowrap">
                            MOBILE
                          </th>

                           <th className="w-[100px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            DISBURSEMENT
                          </th>
                          <th className="w-[100px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            EMI
                          </th>
                          <th className="w-[80px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            TENURE
                          </th>
                          <th className="w-[80px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            STATUS
                          </th>
                          <th className="w-[100px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap">
                            CLIENT RESPONSE
                          </th>
                          <th className="w-[100px] px-4 py-4 text-[9px] font-bold text-slate-400 tracking-[0.1em] text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          <tr>
                            <td
                              colSpan="8"
                              className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase"
                            >
                              Loading records...
                            </td>
                          </tr>
                        ) : loans.length === 0 ? (
                          <tr>
                            <td
                              colSpan="8"
                              className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase"
                            >
                              No records
                            </td>
                          </tr>
                        ) : (
                          loans.map((loan) => (
                            <tr
                              key={loan._id}
                              onClick={(e) => toggleHighlight(e, loan._id)}
                              className={`cursor-pointer transition-colors group ${
                                selectedRowId === loan._id
                                  ? "bg-blue-50/80"
                                  : "active:bg-slate-50"
                              }`}
                            >
                              <td
                                className={`px-3 py-3 whitespace-nowrap sticky left-0 z-10 transition-colors shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                                  selectedRowId === loan._id
                                    ? "bg-blue-50/80"
                                    : "bg-white group-active:bg-slate-50"
                                }`}
                              >
                                <Link
                                  href={`/admin/loans/edit/${loan._id || loan.id || loan.status?.id}`}
                                  className="font-bold text-slate-900 tracking-tight text-base hover:text-primary hover:underline transition-all"
                                >
                                  {loan.loanTerms?.loanNumber}
                                </Link>
                              </td>
                               <td className="px-4 py-6">
                                <span className="font-bold text-slate-700 text-base leading-tight">
                                  {loan.customerDetails?.customerName}
                                </span>
                              </td>
                              <td className="px-4 py-6">
                                <span className="font-bold text-slate-700 text-xs uppercase">
                                  {loan.vehicleInformation?.vehicleNumber || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-6">
                                <div className="flex flex-col gap-0.5">
                                  {(
                                    loan.customerDetails?.mobileNumbers || []
                                  ).map((num, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        setActiveContactMenu({
                                          number: num,
                                          name: loan.customerDetails
                                            ?.customerName,
                                          type: "Applicant",
                                          x: rect.left,
                                          y: rect.bottom,
                                        });
                                      }}
                                      className="text-xs font-bold text-slate-400 tracking-tight hover:text-primary transition-colors text-left"
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </td>

                               <td className="px-3 py-3 text-center whitespace-nowrap text-slate-900 font-bold text-xs">
                                ₹{loan.loanTerms?.principalAmount?.toLocaleString() || "0"}
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap text-[#2463EB] font-black text-base">
                                ₹
                                {loan.loanTerms?.monthlyEMI
                                  ?.toLocaleString()
                                  ?.split(".")[0] || "0"}
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-100">
                                  {loan.loanTerms?.tenureMonths}M
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border ${
                                    loan.status.status?.toLowerCase() === "closed"
                                      ? "bg-slate-100 text-slate-500 border-slate-200"
                                      : loan.status.isSeized ||
                                          loan.status.status?.toLowerCase() === "seized"
                                        ? "bg-red-50 text-red-500 border-red-100"
                                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  }`}
                                >
                                  {loan.status.status?.toLowerCase() === "closed"
                                    ? "Closed"
                                    : loan.status.isSeized ||
                                        loan.status.status?.toLowerCase() === "seized"
                                      ? "Seized"
                                      : "Active"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span
                                  title={loan.status.clientResponse}
                                  className="text-[12px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 block max-h-[100px] overflow-y-auto whitespace-normal break-words scrollbar-thin scrollbar-thumb-slate-200 mx-auto"
                                >
                                  {loan.status.clientResponse || "—"}
                                </span>
                              </td>
                              <td
                                className={`px-3 py-3 text-center whitespace-nowrap sticky right-0 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                                  selectedRowId === loan._id
                                    ? "bg-blue-50/80"
                                    : "bg-white group-active:bg-slate-50"
                                }`}
                              >
                                <div className="flex justify-center items-center gap-4">
                                  <button
                                    onClick={() => {
                                      const id =
                                        loan._id || loan.id || loan.status?.id;
                                      if (id && id !== "undefined") {
                                        router.push(`/admin/loans/${id}`);
                                      } else {
                                        console.error(
                                          "Loan ID is undefined",
                                          loan,
                                        );
                                      }
                                    }}
                                    className="text-[#2463EB] hover:scale-110 transition-transform"
                                  >
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                  </button>
                                  {canEdit && (
                                    <button
                                      onClick={() => {
                                        const id =
                                          loan._id ||
                                          loan.id ||
                                          loan.status?.id;
                                        if (id && id !== "undefined") {
                                          router.push(
                                            `/admin/loans/edit/${id}`,
                                          );
                                        } else {
                                          console.error(
                                            "Loan ID is undefined",
                                            loan,
                                          );
                                        }
                                      }}
                                      className="text-[#2463EB] hover:scale-110 transition-transform"
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                  {isSuperAdmin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(loan._id);
                                      }}
                                      className="text-rose-500 hover:scale-110 transition-transform"
                                      title="Delete Loan"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="py-4 bg-slate-50/50 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-medium text-slate-400 italic">
                      Swipe horizontally to see more details
                    </p>
                  </div>
                </div>
              </div>

              {/* DESKTOP VIEW (Table Optimized for large screens) */}
              <div className="hidden md:block">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-100 pb-1">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-slate-50 z-20 shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                            Loan Number
                          </th>
                           <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Customer Name
                          </th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Vehicle Number
                          </th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Mobile
                          </th>

                           <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            Disbursement
                          </th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            EMI
                          </th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            Tenure
                          </th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            Status
                          </th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            Client Response
                          </th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td
                              colSpan="8"
                              className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                            >
                              Loading...
                            </td>
                          </tr>
                        ) : loans.length === 0 ? (
                          <tr>
                            <td
                              colSpan="8"
                              className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                            >
                              Empty
                            </td>
                          </tr>
                        ) : (
                          loans.map((loan) => (
                            <tr
                              key={loan._id}
                              onClick={(e) => toggleHighlight(e, loan._id)}
                              className={`cursor-pointer transition-colors group ${
                                selectedRowId === loan._id
                                  ? "bg-blue-50/80"
                                  : loan.status?.isSeized && loan.status?.status?.toLowerCase() !== "closed"
                                    ? "bg-red-50/50"
                                    : "hover:bg-slate-50"
                              }`}
                            >
                              <td
                                className={`px-3 py-3 whitespace-nowrap sticky left-0 z-10 transition-colors shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                                  selectedRowId === loan._id
                                    ? "bg-blue-50/80"
                                    : loan.status?.isSeized && loan.status?.status?.toLowerCase() !== "closed"
                                      ? "bg-red-50/50"
                                      : "bg-white hover:bg-slate-50"
                                }`}
                              >
                                <Link
                                  href={`/admin/loans/edit/${loan._id || loan.id || loan.status?.id}`}
                                  className="font-black text-slate-900 uppercase text-xs tracking-tight hover:text-primary hover:underline transition-all"
                                >
                                  {loan.loanTerms?.loanNumber}
                                </Link>
                              </td>
                               <td className="px-3 py-3 whitespace-nowrap font-extrabold text-slate-800 text-xs uppercase">
                                {loan.customerDetails?.customerName}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap font-bold text-slate-600 text-[10px] uppercase">
                                {loan.vehicleInformation?.vehicleNumber || "—"}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <div className="flex flex-col gap-1 items-start">
                                  {(
                                    loan.customerDetails?.mobileNumbers || []
                                  ).map((num, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        setActiveContactMenu({
                                          number: num,
                                          name: loan.customerDetails
                                            ?.customerName,
                                          type: "Applicant",
                                          x: rect.left,
                                          y: rect.bottom,
                                        });
                                      }}
                                      className="text-slate-600 font-bold text-xs tracking-widest hover:text-primary transition-colors text-left"
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </td>

                               <td className="px-3 py-3 whitespace-nowrap text-center font-bold text-slate-900 text-xs">
                                ₹{loan.loanTerms?.principalAmount?.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center font-black text-primary text-xs">
                                ₹{loan.loanTerms?.monthlyEMI?.toLocaleString()}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black">
                                  {loan.loanTerms?.tenureMonths}M
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                                    loan.status.status?.toLowerCase() === "closed"
                                      ? "bg-slate-100 text-slate-500 border-slate-200"
                                      : loan.status.isSeized ||
                                          loan.status.status?.toLowerCase() === "seized"
                                        ? "bg-red-100 text-red-600 border-red-200"
                                        : "bg-green-100 text-green-600 border-green-200"
                                  }`}
                                >
                                  {loan.status.status?.toLowerCase() === "closed"
                                    ? "Closed"
                                    : loan.status.isSeized ||
                                        loan.status.status?.toLowerCase() === "seized"
                                      ? "Seized"
                                      : "Active"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span
                                  title={loan.status.clientResponse}
                                  className="text-[12px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 block max-h-[100px] overflow-y-auto whitespace-normal break-words scrollbar-thin scrollbar-thumb-slate-200 mx-auto"
                                >
                                  {loan.status.clientResponse || "—"}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <div className="flex justify-center items-center gap-3">
                                  <button
                                    onClick={() => {
                                      const id =
                                        loan._id || loan.id || loan.status?.id;
                                      if (id && id !== "undefined") {
                                        router.push(`/admin/loans/${id}`);
                                      } else {
                                        console.error(
                                          "Loan ID is undefined",
                                          loan,
                                        );
                                      }
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-primary border border-slate-100 transition-all"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                  </button>
                                  {canEdit && (
                                    <button
                                      onClick={() => {
                                        const id =
                                          loan._id ||
                                          loan.id ||
                                          loan.status?.id;
                                        if (id && id !== "undefined") {
                                          router.push(
                                            `/admin/loans/edit/${id}`,
                                          );
                                        } else {
                                          console.error(
                                            "Loan ID is undefined",
                                            loan,
                                          );
                                        }
                                      }}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-primary border border-slate-100 transition-all"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                  {isSuperAdmin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(loan._id);
                                      }}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:text-red-600 border border-red-100 transition-all"
                                      title="Delete Loan"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalRecords={totalRecords}
                limit={limit}
              />
            </div>
          </main>
        </div>

        {/* Advanced Filter Drawer */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsFilterOpen(false)}
            ></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-slide-in-right border-l border-slate-100 flex flex-col">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    Advanced Filter
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Refine your search results
                  </p>
                </div>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all border border-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <form
                  id="filterForm"
                  onSubmit={handleAdvancedSearch}
                  className="space-y-8"
                >
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                        Loan Number
                      </label>
                      <input
                        type="text"
                        name="loanNumber"
                        value={filters.loanNumber}
                        onChange={handleFilterChange}
                        placeholder="E.G. LN-001"
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={filters.customerName}
                        onChange={handleFilterChange}
                        placeholder="ENTER NAME"
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        name="mobileNumber"
                        value={filters.mobileNumber}
                        onChange={handleFilterChange}
                        placeholder="MOBILE NUMBER"
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        name="vehicleNumber"
                        value={filters.vehicleNumber}
                        onChange={handleFilterChange}
                        placeholder="VEHICLE NUMBER"
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                          Tenure
                        </label>
                        <input
                          type="number"
                          name="tenureMonths"
                          value={filters.tenureMonths}
                          onChange={handleFilterChange}
                          placeholder="MONTHS"
                          className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 px-1">
                          Status
                        </label>
                        <select
                          name="status"
                          value={filters.status}
                          onChange={handleFilterChange}
                          className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
                        >
                          <option value="">ALL</option>
                          <option value="Active">ACTIVE</option>
                          <option value="Closed">CLOSED</option>
                          <option value="Seized">SEIZED</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                <button
                  type="submit"
                  form="filterForm"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  🔍 APPLY FILTERS
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:text-slate-600 hover:bg-slate-50 transition-all"
                >
                  RESET FILTERS
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact Action Menu */}
      <ContactActionMenu
        contact={activeContactMenu}
        onClose={() => setActiveContactMenu(null)}
      />
    </AuthGuard>
  );
};

export default LoansPage;
