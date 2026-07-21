"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import ContactActionMenu from "../../../components/ContactActionMenu";
import {
  getSeizedPending,
  updateLoan,
  toggleSeized,
  updateFollowup,
} from "../../../services/loan.service";
import ClientResponseSection from "../../../components/ClientResponseSection";
import Pagination from "../../../components/Pagination";
import { useToast } from "../../../context/ToastContext";
import Link from "next/link";
import TableActionMenu from "../../../components/TableActionMenu";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { hasPermission } from "../../../utils/auth";
import { subMonths, subDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { useUI } from "../../../context/UIContext";

const PendingPaymentsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useUI();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: "",
    customerName: "",
    vehicleNumber: "",
    mobileNumber: "",
    nextFollowUpDate: "",
  });
  const [loanTypeFilter, setLoanTypeFilter] = useState(
    searchParams.get("type") || "All",
  );
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null); // Contact Details Modal
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }
  const [showSeizeModal, setShowSeizeModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(25);
  const { showToast } = useToast();
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Client-side filter by loan type
  const filteredData = loanTypeFilter === "All" ? data : data.filter(item => {
    if (loanTypeFilter === "Monthly") return item.loanType === "Monthly";
    if (loanTypeFilter === "Weekly") return item.loanType === "Weekly";
    if (loanTypeFilter === "Daily") return item.loanType === "Daily";
    if (loanTypeFilter === "Interest") return item.loanType === "Interest";
    return true;
  });

  // Client-side pagination on filtered data
  const clientLimit = 25;
  const clientTotalPages = Math.ceil(filteredData.length / clientLimit);
  const paginatedData = filteredData.slice((currentPage - 1) * clientLimit, currentPage * clientLimit);

  const toggleHighlight = (e, id) => {
    // Don't toggle if clicking a button (like call/WhatsApp) or internal interactive element
    if (
      e.target.closest("button") ||
      e.target.closest("a") ||
      e.target.closest("select")
    )
      return;
    setSelectedRowId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = { page: 1, limit, status: "Pending" };
      if (searchQuery.trim()) {
        params.loanNumber = searchQuery;
      }
      fetchSeizedPending({ ...filters, ...params });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  const fetchSeizedPending = async (params = {}) => {
    try {
      setLoading(true);
      const res = await getSeizedPending({
        ...params,
        limit: 9999, // Load all records at once so client-side filter+pagination works correctly
      });
      if (res.data) {
        if (res.data.payments) {
          setData(res.data.payments);
          setTotalPages(res.data.pagination.totalPages);
          setTotalRecords(res.data.pagination.total);
        } else {
          setData(res.data);
        }
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    handleAdvancedSearch();
  };

  const handleAdvancedSearch = (e) => {
    if (e) e.preventDefault();
    const params = { ...filters, page: 1, status: "Pending" };
    if (searchQuery.trim()) params.loanNumber = searchQuery;
    setCurrentPage(1);
    fetchSeizedPending(params);
    setIsFilterOpen(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    const emptyFilters = {
      loanNumber: "",
      customerName: "",
      vehicleNumber: "",
      mobileNumber: "",
      nextFollowUpDate: "",
    };
    setFilters(emptyFilters);
    setSearchQuery("");
    setCurrentPage(1);
    fetchSeizedPending({ page: 1, status: "Pending" });
    setIsFilterOpen(false);
  };

  const handleSeizeClick = (loanId) => {
    setSelectedLoanId(loanId);
    setShowSeizeModal(true);
  };

  const confirmSeize = async () => {
    try {
      if (!selectedLoanId) return;
      await toggleSeized(selectedLoanId);
      showToast("Vehicle marked as seized", "success");
      setShowSeizeModal(false);
      fetchSeizedPending({ page: currentPage, status: "Pending" });
    } catch (err) {
      showToast(err.message || "Failed to seize vehicle", "error");
    }
  };

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Scoped pending payments (all loan types) dark mode overrides.
           Single style tag, kept unconditional so it covers the table and
           the filter drawer. Prefixed with .pending-payments-dark-mode so
           nothing here can affect any other page. */
        .pending-payments-dark-mode {
          background-color: #0f172a;
        }
        .pending-payments-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .pending-payments-dark-mode .bg-slate-50\/50,
        .pending-payments-dark-mode .bg-slate-50\/40 {
          background-color: rgba(51, 65, 85, 0.5) !important;
        }
        .pending-payments-dark-mode .bg-slate-50,
        .pending-payments-dark-mode .bg-slate-100 {
          background-color: #334155 !important;
        }
        .pending-payments-dark-mode .group:hover .group-hover\:bg-slate-50 {
          background-color: #334155 !important;
        }
        .pending-payments-dark-mode .hover\:bg-slate-50:hover {
          background-color: #334155 !important;
        }
        .pending-payments-dark-mode .bg-blue-50,
        .pending-payments-dark-mode .bg-blue-50\/80 {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
        .pending-payments-dark-mode .bg-red-50,
        .pending-payments-dark-mode .bg-red-50\/30,
        .pending-payments-dark-mode .bg-red-50\/60,
        .pending-payments-dark-mode .hover\:bg-red-50\/60:hover {
          background-color: rgba(239, 68, 68, 0.15) !important;
        }
        .pending-payments-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .pending-payments-dark-mode .text-slate-700 {
          color: #e2e8f0 !important;
        }
        .pending-payments-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .pending-payments-dark-mode .text-slate-500,
        .pending-payments-dark-mode .text-slate-400,
        .pending-payments-dark-mode .text-slate-300 {
          color: #94a3b8 !important;
        }
        .pending-payments-dark-mode .border-slate-50,
        .pending-payments-dark-mode .border-slate-100,
        .pending-payments-dark-mode .border-slate-200,
        .pending-payments-dark-mode .border-red-100,
        .pending-payments-dark-mode .border-red-300 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .pending-payments-dark-mode input,
        .pending-payments-dark-mode select {
          color-scheme: dark;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "pending-payments-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-start mb-2 sm:mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Pending Payments
                  </h1>
                  <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
                    {filteredData.length} RECORDS FOUND
                  </p>
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
                {/* Loan Type Filter Dropdown */}
                <div className="relative loan-type-dropdown">
                  <button
                    onClick={() => setIsTypeDropdownOpen(prev => !prev)}
                    className="flex items-center gap-2 px-3 h-[46px] bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm min-w-[110px] justify-between"
                  >
                    <span className={`w-2 h-2 rounded-full ${loanTypeFilter === "All" ? "bg-slate-300" : loanTypeFilter === "Monthly" ? "bg-purple-400" : loanTypeFilter === "Weekly" ? "bg-blue-400" : loanTypeFilter === "Daily" ? "bg-orange-400" : "bg-green-400"}`}></span>
                    <span>{loanTypeFilter === "Monthly" ? "Loans" : loanTypeFilter}</span>
                    <span className="text-slate-300">▾</span>
                  </button>
                  {isTypeDropdownOpen && (
                    <div className="absolute top-[50px] left-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden min-w-[140px]">
                      {[
                        { label: "All Types", value: "All", color: "bg-slate-300" },
                        { label: "Loans", value: "Monthly", color: "bg-purple-400" },
                        { label: "Weekly", value: "Weekly", color: "bg-blue-400" },
                        { label: "Daily", value: "Daily", color: "bg-orange-400" },
                        { label: "Interest", value: "Interest", color: "bg-green-400" },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setLoanTypeFilter(opt.value);
                            setIsTypeDropdownOpen(false);
                            router.replace(
                              opt.value === "All"
                                ? "/admin/pending-payments"
                                : `/admin/pending-payments?type=${opt.value}`,
                              { scroll: false },
                            );
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 ${loanTypeFilter === opt.value ? "bg-blue-50 text-primary" : "text-slate-600"}`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`}></span>
                          {opt.label}
                          {loanTypeFilter === opt.value && <span className="ml-auto text-primary">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={resetFilters}
                  className="flex-none px-6 h-[46px] bg-red-50 border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  Clear
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-100 pb-1">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Loan ID
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Applicant Name
                        </th>
                         <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Applicant Mobile
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Vehicle Number
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Disbursement
                        </th>

                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Months
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Remaining Amount
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap text-red-500">
                          Penalty
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Days
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Client Response
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td
                            colSpan="10"
                            className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase text-center"
                          >
                            Loading records...
                          </td>
                        </tr>
                      ) : data.length === 0 ? (
                        <tr>
                          <td
                            colSpan="10"
                            className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase text-center"
                          >
                            No records found
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((item) => {
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          const hasFollowUp = item.nextFollowUpDate && new Date(item.nextFollowUpDate) >= today;
                          const isAttended = hasFollowUp || item.clientResponse;
                          
                          // Row colour: unattended = prominent red tint, attended with future followup = subtle, selected = blue
                          const rowClass = selectedRowId === item.loanId
                            ? "bg-blue-50/80"
                            : isAttended
                            ? "bg-slate-50/40 opacity-70 hover:opacity-100 hover:bg-slate-50"
                            : "bg-red-50/30 border-l-4 border-red-300 hover:bg-red-50/60";

                          return (
                          <tr
                            key={item.loanId}
                            onClick={(e) => toggleHighlight(e, item.loanId)}
                            className={`cursor-pointer transition-colors group ${rowClass}`}
                          >
                            <td className="px-3 py-3 whitespace-nowrap">
                              <Link
                                href={`/admin/pending-payments/view/${item.earliestEmiId}`}
                                className="text-[11px] font-black text-primary uppercase tracking-wider hover:underline"
                              >
                                {item.loanNumber}
                              </Link>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="font-black text-slate-900 text-xs uppercase tracking-tight">
                                {item.customerName}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                               <div className="flex flex-col gap-0.5 mt-1">
                                {(item.mobileNumbers || []).map((num, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      setActiveContactMenu({
                                        number: num,
                                        name: item.customerName,
                                        type: "Applicant",
                                        x: rect.left,
                                        y: rect.bottom,
                                        });
                                      }}
                                      className="text-[11px] font-bold text-primary hover:underline transition-colors text-left"
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                  {item.vehicleNumber || "—"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <span className="text-[11px] font-black text-slate-900 tracking-tight">
                                  ₹{item.principalAmount?.toLocaleString() || "—"}
                                </span>
                              </td>

                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                                {item.unpaidMonths}{" "}
                                {item.unpaidMonths === 1 ? "Month" : "Months"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-black text-red-600 tracking-tight">
                                  ₹{item.totalDueAmount.toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap font-black text-rose-500 text-xs tracking-tight bg-red-50/30">
                              {item.penalOverdue > 0 ? `₹${item.penalOverdue.toLocaleString()}` : "—"}
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                {(() => {
                                  const today = startOfDay(new Date());
                                  const due = startOfDay(new Date(item.earliestDueDate));
                                  let startDate;

                                  if (item.loanType === "Daily") {
                                    // For Daily, pending days starts after due date passes
                                    startDate = due;
                                  } else if (item.loanType === "Weekly") {
                                    // Weekly: starts from 7 days before due date
                                    startDate = subDays(due, 7);
                                  } else {
                                    // Monthly: starts from 1 month before due date
                                    startDate = subMonths(due, 1);
                                  }

                                  const days = differenceInCalendarDays(today, startDate);

                                  let colorClass = "bg-slate-500";
                                  let label = "";
                                  let glowClass = "";

                                  if (days >= 1) {
                                    if (days >= 70) {
                                      colorClass = "bg-red-600";
                                      glowClass = "shadow-[0_0_15px_rgba(220,38,38,0.5)]";
                                    } else if (days >= 31) {
                                      colorClass = "bg-orange-500";
                                      glowClass = "shadow-[0_0_15px_rgba(249,115,22,0.5)]";
                                    } else {
                                      colorClass = "bg-yellow-400 text-black";
                                      glowClass = "shadow-[0_0_15px_rgba(250,204,21,0.5)]";
                                    }
                                    label = `Day ${days}`;
                                  } else if (days === 0 && item.loanType === "Daily") {
                                    colorClass = "bg-blue-500";
                                    label = "Due Today";
                                  } else if (days <= 0) {
                                    colorClass = "bg-emerald-500 font-bold";
                                    label = days === 0 ? "Due Today" : `In ${Math.abs(days)} Days`;
                                  }

                                  return (
                                    <span
                                      className={`text-[10px] font-black tracking-tight px-3 py-1.5 rounded-lg inline-block min-w-[80px] shadow-sm transform transition-all duration-300 hover:scale-110 ${colorClass} ${glowClass}`}
                                    >
                                      {label}
                                    </span>
                                  );
                                })()}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center">
                                <span
                                  title={
                                    item.clientResponse ||
                                    item.status?.clientResponse
                                  }
                                  className="text-[12px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 max-h-[100px] overflow-y-auto whitespace-normal break-words scrollbar-thin scrollbar-thumb-slate-200"
                                >
                                  {item.clientResponse ||
                                    item.status?.clientResponse ||
                                    "—"}
                                </span>
                              </div>
                            </td>
                            <td
                              className={`px-3 py-3 text-center whitespace-nowrap sticky right-0 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                                selectedRowId === item.loanId
                                  ? "bg-blue-50/80"
                                  : "bg-white group-hover:bg-slate-50"
                              }`}
                            >
                              <TableActionMenu
                                actions={[
                                  {
                                    label: "View",
                                    onClick: () => {
                                      if (
                                        item.earliestEmiId &&
                                        item.earliestEmiId !== "undefined"
                                      ) {
                                        router.push(
                                          `/admin/pending-payments/view/${item.earliestEmiId}`,
                                        );
                                      } else {
                                        showToast(
                                          "No pending EMI found for this loan",
                                          "error",
                                        );
                                      }
                                    },
                                  },
                                  ...(hasPermission("loans.edit")
                                    ? [
                                        {
                                          label: "Seize Vehicle",
                                          onClick: () =>
                                            handleSeizeClick(item.loanId),
                                        },
                                      ]
                                    : []),
                                ]}
                              />
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={clientTotalPages}
                onPageChange={handlePageChange}
                totalRecords={filteredData.length}
                limit={limit}
              />
            </div>
          </main>
        </div>

        {/* Filter Drawer */}
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
                    Filters
                  </h2>
                </div>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-100"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <form
                  id="filterForm"
                  onSubmit={handleAdvancedSearch}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Loan Number
                    </label>
                    <input
                      type="text"
                      name="loanNumber"
                      value={filters.loanNumber}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Applicant Name
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={filters.customerName}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      value={filters.vehicleNumber}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      name="mobileNumber"
                      value={filters.mobileNumber}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      name="nextFollowUpDate"
                      value={filters.nextFollowUpDate}
                      onChange={handleFilterChange}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary"
                    />
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
        {/* Contact Action Menu */}
        <ContactActionMenu
          contact={activeContactMenu}
          onClose={() => setActiveContactMenu(null)}
        />

        <ConfirmationModal
          isOpen={showSeizeModal}
          onClose={() => setShowSeizeModal(false)}
          onConfirm={confirmSeize}
          title="Confirm Seizure"
          message="Are you sure you want to mark this vehicle as seized? This action cannot be undone."
        />
      </div>
    </AuthGuard>
  );
};

export default PendingPaymentsPage;
