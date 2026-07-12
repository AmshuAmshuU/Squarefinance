"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import ContactActionMenu from "../../../components/ContactActionMenu";
import {
  getSeizedPending,
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

const PartialPaymentsPage = () => {
  const router = useRouter();
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
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }
  const [showSeizeModal, setShowSeizeModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseDetails, setResponseDetails] = useState({
    loanId: "",
    loanModel: "Loan",
    clientResponse: "",
    nextFollowUpDate: "",
    updatedBy: null,
    updatedAt: null,
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(25);
  const { showToast } = useToast();
  const [selectedRowId, setSelectedRowId] = useState(null);

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
      const params = { page: currentPage, limit, status: "Partially Paid" };
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
        status: params.status || "Partially Paid",
        limit,
      });
      if (res.data) {
        if (res.data.payments) {
          setData(res.data.payments);
          if (res.data.pagination) {
            setTotalPages(res.data.pagination.totalPages || 1);
            setTotalRecords(res.data.pagination.total || 0);
          }
        } else {
          setData(res.data);
          setTotalPages(1);
          setTotalRecords(res.data.length || 0);
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
    const params = { ...filters, page: 1, status: "Partially Paid" };
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
    fetchSeizedPending({ page: 1, status: "Partially Paid" });
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
      fetchSeizedPending({ page: currentPage, status: "Partially Paid" });
    } catch (err) {
      showToast(err.message || "Failed to seize vehicle", "error");
    }
  };

  const handleResponseClick = (item) => {
    setResponseDetails({
      loanId: item.loanId,
      loanModel: item.loanModel || "Loan",
      clientResponse: item.clientResponse || (item.status?.clientResponse || ""),
      nextFollowUpDate: item.nextFollowUpDate || (item.status?.nextFollowUpDate || "").split("T")[0],
      updatedBy: item.updatedBy || item.status?.updatedBy,
      updatedAt: item.updatedAt || item.status?.updatedAt,
    });
    setShowResponseModal(true);
  };

  const handleResponseUpdate = async () => {
    try {
      await updateFollowup(responseDetails.loanId, {
        loanModel: responseDetails.loanModel,
        clientResponse: responseDetails.clientResponse,
        nextFollowUpDate: responseDetails.nextFollowUpDate,
      });
      showToast("Response updated successfully", "success");
      setShowResponseModal(false);
      fetchSeizedPending({ page: currentPage, status: "Partially Paid" });
    } catch (err) {
      showToast(err.message || "Failed to update response", "error");
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-start mb-2 sm:mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Partial Payments
                  </h1>
                  <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
                    {totalRecords} RECORDS FOUND
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
                          Applicant Name
                        </th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Applicant Mobile
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Vehicle Number
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Disbursement
                        </th>

                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                          Customer Response
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Months
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Remaining Amount
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Days
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
                        data.map((item) => (
                          <tr
                            key={item.loanId}
                            onClick={(e) => toggleHighlight(e, item.loanId)}
                            className={`cursor-pointer transition-colors group ${
                              selectedRowId === item.loanId
                                ? "bg-blue-50/80"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-6 py-5 whitespace-nowrap">
                              <Link
                                href={`/admin/pending-payments/view/${item.earliestEmiId}?from=partial`}
                                className="text-[11px] font-black text-primary uppercase tracking-wider hover:underline"
                              >
                                {item.loanNumber}
                              </Link>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className="font-black text-slate-900 text-xs uppercase tracking-tight">
                                {item.customerName}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
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
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                  {item.vehicleNumber || "—"}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-center whitespace-nowrap">
                                <span className="text-[11px] font-black text-slate-900 tracking-tight">
                                  ₹{item.principalAmount?.toLocaleString() || "—"}
                                </span>
                              </td>

                            <td className="px-3 py-3">
                              <div className="flex items-center">
                                <span
                                  className="font-bold text-slate-600 text-[12px] uppercase tracking-tight max-h-[100px] overflow-y-auto whitespace-normal break-words scrollbar-thin scrollbar-thumb-slate-200"
                                  title={
                                    item.clientResponse ||
                                    item.status?.clientResponse
                                  }
                                >
                                  {item.clientResponse ||
                                    item.status?.clientResponse ||
                                    "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center whitespace-nowrap">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                                {item.unpaidMonths}{" "}
                                {item.unpaidMonths === 1 ? "Month" : "Months"}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-black text-orange-600 tracking-tight">
                                  ₹{item.totalDueAmount.toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center whitespace-nowrap">
                              {(() => {
                                const days = Math.floor(
                                  (new Date().setHours(23, 59, 59, 999) -
                                    new Date(item.earliestDueDate)) /
                                    (1000 * 60 * 60 * 24),
                                );
                                let colorClass = "text-slate-600";
                                if (days >= 71) colorClass = "text-red-600";
                                else if (days >= 36)
                                  colorClass = "text-orange-600";
                                else if (days >= 1)
                                  colorClass = "text-yellow-600";

                                return (
                                  <span
                                    className={`text-[10px] font-black tracking-tight px-3 py-1.5 rounded-lg inline-block min-w-[80px] text-white ${colorClass.replace("text-", "bg-")}`}
                                  >
                                    {days > 0 ? `${days} Days` : "0 Days"}
                                  </span>
                                );
                              })()}
                            </td>
                            <td
                              className={`px-6 py-5 text-center whitespace-nowrap sticky right-0 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                                selectedRowId === item.loanId
                                  ? "bg-blue-50/80"
                                  : "bg-white group-hover:bg-slate-50"
                              }`}
                            >
                              <TableActionMenu
                                actions={[
                                  {
                                    label: "View",
                                    onClick: () =>
                                      item.earliestEmiId &&
                                      item.earliestEmiId !== "undefined"
                                        ? router.push(
                                            `/admin/pending-payments/view/${item.earliestEmiId}?from=partial`,
                                          )
                                        : showToast(
                                            "No pending EMI found for this loan",
                                            "error",
                                          ),
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
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      value={filters.vehicleNumber}
                      onChange={handleFilterChange}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
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
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase"
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
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary"
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
      </div>
    </AuthGuard>
  );
};

export default PartialPaymentsPage;
