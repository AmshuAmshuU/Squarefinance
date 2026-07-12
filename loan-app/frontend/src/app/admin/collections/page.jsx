"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import AddExpenseModal from "../../../components/AddExpenseModal";
import { getCollectionTransactions, getLoansGivenSummary } from "../../../services/collection.service";
import { getAllExpenses } from "../../../services/expenseService";
import { useToast } from "../../../context/ToastContext";
import { format } from "date-fns";
import Pagination from "../../../components/Pagination";

const CollectionsPage = () => {
  const { showToast } = useToast();
  
  // TABS State
  const [activeTab, setActiveTab] = useState("collections"); // "collections" | "loans" | "expenses"

  // Data States
  const [collections, setCollections] = useState([]);
  const [loansGiven, setLoansGiven] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // Pagination States
  const [pagination, setPagination] = useState({
    collections: { page: 1, total: 0, totalPages: 0, limit: 25 },
    loans: { page: 1, total: 0, totalPages: 0, limit: 25 },
    expenses: { page: 1, total: 0, totalPages: 0, limit: 25 }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [summaryTotals, setSummaryTotals] = useState({
    collections: 0,
    loans: 0,
    expenses: 0
  });

  // Filters State - Default to last 7 days
  const [filters, setFilters] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  // Modal State for Expenses
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const fetchCollections = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await getCollectionTransactions({ ...filters, page, limit: 25 });
      if (res.data) {
        setCollections(res.data.transactions || []);
        if (res.data.summary) {
          setSummaryTotals(prev => ({ ...prev, collections: res.data.summary.totalAmount }));
        }
        if (res.data.pagination) {
          setPagination(prev => ({
            ...prev,
            collections: { ...prev.collections, ...res.data.pagination }
          }));
        }
      }
    } catch (err) {
      setError(err.message);
      showToast("Failed to fetch collections", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  const fetchLoansGiven = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const res = await getLoansGivenSummary({ ...filters, page, limit: 25 });
      if (res.data) {
        setLoansGiven(res.data.loans || []);
        if (res.data.summary) {
          setSummaryTotals(prev => ({ ...prev, loans: res.data.summary.totalAmount }));
        }
        if (res.data.pagination) {
          setPagination(prev => ({
            ...prev,
            loans: { ...prev.loans, ...res.data.pagination }
          }));
        }
      }
    } catch (err) {
      setError(err.message);
      showToast("Failed to fetch loans given", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAllExpenses(filters);
      const data = res.data;
      setExpenses(Array.isArray(data) ? data : (data?.expenses || data?.data || []));
      if (data?.summary) {
        setSummaryTotals(prev => ({ ...prev, expenses: data.summary.totalAmount }));
      }
    } catch (err) {
      setError(err.message);
      showToast("Failed to fetch expenses", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  const fetchAllData = useCallback(() => {
    fetchCollections(pagination.collections.page);
    fetchLoansGiven(pagination.loans.page);
    fetchExpenses();
  }, [fetchCollections, fetchLoansGiven, fetchExpenses, pagination.collections.page, pagination.loans.page]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, activeTab]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = () => {
    // Reset to page 1 on filter submit and fetch all
    setPagination(prev => ({
      ...prev,
      collections: { ...prev.collections, page: 1 },
      loans: { ...prev.loans, page: 1 },
      expenses: { ...prev.expenses, page: 1 }
    }));
    
    fetchAllData();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], page: newPage }
    }));
  };

  const getLoanEditLink = (id, modelOrType) => {
    const model = modelOrType?.toLowerCase();
    if (model === "loan" || model === "monthly") return `/admin/loans/edit/${id}`;
    if (model === "weeklyloan" || model === "weekly") return `/admin/weekly-loans/edit/${id}`;
    if (model === "dailyloan" || model === "daily") return `/admin/daily-loans/edit/${id}`;
    return "#";
  };

  // Render Functions for distinct tables
  const renderCollectionsTable = () => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Loan No</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">EMI No</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Name</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">EMI Paid</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Overdue</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Type</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Payment Mode</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Collector</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {loading ? (
          <tr><td colSpan="10" className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">Synchronizing records...</td></tr>
        ) : collections.length === 0 ? (
          <tr><td colSpan="10" className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">No transactions found for this period</td></tr>
        ) : (
          collections.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-xs font-black text-slate-900 whitespace-nowrap">
                <Link 
                  href={getLoanEditLink(item.loanId, item.loanModel)}
                  className="text-primary hover:underline underline-offset-4 decoration-2"
                >
                  {item.loanNumber}
                </Link>
              </td>
              <td className="px-6 py-4 text-xs text-center font-black text-slate-500">
                {item.emiNo || '-'}
              </td>
              <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase whitespace-nowrap truncate max-w-[150px]">{item.customerName}</td>
              <td className="px-6 py-4 text-xs text-right font-black text-emerald-600">
                ₹{item.emiAmount?.toLocaleString() || '0'}
              </td>
              <td className="px-6 py-4 text-xs text-right font-black text-red-600">
                ₹{item.overdueAmount?.toLocaleString() || '0'}
              </td>
              <td className="px-6 py-4 text-xs text-right font-black text-indigo-600 bg-slate-50/30">
                ₹{item.totalAmount?.toLocaleString() || item.amount?.toLocaleString() || '0'}
              </td>
              <td className="px-6 py-4 text-xs text-center">
                <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase border ${
                  item.paymentType === 'Monthly' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                  item.paymentType === 'Weekly' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                  item.paymentType === 'Overdue' ? 'bg-red-50 text-red-600 border-red-100' :
                  item.paymentType === 'Foreclosure' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  {item.paymentType}
                </span>
              </td>
              <td className="px-6 py-4 text-xs text-center font-bold text-slate-500 uppercase whitespace-nowrap">
                {item.paymentMode || '-'}
              </td>
              <td className="px-6 py-4 text-xs font-bold text-slate-500 text-center whitespace-nowrap">
                {item.date || item.createdAt ? 
                  format(new Date(item.date || item.createdAt), "dd-MM-yyyy") : 
                  '-'}
              </td>
              <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-center whitespace-nowrap">
                {item.updatedBy || 'N/A'}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const renderLoansGivenTable = () => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Loan No</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Name</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Type</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Created By</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {loading ? (
          <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase">Loading...</td></tr>
        ) : loansGiven.length === 0 ? (
          <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase">No loans disbursed for this period</td></tr>
        ) : (
          loansGiven.map((item, idx) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 text-xs font-black text-slate-900">
                <Link 
                  href={getLoanEditLink(item._id, item.type)}
                  className="text-primary hover:underline underline-offset-4 decoration-2"
                >
                  {item.loanNumber}
                </Link>
              </td>
              <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">{item.customerName}</td>
              <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase">{item.mobileNumber}</td>
              <td className="px-6 py-4 text-xs text-right font-black text-indigo-600">₹{item.loanAmount?.toLocaleString()}</td>
              <td className="px-6 py-4 text-xs text-center">
                <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase border ${
                  item.type === 'Monthly' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                  item.type === 'Weekly' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                  'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  {item.type}
                </span>
              </td>
              <td className="px-6 py-4 text-xs font-bold text-slate-500 text-center">{format(new Date(item.date), "dd-MM-yyyy")}</td>
              <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase text-center">{item.createdBy}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const renderExpensesTable = () => (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-100">
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan #</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle #</th>
          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Particulars</th>
          <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {loading ? (
          <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase">Loading...</td></tr>
        ) : expenses.length === 0 ? (
          <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-300 font-bold text-xs uppercase">No expenses found</td></tr>
        ) : (
          expenses.map((expense) => (
            <tr key={expense._id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-bold text-slate-700 text-xs">
                  {format(new Date(expense.date), "dd-MM-yyyy")}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-blue-50 text-primary text-[10px] font-black rounded-lg border border-blue-100 uppercase">
                  {expense.loanNumber || "OFFICE"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-black text-slate-900 text-[10px] uppercase tracking-wider">
                  {!expense.vehicleNumber || expense.vehicleNumber === "N/A" ? "-" : expense.vehicleNumber}
                </span>
              </td>
              <td className="px-3 py-3">
                <p className="text-slate-500 font-medium text-xs max-w-xs">{expense.particulars}</p>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <span className="font-black text-rose-600 text-xs">₹{expense.amount.toLocaleString()}</span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    Financial Reports
                  </h1>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">
                    COLLECTIONS, DISBURSEMENTS & EXPENSES
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 mt-6 md:mt-0">
                  {activeTab === "collections" && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-w-[160px]">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Collection</span>
                      <span className="text-2xl font-black text-emerald-600 tracking-tighter">₹{summaryTotals.collections.toLocaleString()}</span>
                    </div>
                  )}
                  {activeTab === "loans" && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-w-[160px]">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Loans Given</span>
                      <span className="text-2xl font-black text-emerald-600 tracking-tighter">₹{summaryTotals.loans.toLocaleString()}</span>
                    </div>
                  )}
                  {activeTab === "expenses" && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-w-[160px]">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Expenses</span>
                      <span className="text-2xl font-black text-emerald-600 tracking-tighter">₹{summaryTotals.expenses.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* TABS */}
              <div className="flex mb-8 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm overflow-x-auto min-w-max md:min-w-0 w-max">
                 <button 
                  onClick={() => setActiveTab("collections")}
                  className={`px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === "collections" ? "bg-primary text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"}`}
                 >
                   Collections
                 </button>
                 <button 
                  onClick={() => setActiveTab("loans")}
                  className={`px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === "loans" ? "bg-primary text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"}`}
                 >
                   Loans Given
                 </button>
                 <button 
                  onClick={() => setActiveTab("expenses")}
                  className={`px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === "expenses" ? "bg-primary text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"}`}
                 >
                   Expenses
                 </button>
              </div>

              {/* Filters */}
              {(activeTab === "collections" || activeTab === "loans" || activeTab === "expenses") && (
                <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
                  {/* MOBILE FILTERS (Row on mobile) */}
                  <div className="md:hidden">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                        <input 
                          type="date" 
                          name="startDate"
                          value={filters.startDate}
                          onChange={handleFilterChange}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
                        <input 
                          type="date" 
                          name="endDate"
                          value={filters.endDate}
                          onChange={handleFilterChange}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSearchSubmit}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md"
                    >
                      Submit
                    </button>
                  </div>

                  {/* DESKTOP FILTERS (Standard inline) */}
                  <div className="hidden md:flex flex-wrap gap-6 items-end">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                      <input 
                        type="date" 
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        className="w-[180px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Date</label>
                      <input 
                        type="date" 
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        className="w-[180px] px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={handleSearchSubmit}
                      className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-slate-200"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}

              {error && (
                 <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[10px] font-black uppercase tracking-tight">
                   {error}
                 </div>
              )}

              {/* DATA TABLE */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="overflow-x-auto">
                    {activeTab === "collections" && renderCollectionsTable()}
                    {activeTab === "loans" && renderLoansGivenTable()}
                    {activeTab === "expenses" && renderExpensesTable()}
                </div>
                {activeTab === "collections" && collections.length > 0 && (
                  <Pagination
                    currentPage={pagination.collections.page}
                    totalPages={pagination.collections.totalPages}
                    onPageChange={handlePageChange}
                    totalRecords={pagination.collections.total}
                    limit={pagination.collections.limit}
                  />
                )}
                {activeTab === "loans" && loansGiven.length > 0 && (
                  <Pagination
                    currentPage={pagination.loans.page}
                    totalPages={pagination.loans.totalPages}
                    onPageChange={handlePageChange}
                    totalRecords={pagination.loans.total}
                    limit={pagination.loans.limit}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={fetchExpenses}
      />
    </AuthGuard>
  );
};

export default CollectionsPage;
