"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import ContactActionMenu from "../../../components/ContactActionMenu";
import {
  getFollowupLoans,
  updateLoan,
  toggleSeized,
  updateFollowup,
} from "../../../services/loan.service";
import Pagination from "../../../components/Pagination";
import { useToast } from "../../../context/ToastContext";
import Link from "next/link";
import TableActionMenu from "../../../components/TableActionMenu";
import ConfirmationModal from "../../../components/ConfirmationModal";

const FollowupPaymentsPage = () => {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get today's date in YYYY-MM-DD format for default filter
  const today = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    loanNumber: "",
    customerName: "",
    vehicleNumber: "",
    mobileNumber: "",
    startDate: today,
    endDate: today,
  });
  const [activeContactMenu, setActiveContactMenu] = useState(null);
  const [showSeizeModal, setShowSeizeModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [updateFormData, setUpdateFormData] = useState({
    clientResponse: "",
    nextFollowUpDate: "",
  });

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

  // Load saved filters on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem("monthlyFollowupFilters");
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
      localStorage.setItem("monthlyFollowupFilters", JSON.stringify(filters));
    }
  }, [filters, isInitialized]);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Ensure strict date filtering by always including nextFollowUpDate
      const params = { ...filters, page: currentPage, limit };
      if (searchQuery.trim()) {
        params.loanNumber = searchQuery;
      }
      fetchFollowups(params);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, filters]);

  const fetchFollowups = async (params = {}) => {
    try {
      setLoading(true);
      // Use the dedicated followup endpoint
      const res = await getFollowupLoans(params);
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
    const params = { ...filters, page: 1 };
    if (searchQuery.trim()) params.loanNumber = searchQuery;
    setCurrentPage(1);
    fetchFollowups(params);
    setIsFilterOpen(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    const resetValues = {
      loanNumber: "",
      customerName: "",
      vehicleNumber: "",
      mobileNumber: "",
      startDate: today,
      endDate: today,
    };
    setFilters(resetValues);
    localStorage.removeItem("monthlyFollowupFilters");
    setSearchQuery("");
    setCurrentPage(1);
    fetchFollowups({ ...resetValues, page: 1 });
    setIsFilterOpen(false);
  };

  const handleSeizeClick = (loanId) => {
    setSelectedLoan({ loanId });
    setShowSeizeModal(true);
  };

  const confirmSeize = async () => {
    if (!selectedLoan?.loanId) return;

    try {
      await toggleSeized(selectedLoan.loanId);
      showToast("Vehicle marked as seized", "success");
      fetchFollowups({ ...filters, page: currentPage, limit });
      setShowSeizeModal(false);
      setSelectedLoan(null);
    } catch (err) {
      showToast(err.message || "Failed to seize vehicle", "error");
    }
  };

  const handleUpdateClick = (item) => {
    setSelectedLoan(item);
    setUpdateFormData({
      clientResponse: item.clientResponse || "",
      nextFollowUpDate: item.nextFollowUpDate
        ? new Date(item.nextFollowUpDate).toISOString().split("T")[0]
        : "",
    });
    setShowUpdateModal(true);
  };

  const handleClearClick = (item) => {
    setSelectedLoan(item);
    setShowClearModal(true);
  };

  const confirmUpdateFollowup = async () => {
    if (!selectedLoan) return;

    try {
      await updateFollowup(selectedLoan.loanId, {
        loanModel: selectedLoan.loanModel,
        loanType: selectedLoan.loanType,
        clientResponse: updateFormData.clientResponse,
        nextFollowUpDate: updateFormData.nextFollowUpDate,
      });
      showToast("Follow-up updated successfully", "success");
      fetchFollowups({ ...filters, page: currentPage, limit });
      setShowUpdateModal(false);
      setSelectedLoan(null);
    } catch (err) {
      showToast(err.message || "Failed to update follow-up", "error");
    }
  };

  const confirmClearFollowup = async () => {
    if (!selectedLoan) return;

    try {
      await updateFollowup(selectedLoan.loanId, {
        loanModel: selectedLoan.loanModel,
        loanType: selectedLoan.loanType,
        nextFollowUpDate: null,
      });
      showToast("Follow-up cleared successfully", "success");
      fetchFollowups({ ...filters, page: currentPage, limit });
      setShowClearModal(false);
      setSelectedLoan(null);
    } catch (err) {
      showToast(err.message || "Failed to clear follow-up", "error");
    }
  };

  const getLoanDetailPath = (item) => {
    const returnTo = "?returnTo=/admin/followup-payments";
    if (item.loanModel === "Loan") return `/admin/loans/edit/${item.loanId}${returnTo}`;
    if (item.loanModel === "DailyLoan") return `/admin/daily-loans/edit/${item.loanId}${returnTo}`;
    if (item.loanModel === "WeeklyLoan") return `/admin/weekly-loans/edit/${item.loanId}${returnTo}`;
    if (item.loanModel === "InterestLoan") return `/admin/interest-loan/edit/${item.loanId}${returnTo}`;
    return `/admin/loans/edit/${item.loanId}${returnTo}`;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center h-[46px]">
                  <form
                    onSubmit={handleSearch}
                    className="flex-1 flex items-center px-4"
                  >
                    <div className="text-slate-300 text-lg">🔍</div>
                    <input
                      type="text"
                      placeholder="Search within this date..."
                      className="w-full px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-black uppercase bg-transparent"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
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
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Loan Type
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                          Remaining Amount
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
                            No follow-ups due
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
                            <td className="px-3 py-3 whitespace-nowrap">
                              <Link
                                href={getLoanDetailPath(item)}
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
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <span
                                className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                                  item.loanType === "Monthly"
                                    ? "bg-blue-50 text-blue-600 border-blue-100"
                                    : item.loanType === "Weekly"
                                      ? "bg-purple-50 text-purple-600 border-purple-100"
                                      : item.loanType === "Interest"
                                        ? "bg-green-50 text-green-600 border-green-100"
                                        : "bg-orange-50 text-orange-600 border-orange-100"
                                }`}
                              >
                                {item.loanType}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                                {item.unpaidMonths || 0}{" "}
                                {item.unpaidMonths === 1 ? "EMI" : "EMIs"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-black text-red-600 tracking-tight">
                                  ₹{(item.totalDueAmount || 0).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span
                                  title={item.clientResponse}
                                  className="text-[12px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 block max-h-[100px] overflow-y-auto whitespace-normal break-words scrollbar-thin scrollbar-thumb-slate-200"
                                >
                                  {item.clientResponse || "—"}
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
                                    label: "Edit Loan",
                                    onClick: () => {
                                      router.push(getLoanDetailPath(item));
                                    },
                                  },
                                  {
                                    label: "Seize Vehicle",
                                    onClick: () =>
                                      handleSeizeClick(item.loanId),
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
            </div>
          </main>
        </div>

        {/* Update Followup Modal */}
        {showUpdateModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setShowUpdateModal(false)}
            ></div>
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
              <div className="p-8 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    Update Follow-up
                  </h2>
                  <button
                    onClick={() => setShowUpdateModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  Loan #{selectedLoan?.loanNumber} | {selectedLoan?.customerName}
                </p>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Client Response
                  </label>
                  <textarea
                    rows="4"
                    value={updateFormData.clientResponse}
                    onChange={(e) =>
                      setUpdateFormData((prev) => ({
                        ...prev,
                        clientResponse: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary resize-none"
                    placeholder="Enter what the client said..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={updateFormData.nextFollowUpDate}
                    onChange={(e) =>
                      setUpdateFormData((prev) => ({
                        ...prev,
                        nextFollowUpDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpdateFollowup}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  Save Updates
                </button>
              </div>
            </div>
          </div>
        )}

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
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary"
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
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary"
                      />
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

        <ConfirmationModal
          isOpen={showClearModal}
          onClose={() => setShowClearModal(false)}
          onConfirm={confirmClearFollowup}
          title="Clear Follow-up"
          message="Are you sure you want to resolve and clear this follow-up? It will not reappear until a new follow-up date is set."
        />
      </div>
    </AuthGuard>
  );
};

export default FollowupPaymentsPage;
