"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getAllEMIs } from "../../../services/customer";
import Pagination from "../../../components/Pagination";
import ContactActionMenu from "../../../components/ContactActionMenu";

const EMIDetailsPage = () => {
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: "",
    customerName: "",
    mobileNumber: "",
    vehicleNumber: "",
    status: "",
  });
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);

  const fetchEMIs = useCallback(
    async (params = {}) => {
      try {
        setLoading(true);
        const response = await getAllEMIs({ ...params, limit });
        if (response.data && response.data.emis) {
          setEmis(response.data.emis || []);
          setTotalPages(response.data.pagination.totalPages);
          setTotalRecords(response.data.pagination.total);
        } else {
          setEmis(response.data || []);
        }
      } catch (err) {
        setError(err.message || "Failed to fetch EMI details");
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = { page: currentPage, limit };
      if (searchQuery.trim()) {
        params.loanNumber = searchQuery;
      }
      fetchEMIs({ ...filters, ...params });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, fetchEMIs, filters, limit]);

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
    fetchEMIs(params);
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
      mobileNumber: "",
      vehicleNumber: "",
      status: "",
    };
    setFilters(emptyFilters);
    setSearchQuery("");
    setCurrentPage(1);
    fetchEMIs({ page: 1 });
    setIsFilterOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const customerWiseEMIs = useMemo(() => {
    const grouped = emis.reduce((acc, emi) => {
      const key = emi.loanId || emi.loanNumber;
      if (!acc[key]) {
        acc[key] = {
          loanId: emi.loanId,
          loanNumber: emi.loanNumber,
          customerName: emi.customerName,
          totalEMIs: 0,
          paidEMIs: 0,
          totalAmount: 0,
          amountPaid: 0,
          nextDueDate: null,
          lastPaymentDate: null,
          lastUpdate: emi.updatedAt,
          status: "Pending",
          mobileNumbers: emi.mobileNumbers || [],
          guarantorMobileNumbers: emi.guarantorMobileNumbers || [],
          guarantorName:
            !emi.guarantorName || emi.guarantorName === "N/A"
              ? "-"
              : emi.guarantorName,
        };
      }

      const group = acc[key];
      group.totalEMIs += 1;
      group.totalAmount += emi.emiAmount;
      group.amountPaid += emi.amountPaid || 0;

      if (emi.status === "Paid") {
        group.paidEMIs += 1;
      }

      if (
        emi.paymentDate &&
        (!group.lastPaymentDate ||
          new Date(emi.paymentDate) > new Date(group.lastPaymentDate))
      ) {
        group.lastPaymentDate = emi.paymentDate;
      }

      const emiUpdateDate = new Date(emi.updatedAt);
      if (emiUpdateDate > new Date(group.lastUpdate)) {
        group.lastUpdate = emi.updatedAt;
      }

      // Find next pending EMI
      if (
        emi.status !== "Paid" &&
        (!group.nextDueDate ||
          new Date(emi.dueDate) < new Date(group.nextDueDate))
      ) {
        group.nextDueDate = emi.dueDate;
        group.status = emi.status;
      }

      return acc;
    }, {});

    return Object.values(grouped)
      .filter(
        (item) =>
          (item.customerName?.toLowerCase() || "").includes(
            searchQuery.toLowerCase(),
          ) ||
          (item.loanNumber?.toLowerCase() || "").includes(
            searchQuery.toLowerCase(),
          ) ||
          (item.mobileNumbers || []).some((num) => num.includes(searchQuery)),
      )
      .sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
  }, [emis, searchQuery]);

  const exportToExcel = () => {
    // Filter and sort individual EMIs for the detailed export
    const filteredEmis = emis
      .filter(
        (emi) =>
          (emi.customerName?.toLowerCase() || "").includes(
            searchQuery.toLowerCase(),
          ) ||
          (emi.loanNumber?.toLowerCase() || "").includes(
            searchQuery.toLowerCase(),
          ),
      )
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const headers = [
      "Loan Number",
      "Customer Name",
      "EMI No.",
      "Due Date",
      "EMI Amount",
      "Amount Paid",
      "Payment Date",
      "Payment Mode",
      "Overdue",
      "Status",
      "Remarks",
    ];

    const rows = filteredEmis.map((emi) => [
      emi.loanNumber || "-",
      emi.customerName || "-",
      emi.emiNumber || "-",
      formatDate(emi.dueDate),
      emi.emiAmount || 0,
      emi.amountPaid || 0,
      formatDate(emi.paymentDate),
      emi.paymentMode || "-",
      emi.overdue || 0,
      emi.status || "Pending",
      emi.remarks || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Detailed_EMI_History_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-2">
                    EMI Ledger
                  </h1>
                  <p className="text-slate-500 font-medium text-sm">
                    Customer-wise payment tracking and account history
                  </p>
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
                  <button
                    onClick={exportToExcel}
                    disabled={customerWiseEMIs.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-6 h-[46px] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    Synchronizing Records...
                  </p>
                </div>
              ) : customerWiseEMIs.length === 0 ? (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    No matching accounts identified
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                  {/* MOBILE VIEW */}
                  <div className="md:hidden">
                    <div className="overflow-x-auto scrollbar-none">
                      <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200 uppercase">
                            <th className="w-[100px] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400">
                              LOAN NO
                            </th>
                            <th className="px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400">
                              CUSTOMER NAME
                            </th>
                            <th className="w-[120px] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400">
                              MOBILE
                            </th>

                            <th className="w-[100px] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                              MILESTONE
                            </th>
                            <th className="w-[120px] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">
                              PAID
                            </th>
                            <th className="w-[100px] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">
                              NEXT DUE
                            </th>
                            <th className="w-[100px] px-4 py-4 text-[9px] font-black uppercase tracking-wider text-slate-400 sticky right-0 bg-slate-50/50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                              ACTIONS
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {customerWiseEMIs.map((group) => (
                            <tr
                              key={group.loanId || group.loanNumber}
                              className="active:bg-slate-50 transition-colors group"
                              onClick={() => {
                                if (
                                  group.loanId &&
                                  group.loanId !== "undefined"
                                ) {
                                  window.location.href = `/admin/loans/edit/${group.loanId}`;
                                } else {
                                  console.error("Loan ID is undefined", group);
                                }
                              }}
                            >
                              <td className="px-4 py-5">
                                <span className="bg-blue-50 text-sky-600 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">
                                  {group.loanNumber}
                                </span>
                              </td>
                              <td className="px-4 py-5">
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tighter truncate">
                                  {group.customerName}
                                </p>
                              </td>
                              <td className="px-4 py-5 font-bold text-slate-500 text-[10px] whitespace-nowrap">
                                <div className="flex flex-col gap-0.5 mt-1">
                                  {group.mobileNumbers.map((num, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        setActiveContactMenu({
                                          number: num,
                                          name: group.customerName,
                                          type: "Applicant",
                                          x: rect.left,
                                          y: rect.bottom,
                                        });
                                      }}
                                      className="text-[9px] font-bold text-primary hover:underline transition-colors text-left"
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </td>

                              <td className="px-4 py-5 text-center">
                                <span className="text-[10px] font-black text-slate-900">
                                  {group.paidEMIs}/{group.totalEMIs}
                                </span>
                              </td>
                              <td className="px-4 py-5 text-right font-black text-emerald-600 text-[11px] whitespace-nowrap">
                                ₹{group.amountPaid.toLocaleString()}
                              </td>
                              <td className="px-4 py-5 text-center">
                                <span className="text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap">
                                  {formatDate(group.nextDueDate)}
                                </span>
                              </td>
                              <td className="px-4 py-5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border ${
                                    group.status === "Paid"
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                      : group.status === "Overdue"
                                        ? "bg-red-50 text-red-600 border-red-100"
                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                  }`}
                                >
                                  {group.status}
                                </span>
                              </td>
                              <td
                                className="px-4 py-5 text-center whitespace-nowrap sticky right-0 bg-white group-active:bg-slate-50 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex justify-center items-center gap-2">
                                  <button
                                    onClick={() => {
                                      if (group.loanId) {
                                        window.location.href = `/admin/loans/${group.loanId}`;
                                      }
                                    }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-primary border border-slate-100 hover:scale-110 transition-transform"
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
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="py-3 bg-slate-50/50 border-t border-slate-100 text-center">
                      <p className="text-[9px] font-bold text-slate-400 italic">
                        Swipe horizontally for timeline details
                      </p>
                    </div>
                  </div>

                  {/* DESKTOP VIEW */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Acc No.
                          </th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Customer Profile
                          </th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">
                            EMI Milestone
                          </th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">
                            Total Value
                          </th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">
                            Balance Paid
                          </th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">
                            Next Due
                          </th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">
                            Activity
                          </th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerWiseEMIs.map((group) => (
                          <tr
                            key={group.loanId || group.loanNumber}
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                            onClick={() => {
                              if (
                                group.loanId &&
                                group.loanId !== "undefined"
                              ) {
                                window.location.href = `/admin/loans/edit/${group.loanId}`;
                              } else {
                                console.error("Loan ID is undefined", group);
                              }
                            }}
                          >
                            <td className="px-6 py-4">
                              <span className="bg-blue-50 text-sky-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                {group.loanNumber}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">
                                  {group.customerName}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {group.mobileNumbers.map((num, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        setActiveContactMenu({
                                          number: num,
                                          name: group.customerName,
                                          type: "Applicant",
                                          x: rect.left,
                                          y: rect.bottom,
                                        });
                                      }}
                                      className="text-[9px] font-black text-blue-500 hover:text-primary transition-colors hover:underline"
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black text-slate-900">
                                  {group.paidEMIs} / {group.totalEMIs}
                                </span>
                                <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{
                                      width: `${
                                        (group.paidEMIs / group.totalEMIs) * 100
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-slate-900">
                              ₹{group.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-xs font-black text-emerald-600">
                                ₹{group.amountPaid.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                                {formatDate(group.nextDueDate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {formatDate(group.lastPaymentDate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                  group.status === "Paid"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : group.status === "Overdue"
                                      ? "bg-red-50 text-red-600 border border-red-100"
                                      : group.status === "Partially Paid"
                                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                                        : "bg-amber-50 text-amber-600 border border-amber-100"
                                }`}
                              >
                                {group.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 uppercase"
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
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 uppercase"
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
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300"
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
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 uppercase"
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
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
                      >
                        <option value="">ALL</option>
                        <option value="Paid">PAID</option>
                        <option value="Partially Paid">PARTIALLY PAID</option>
                        <option value="Pending">PENDING</option>
                        <option value="Overdue">OVERDUE</option>
                      </select>
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
        {/* Contact Action Menu Popover */}
        <ContactActionMenu
          contact={activeContactMenu}
          onClose={() => setActiveContactMenu(null)}
        />{" "}
      </div>
    </AuthGuard>
  );
};

export default EMIDetailsPage;
