"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { getDailyPendingPayments, deleteDailyLoan } from "../services/dailyLoan.service";
import Pagination from "./Pagination";
import { useToast } from "../context/ToastContext";
import TableActionMenu from "./TableActionMenu";
import ContactActionMenu from "./ContactActionMenu";
import { updateFollowup } from "../services/loan.service";
import ClientResponseSection from "./ClientResponseSection";
import { getUserFromToken } from "../utils/auth";

const DailyPendingList = () => {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(25);
  const { showToast } = useToast();
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseDetails, setResponseDetails] = useState({
    loanId: "",
    loanModel: "DailyLoan",
    clientResponse: "",
    nextFollowUpDate: "",
    updatedBy: null,
    updatedAt: null,
  });

  const fetchPending = async () => {
    try {
      setLoading(true);
      const params = {
        pageNum: currentPage,
        limitNum: limit,
        loanNumber: searchQuery,
      };

      const res = await getDailyPendingPayments(params);
      if (res.data) {
        setData(res.data.payments || []);
        setTotalPages(res.data.pagination.totalPages);
        setTotalRecords(res.data.pagination.total);
      }
      setError("");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this daily loan?")) {
      try {
        await deleteDailyLoan(id);
        showToast("Daily loan deleted", "success");
        fetchPending();
      } catch (err) {
        showToast(err.message || "Failed to delete", "error");
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPending();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleResponseClick = (item) => {
    setResponseDetails({
      loanId: item.loanId,
      loanModel: "DailyLoan",
      clientResponse: item.clientResponse || "",
      nextFollowUpDate: item.nextFollowUpDate
        ? item.nextFollowUpDate.split("T")[0]
        : "",
      updatedBy: item.updatedBy,
      updatedAt: item.updatedAt,
    });
    setShowResponseModal(true);
  };

  const handleResponseUpdate = async () => {
    try {
      if (!responseDetails.clientResponse || !responseDetails.nextFollowUpDate) {
        showToast("Please fill all fields", "error");
        return;
      }

      await updateFollowup(responseDetails.loanId, {
        clientResponse: responseDetails.clientResponse,
        nextFollowUpDate: responseDetails.nextFollowUpDate,
        loanModel: "DailyLoan",
      });

      showToast("Response updated successfully", "success");
      setShowResponseModal(false);
      fetchPending();
    } catch (err) {
      showToast(err.message || "Failed to update response", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Daily Pending Payments
          </h1>
          <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
            {totalRecords} OVERDUE RECORDS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px]">
          <div className="flex-1 flex items-center px-4">
            <div className="text-slate-300 text-lg">🔍</div>
            <input
              type="text"
              placeholder="SEARCH BY LOAN NUMBER (E.G. DL-001)"
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Loan ID
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Customer Name
                </th>
                 <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Mobile Number
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Disbursement
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Days Pending
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Total Due
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap text-red-500">
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
                      colSpan="9"
                      className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                    >
                      Loading records...
                    </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                     <td
                      colSpan="9"
                      className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase"
                    >
                      No pending payments found
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
                        href={`/admin/daily-loans/edit/${item.loanId}`}
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
                        {(item.mobileNumbers || [item.mobileNumber]).map((num, idx) => (
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
                    <td className="px-6 py-5 text-center whitespace-nowrap font-black text-slate-900 text-xs tracking-tight">
                      ₹{item.principalAmount?.toLocaleString() || "—"}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                        {item.unpaidCount}{" "}
                        {item.unpaidCount === 1 ? "Day" : "Days"}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap font-black text-red-600 text-sm tracking-tight">
                      ₹{item.totalDueAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap font-black text-rose-500 text-xs tracking-tight bg-red-50/30">
                      {item.penalOverdue > 0 ? `₹${item.penalOverdue.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      {(() => {
                        const days = differenceInDays(
                          new Date(),
                          new Date(item.earliestDueDate),
                        );
                        const displayDays = days + 1;
                        let bgColor = "bg-slate-500";
                        if (displayDays >= 8) bgColor = "bg-red-600";
                        else if (displayDays >= 4) bgColor = "bg-orange-600";
                        else if (displayDays >= 2) bgColor = "bg-yellow-600";

                        return (
                          <span
                            className={`text-[10px] font-black tracking-tight px-3 py-1.5 rounded-lg inline-block min-w-[80px] text-white ${bgColor}`}
                          >
                            {displayDays} {displayDays === 1 ? "Day" : "Days"}
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
                                `/admin/daily-loans/pending/view/${item.earliestEmiId}?from=pending`,
                              ),
                          },
                          {
                            label: "Edit Loan",
                            onClick: () =>
                              router.push(
                                `/admin/daily-loans/edit/${item.loanId}`,
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
        onPageChange={handlePageChange}
        totalRecords={totalRecords}
        limit={limit}
      />

      <ContactActionMenu
        contact={activeContactMenu}
        onClose={() => setActiveContactMenu(null)}
      />

      {/* Update Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowResponseModal(false)}
          ></div>
          <div className="relative w-full max-w-xl animate-scale-up">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Update Client Response
                </h2>
                <button
                  onClick={() => setShowResponseModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-100"
                >
                  ✕
                </button>
              </div>
              <div className="p-8 bg-slate-50/50">
                <ClientResponseSection
                  clientResponse={responseDetails.clientResponse}
                  nextFollowUpDate={responseDetails.nextFollowUpDate}
                  updatedBy={responseDetails.updatedBy}
                  updatedAt={responseDetails.updatedAt}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setResponseDetails((prev) => ({
                      ...prev,
                      [name]: value,
                    }));
                  }}
                />
                <div className="mt-8 flex justify-end gap-3">
                  <button
                    onClick={() => setShowResponseModal(false)}
                    className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResponseUpdate}
                    className="bg-primary text-white px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    Save Response
                  </button>
                </div>
              </div>
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

export default DailyPendingList;
