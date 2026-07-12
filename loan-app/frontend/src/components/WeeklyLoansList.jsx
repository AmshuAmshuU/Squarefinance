"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getWeeklyLoans,
  deleteWeeklyLoan,
} from "../services/weeklyLoan.service";
import { useToast } from "../context/ToastContext";
import { format } from "date-fns";
import TableActionMenu from "./TableActionMenu";
import Pagination from "./Pagination";
import { Trash2 } from "lucide-react";
import { exportLoansToExcel } from "../utils/excelExport";
import ContactActionMenu from "./ContactActionMenu";
import { getUserFromToken } from "../utils/auth";

const WeeklyLoansList = ({ type, title }) => {
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(25);
  const { showToast } = useToast();
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }

  const toggleHighlight = (e, id) => {
    // Don't toggle if clicking a link or button directly
    if (e.target.closest("button") || e.target.closest("a")) return;
    setSelectedRowId((prev) => (prev === id ? null : id));
  };

  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canCreate = isSuperAdmin || user?.permissions?.weeklyLoans?.create;
  const canEdit = isSuperAdmin || user?.permissions?.weeklyLoans?.edit;

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit,
      };

      if (type === "pending") {
        params.status = "Pending";
      } else if (type === "followup") {
        params.followup = "true";
      }

      if (searchQuery.trim()) {
        params.searchQuery = searchQuery;
      }

      const response = await getWeeklyLoans(params);
      const { weeklyLoans, total, pagination } = response.data;

      setLoans(weeklyLoans);
      setTotalRecords(total);
      if (pagination) {
        setTotalPages(pagination.totalPages);
      }
    } catch (err) {
      showToast(err.message || "Failed to fetch weekly loans", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLoans();
    }, 500);
    return () => clearTimeout(timer);
  }, [type, searchQuery, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this weekly loan?")) {
      try {
        await deleteWeeklyLoan(id);
        showToast("Weekly loan deleted", "success");
        fetchLoans();
      } catch (err) {
        showToast(err.message || "Failed to delete", "error");
      }
    }
  };

  const handleExport = async () => {
    try {
      showToast("Preparing export data...", "info");
      // Fetch all loans for export
      const params = {
        limit: 1000,
      };

      if (type === "pending") {
        params.status = "Pending";
      } else if (type === "followup") {
        params.followup = "true";
      }

      if (searchQuery.trim()) {
        params.searchQuery = searchQuery;
      }

      const response = await getWeeklyLoans(params);
      const allLoans = response.data.weeklyLoans;

      if (!allLoans || allLoans.length === 0) {
        showToast("No data to export", "error");
        return;
      }

      await exportLoansToExcel(allLoans, "WEEKLY");
      showToast("Weekly loans exported successfully", "success");
    } catch (err) {
      console.error("Export error:", err);
      showToast("Failed to export weekly loans", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header matching standard Loans page */}
      <div className="flex justify-between items-start mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            {title ||
              (type === "pending"
                ? "Pending Weekly Loans"
                : "Weekly Loan Followups")}
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
            <Link
              href="/admin/weekly-loans/add"
              className="bg-[#2463EB] text-white px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span className="text-lg leading-none">+</span> Add New
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar matching standard Loans page exactly */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px]">
          <div className="flex-1 flex items-center px-4">
            <div className="text-slate-300 text-lg">🔍</div>
            <input
              type="text"
              placeholder="SEARCH BY LOAN NUMBER (E.G. LN-001)"
              className="w-full px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-black uppercase bg-transparent"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <button
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
          onClick={() => setSearchQuery("")}
          className="flex-none px-6 h-[46px] bg-red-50 border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          Clear
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
        {/* MOBILE VIEW */}
        <div className="md:hidden">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-slate-50 z-20 shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                    LOAN NO
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    CUSTOMER NAME
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    MOBILE
                  </th>

                   <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                    EMI
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                    DISBURSEMENT
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                    TENURE
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                    STATUS
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                    CLIENT RESPONSE
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-12 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-12 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest"
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
                        className={`px-4 py-5 whitespace-nowrap sticky left-0 z-10 transition-colors shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                          selectedRowId === loan._id
                            ? "bg-blue-50/80"
                            : "bg-white group-hover:bg-slate-50"
                        }`}
                      >
                        <Link
                          href={`/admin/weekly-loans/edit/${loan._id}`}
                          className="text-[10px] font-black text-primary uppercase tracking-tighter bg-blue-50 px-2 py-1 rounded-md"
                        >
                          {loan.loanNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-5 whitespace-nowrap">
                        <span className="font-black text-slate-900 text-xs uppercase tracking-tighter">
                          {loan.customerName}
                        </span>
                      </td>
                      <td className="px-4 py-5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {(loan.mobileNumbers || [loan.mobileNumber]).map((num, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveContactMenu({
                                  number: num,
                                  name: loan.customerName,
                                  type: "Applicant",
                                  x: rect.left,
                                  y: rect.bottom,
                                });
                              }}
                              className="text-[10px] font-bold text-primary hover:underline transition-colors text-left"
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </td>

                       <td className="px-4 py-5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-primary text-[11px]">
                            ₹{loan.emiAmount?.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-[10px]">
                          ₹{loan.principalAmount?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black">
                          {loan.totalEmis}W
                        </span>
                      </td>
                      <td className="px-4 py-5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                            loan.status === "Active"
                              ? "bg-green-100 text-green-600 border-green-200"
                              : loan.status === "Closed"
                                ? "bg-slate-100 text-slate-500 border-slate-200"
                                : "bg-orange-100 text-orange-600 border-orange-200"
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 block max-h-[60px] overflow-y-auto whitespace-normal break-words scrollbar-none mx-auto">
                          {loan.clientResponse || "—"}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-5 text-center whitespace-nowrap sticky right-0 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                          selectedRowId === loan._id
                            ? "bg-blue-50/80"
                            : "bg-white group-hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() =>
                              router.push(`/admin/weekly-loans/${loan._id}`)
                            }
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100"
                          >
                            <svg
                              className="w-3.5 h-3.5"
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
                              onClick={() =>
                                router.push(
                                  `/admin/weekly-loans/edit/${loan._id}`,
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100"
                            >
                              <svg
                                className="w-3.5 h-3.5"
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
                              onClick={() => handleDelete(loan._id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 border border-red-100"
                              title="Delete Loan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
          <div className="py-3 bg-slate-50/50 border-t border-slate-100 text-center text-[9px] font-bold text-slate-400 italic">
            Swipe horizontally for all details
          </div>
        </div>

        {/* DESKTOP VIEW */}
        <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-slate-100 pb-1">
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
                  Mobile
                </th>

                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  EMI
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Disbursement
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Tenure
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Client Response
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
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
                    Loading records...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                  >
                    No records found
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
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td
                      className={`px-6 py-5 whitespace-nowrap sticky left-0 z-10 transition-colors shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                        selectedRowId === loan._id
                          ? "bg-blue-50/80"
                          : "bg-white group-hover:bg-slate-50"
                      }`}
                    >
                      <Link
                        href={`/admin/weekly-loans/edit/${loan._id}`}
                        className="text-[11px] font-black text-primary uppercase tracking-wider hover:underline"
                      >
                        {loan.loanNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-tight">
                        {loan.customerName}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {(loan.mobileNumbers || [loan.mobileNumber]).map((num, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveContactMenu({
                                number: num,
                                name: loan.customerName,
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

                     <td className="px-6 py-5 text-center whitespace-nowrap font-black text-primary text-xs">
                      ₹{loan.emiAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap font-bold text-slate-900 text-xs">
                      ₹{loan.principalAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black">
                        {loan.totalEmis}W
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                          loan.status === "Active"
                            ? "bg-green-100 text-green-600 border-green-200"
                            : loan.status === "Closed"
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : "bg-orange-100 text-orange-600 border-orange-200"
                        }`}
                      >
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 block max-h-[80px] overflow-y-auto whitespace-normal break-words scrollbar-none mx-auto min-w-[120px]">
                        {loan.clientResponse || "—"}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-5 text-center whitespace-nowrap sticky right-0 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                        selectedRowId === loan._id
                          ? "bg-blue-50/80"
                          : "bg-white group-hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-center items-center gap-3">
                        <button
                          onClick={() =>
                            router.push(`/admin/weekly-loans/${loan._id}`)
                          }
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
                          <Link
                            // onClick={() =>
                            //   router.push(
                            //     `/admin/weekly-loans/edit/${loan._id}`,
                            //   )
                            // }
                            href={`/admin/weekly-loans/edit/${loan._id}`}
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
                          </Link>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(loan._id)}
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

      {/* Pagination matching Monthly style */}
      {!loading && loans.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalRecords={totalRecords}
          limit={limit}
        />
      )}

      <ContactActionMenu
        contact={activeContactMenu}
        onClose={() => setActiveContactMenu(null)}
      />
    </div>
  );
};

export default WeeklyLoansList;
