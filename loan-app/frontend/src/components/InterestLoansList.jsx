"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import interestLoanService from "@/services/interestLoanService";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";
import TableActionMenu from "./TableActionMenu";
import Pagination from "./Pagination";
import { Trash2, Eye, Edit, Download } from "lucide-react";
import ContactActionMenu from "./ContactActionMenu";
import { getUserFromToken } from "@/utils/auth";
import { exportLoansToExcel } from "@/utils/exportExcel";

const InterestLoansList = ({ type, title }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [activeContactMenu, setActiveContactMenu] = useState(null);

  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const canCreate = isSuperAdmin || user?.permissions?.interestLoans?.create;
  const canEdit = isSuperAdmin || user?.permissions?.interestLoans?.edit;

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(25);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: "",
    customerName: "",
    mobileNumber: "",
    status: "",
  });

  const toggleHighlight = (e, id) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    setSelectedRowId((prev) => (prev === id ? null : id));
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit,
        ...filters,
      };

      if (searchQuery.trim()) {
        params.searchQuery = searchQuery.trim();
      }

      const response = await interestLoanService.getAllLoans(params);
      const { loans: dataLoans, pagination } = response.data;

      setLoans(dataLoans);
      setTotalRecords(pagination.total);
      setTotalPages(pagination.totalPages);
    } catch (err) {
      showToast(err.message || "Failed to fetch interest loans", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLoans();
    }, 500);
    return () => clearTimeout(timer);
  }, [type, searchQuery, currentPage, filters]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this interest loan?")) {
      try {
        await interestLoanService.deleteLoan(id);
        showToast("Interest loan deleted", "success");
        fetchLoans();
      } catch (err) {
        showToast(err.message || "Failed to delete", "error");
      }
    }
  };

  const handleExportAll = async () => {
    try {
      showToast("Preparing export...", "info");
      const response = await interestLoanService.getAllLoans({ limit: 5000 });
      const { loans: allLoans } = response.data;

      if (allLoans && allLoans.length > 0) {
        await exportLoansToExcel(allLoans, "INTEREST");
        showToast("Export successful", "success");
      } else {
        showToast("No data to export", "warning");
      }
    } catch (err) {
      showToast(err.message || "Export failed", "error");
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      loanNumber: "",
      customerName: "",
      mobileNumber: "",
      status: "",
    });
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            {title || "Interest Loan Management"}
          </h1>
          <p className="text-slate-400 font-bold text-[9px] sm:text-sm uppercase tracking-[0.15em] mt-1.5">
            {totalRecords} RECORDS FOUND
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            className="flex bg-slate-50 text-slate-500 border border-slate-100 px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-all items-center justify-center gap-1.5 shadow-sm"
          >
            <Download size={14} /> Export
          </button>
          {canCreate && (
            <Link
              href="/admin/interest-loan/add"
              className="bg-[#2463EB] text-white px-4 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span className="text-lg leading-none">+</span> Add New
            </Link>
          )}
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex-none w-[46px] h-[46px] bg-white border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
          title="Advanced Filter"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
        <button
          onClick={resetFilters}
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
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-slate-50 z-20 shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)]">LOAN NO</th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CUSTOMER NAME</th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">MOBILE</th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">INTEREST</th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">DISBURSEMENT</th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">STATUS</th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">CLIENT RESPONSE</th>
                  <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="8" className="px-4 py-12 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">Loading...</td></tr>
                ) : loans.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-12 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">No records</td></tr>
                ) : (
                  loans.map((loan) => (
                    <tr
                      key={loan._id}
                      onClick={(e) => toggleHighlight(e, loan._id)}
                      className={`cursor-pointer transition-colors group ${selectedRowId === loan._id ? "bg-blue-50/80" : "active:bg-slate-50"}`}
                    >
                      <td className={`px-4 py-5 whitespace-nowrap sticky left-0 z-10 transition-colors shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)] ${selectedRowId === loan._id ? "bg-blue-50/80" : "bg-white group-hover:bg-slate-50"}`}>
                        <Link href={`/admin/interest-loan/edit/${loan._id}`} className="text-[10px] font-black text-primary uppercase tracking-tighter bg-blue-50 px-2 py-1 rounded-md">{loan.loanNumber}</Link>
                      </td>
                      <td className="px-4 py-5 whitespace-nowrap">
                        <span className="font-black text-slate-900 text-xs uppercase tracking-tighter">{loan.customerName}</span>
                      </td>
                      <td className="px-4 py-5 whitespace-nowrap text-center">
                        <div className="flex flex-col gap-0.5 items-center">
                          {(loan.mobileNumbers || []).map((num, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveContactMenu({ number: num, name: loan.customerName, type: "Applicant", x: rect.left, y: rect.bottom });
                              }}
                              className="text-[10px] font-bold text-primary hover:underline transition-colors text-left"
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center whitespace-nowrap">
                        <span className="font-black text-primary text-[10px]">₹{Math.round((loan.remainingPrincipalAmount * loan.interestRate) / 100).toLocaleString("en-IN")}</span>
                      </td>
                      <td className="px-4 py-5 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-[10px]">₹{(loan.principalAmount || loan.initialPrincipalAmount)?.toLocaleString("en-IN")}</span>
                      </td>
                      <td className="px-4 py-5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                          loan.status === "Active" ? "bg-green-100 text-green-600 border-green-200" :
                          loan.status === "Closed" ? "bg-slate-100 text-slate-500 border-slate-200" :
                          "bg-orange-100 text-orange-600 border-orange-200"
                        }`}>{loan.status}</span>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 block max-h-[60px] overflow-y-auto whitespace-normal break-words scrollbar-none mx-auto">
                          {loan.clientResponse || "—"}
                        </span>
                      </td>
                      <td className={`px-4 py-5 text-center whitespace-nowrap sticky right-0 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] ${selectedRowId === loan._id ? "bg-blue-50/80" : "bg-white group-hover:bg-slate-50"}`}>
                        <div className="flex justify-center items-center gap-2">
                           <button onClick={() => router.push(`/admin/interest-loan/edit/${loan._id}`)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100"><Eye size={14} /></button>
                           {canEdit && <button onClick={() => router.push(`/admin/interest-loan/edit/${loan._id}`)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100"><Edit size={14} /></button>}
                           {isSuperAdmin && <button onClick={() => handleDelete(loan._id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 border border-red-100"><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DESKTOP VIEW */}
        <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-slate-100 pb-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap sticky left-0 bg-slate-50 z-20 shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)]">LOAN NUMBER</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CUSTOMER NAME</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">MOBILE</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">INTEREST</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">DISBURSEMENT</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">STATUS</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">CLIENT RESPONSE</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">Loading records...</td></tr>
              ) : loans.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase">No records found</td></tr>
              ) : (
                loans.map((loan) => (
                  <tr
                    key={loan._id}
                    onClick={(e) => toggleHighlight(e, loan._id)}
                    className={`cursor-pointer transition-colors group ${selectedRowId === loan._id ? "bg-blue-50/80" : "hover:bg-slate-50"}`}
                  >
                    <td className={`px-6 py-5 whitespace-nowrap sticky left-0 z-10 transition-colors shadow-[10px_0_15px_-3px_rgba(0,0,0,0.05)] ${selectedRowId === loan._id ? "bg-blue-50/80" : "bg-white group-hover:bg-slate-50"}`}>
                      <Link href={`/admin/interest-loan/edit/${loan._id}`} className="text-[11px] font-black text-primary uppercase tracking-wider hover:underline">{loan.loanNumber}</Link>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-tight">{loan.customerName}</span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {(loan.mobileNumbers || []).map((num, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveContactMenu({ number: num, name: loan.customerName, type: "Applicant", x: rect.left, y: rect.bottom });
                            }}
                            className="text-slate-600 font-bold text-xs tracking-widest hover:text-primary transition-colors text-left"
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap font-black text-primary text-xs">
                      ₹{Math.round((loan.remainingPrincipalAmount * loan.interestRate) / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap font-bold text-slate-900 text-xs">
                      ₹{(loan.principalAmount || loan.initialPrincipalAmount)?.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                        loan.status === "Active" ? "bg-green-100 text-green-600 border-green-200" :
                        loan.status === "Closed" ? "bg-slate-100 text-slate-500 border-slate-200" :
                        "bg-orange-100 text-orange-600 border-orange-200"
                      }`}>{loan.status}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 block max-h-[80px] overflow-y-auto whitespace-normal break-words scrollbar-none mx-auto min-w-[120px]">
                        {loan.clientResponse || "—"}
                      </span>
                    </td>
                    <td className={`px-6 py-5 text-center whitespace-nowrap sticky right-0 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] ${selectedRowId === loan._id ? "bg-blue-50/80" : "bg-white group-hover:bg-slate-50"}`}>
                      <div className="flex justify-center items-center gap-3">
                         <button onClick={() => router.push(`/admin/interest-loan/edit/${loan._id}`)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-primary border border-slate-100 transition-all"><Eye size={16} /></button>
                         {canEdit && <button onClick={() => router.push(`/admin/interest-loan/edit/${loan._id}`)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-primary border border-slate-100 transition-all"><Edit size={16} /></button>}
                         {isSuperAdmin && <button onClick={() => handleDelete(loan._id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:text-red-600 border border-red-100 transition-all"><Trash2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && loans.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalRecords={totalRecords}
          limit={limit}
        />
      )}

      {/* Filter Drawer */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[150] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsFilterOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl animate-slide-in-right transform transition-transform">
            <div className="h-full flex flex-col">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Advanced Filter</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Refine your interest loan search</p>
                </div>
                <button onClick={() => setIsFilterOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all shadow-sm">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Loan Number</label>
                  <input type="text" name="loanNumber" value={filters.loanNumber} onChange={handleFilterChange} placeholder="E.G. IN-001" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Customer Name</label>
                  <input type="text" name="customerName" value={filters.customerName} onChange={handleFilterChange} placeholder="E.G. JOHN DOE" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Mobile Number</label>
                  <input type="text" name="mobileNumber" value={filters.mobileNumber} onChange={handleFilterChange} placeholder="E.G. 9876543210" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Loan Status</label>
                  <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary uppercase appearance-none">
                    <option value="">ALL STATUSES</option>
                    <option value="Active">ACTIVE</option>
                    <option value="Closed">CLOSED</option>
                  </select>
                </div>
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                <button onClick={() => setIsFilterOpen(false)} className="w-full bg-primary text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">🔍 APPLY FILTERS</button>
                <button onClick={resetFilters} className="w-full bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:text-slate-600 hover:bg-slate-50 transition-all">RESET FILTERS</button>
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

export default InterestLoansList;
