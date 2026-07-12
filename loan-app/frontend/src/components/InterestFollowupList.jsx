"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import interestLoanService from "@/services/interestLoanService";
import Pagination from "./Pagination";
import { useToast } from "@/context/ToastContext";
import TableActionMenu from "./TableActionMenu";
import ContactActionMenu from "./ContactActionMenu";
import { getUserFromToken } from "../utils/auth";

const InterestFollowupList = () => {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeContactMenu, setActiveContactMenu] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get today's date in YYYY-MM-DD format for default filter
  const today = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    loanNumber: "",
    customerName: "",
    mobileNumber: "",
    startDate: today,
    endDate: today,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(25);
  const { showToast } = useToast();
  const user = getUserFromToken();

  // Load saved filters on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem("interestFollowupFilters");
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        setFilters((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse saved filters", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save filters on change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("interestFollowupFilters", JSON.stringify(filters));
    }
  }, [filters, isInitialized]);

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: currentPage,
        limit,
      };

      if (searchQuery.trim()) {
        params.loanNumber = searchQuery.trim();
      }

      const res = await interestLoanService.getFollowupPayments(params);
      if (res.data) {
        setData(res.data.payments || []);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      }
    } catch (err) {
      showToast(err.message || "Failed to fetch follow-ups", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFollowups();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      loanNumber: "",
      customerName: "",
      mobileNumber: "",
      startDate: today,
      endDate: today,
    });
    localStorage.removeItem("interestFollowupFilters");
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Interest Loan Followups
          </h1>
          <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
            {totalRecords} FOLLOW-UPS DUE
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px]">
          <div className="flex-1 flex items-center px-4">
            <div className="text-slate-300 text-lg">🔍</div>
            <input
              type="text"
              placeholder="SEARCH BY LOAN NUMBER..."
              className="w-full px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-black uppercase bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex-none w-[46px] h-[46px] bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
          title="Change Date / Filters"
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
        <button
          onClick={resetFilters}
          className="flex-none px-6 h-[46px] bg-blue-50 border border-blue-100 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          Reset To Today
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-100 pb-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Loan ID
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Applicant Name
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Applicant Mobile
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Months Pending
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Total Due
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Client Response
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                  >
                    Loading records...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                  >
                    No follow-ups found for this date
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.loanId}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <Link
                        href={`/admin/interest-loan/pending/view/${item.earliestEmiId}?from=followup`}
                        className="text-[11px] font-black text-primary uppercase tracking-wider hover:underline"
                      >
                        {item.loanNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap font-black text-slate-900 text-xs uppercase tracking-tight">
                      {item.customerName}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        {(item.mobileNumbers || []).map((num, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
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
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                        {item.unpaidMonths}{" "}
                        {item.unpaidMonths === 1 ? "Month" : "Months"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap font-black text-red-600 text-sm tracking-tight">
                      ₹{item.totalDueAmount?.toLocaleString() || "0"}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center max-w-[200px] mx-auto">
                        <span
                          className="text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 truncate w-full"
                          title={item.clientResponse}
                        >
                          {item.clientResponse || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                      <TableActionMenu
                        actions={[
                          {
                            label: "View",
                            onClick: () =>
                              router.push(
                                `/admin/interest-loan/pending/view/${item.earliestEmiId}?from=followup`
                              ),
                          },
                          {
                            label: "Edit Loan",
                            onClick: () =>
                              router.push(
                                `/admin/interest-loan/edit/${item.loanId}`
                              ),
                          },
                        ]}
                      />
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
        onPageChange={(p) => setCurrentPage(p)}
        totalRecords={totalRecords}
        limit={limit}
      />

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
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Loan Number
                  </label>
                  <input
                    type="text"
                    name="loanNumber"
                    value={filters.loanNumber}
                    onChange={handleFilterChange}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
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
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      From Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      To Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <button
                onClick={() => setIsFilterOpen(false)}
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

      <ContactActionMenu
        contact={activeContactMenu}
        onClose={() => setActiveContactMenu(null)}
      />

    </div>
  );
};

export default InterestFollowupList;
