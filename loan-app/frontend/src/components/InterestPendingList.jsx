"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import interestLoanService from "@/services/interestLoanService";
import Pagination from "./Pagination";
import { useToast } from "@/context/ToastContext";
import TableActionMenu from "./TableActionMenu";
import ContactActionMenu from "./ContactActionMenu";
import { getUserFromToken } from "../utils/auth";

const InterestPendingList = () => {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeContactMenu, setActiveContactMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(25);
  const { showToast } = useToast();
  const user = getUserFromToken();

  const fetchPending = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
      };

      if (searchQuery.trim()) {
        params.searchQuery = searchQuery.trim();
      }

      const res = await interestLoanService.getPendingPayments(params);
      if (res.data) {
        setData(res.data.pendingPayments || []);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      }
    } catch (err) {
      showToast(err.message || "Failed to fetch pending payments", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPending();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Interest Pending Payments
          </h1>
          <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
            {totalRecords} OVERDUE INTEREST PAYMENTS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px]">
          <div className="flex-1 flex items-center px-4">
            <div className="text-slate-300 text-lg">🔍</div>
            <input
              type="text"
              placeholder="SEARCH BY LOAN NUMBER OR CUSTOMER..."
              className="w-full px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-black uppercase bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => setSearchQuery("")}
          className="flex-none px-6 h-[46px] bg-red-50 border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          Clear Search
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
                  Disbursement
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Months Pending
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Total Due
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Penalty
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Overdue Days
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
                    colSpan="10"
                    className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                  >
                    Loading records...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                  >
                    No pending interest payments found
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
                        href={`/admin/interest-loan/pending/view/${item.earliestEmiId}?from=pending`}
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
                    <td className="px-6 py-5 text-center whitespace-nowrap font-bold text-slate-600 text-xs tracking-tight">
                      ₹{item.initialPrincipalAmount?.toLocaleString() || "0"}
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
                    <td className="px-6 py-5 text-center whitespace-nowrap font-bold text-orange-600 text-xs tracking-tight">
                      ₹{item.penalOverdue?.toLocaleString() || "0"}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      {(() => {
                        const days = differenceInDays(
                          new Date(),
                          new Date(item.earliestDueDate)
                        );
                        let colorClass = "bg-slate-100 text-slate-500";
                        if (days >= 30) colorClass = "bg-red-100 text-red-600";
                        else if (days >= 7)
                          colorClass = "bg-orange-100 text-orange-600";
                        return (
                          <span
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${colorClass}`}
                          >
                            {days} DAYS
                          </span>
                        );
                      })()}
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
                                `/admin/interest-loan/pending/view/${item.earliestEmiId}?from=pending`
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

      <ContactActionMenu
        contact={activeContactMenu}
        onClose={() => setActiveContactMenu(null)}
      />
    </div>
  );
};

export default InterestPendingList;
