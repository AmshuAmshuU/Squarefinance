"use client";
import { useState, useEffect } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import AddExpenseModal from "../../../components/AddExpenseModal";
import { getAllExpenses, deleteExpense } from "../../../services/expenseService";
import { useToast } from "../../../context/ToastContext";
import { format } from "date-fns";
import Pagination from "../../../components/Pagination";

const ExpensesPage = () => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOfficeOnly, setFilterOfficeOnly] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(25);

  const fetchExpenses = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await getAllExpenses({ page, limit });
      const data = res.data;
      if (data?.expenses) {
        setExpenses(data.expenses);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      } else {
        setExpenses(data || []);
      }
    } catch (err) {
      showToast("Failed to fetch expenses", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(currentPage);
  }, [currentPage]);

  const handleEdit = (expense) => {
    setEditExpense(expense);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (expense) => {
    setDeleteConfirm(expense);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteConfirm._id);
      showToast("Expense deleted successfully", "success");
      setDeleteConfirm(null);
      fetchExpenses(currentPage);
    } catch (err) {
      showToast(err.message || "Failed to delete expense", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditExpense(null);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4 md:gap-0">
                <div className="text-center md:text-left">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Expense Management
                  </h1>
                  <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">
                    Track and manage operational expenditures
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                  <div className="flex w-full sm:w-auto items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                    <input
                      type="checkbox"
                      id="filterOffice"
                      checked={filterOfficeOnly}
                      onChange={(e) => setFilterOfficeOnly(e.target.checked)}
                      className="w-4 h-4 text-primary bg-slate-50 border-slate-200 rounded focus:ring-primary/20 transition-all cursor-pointer"
                    />
                    <label htmlFor="filterOffice" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none">
                      Office Expenses Only
                    </label>
                  </div>
                  <button
                    onClick={() => { setEditExpense(null); setIsModalOpen(true); }}
                    className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">+</span> Add Expense
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Synchronizing Registry...</span>
                  </div>
                </div>
              ) : expenses.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 py-20 text-center">
                  <span className="px-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest">No records found in active database</span>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full border-collapse min-w-[600px] md:min-w-0">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan #</th>
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle #</th>
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-left text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Particulars</th>
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-right text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                            <th className="px-3 md:px-4 py-2.5 md:py-3 text-center text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {expenses
                            .filter((expense) => filterOfficeOnly ? expense.isOfficeExpense : true)
                            .map((expense) => (
                              <tr key={expense._id} className="hover:bg-blue-50/40 transition-all">
                                <td className="px-3 md:px-4 py-2.5 md:py-3 whitespace-nowrap">
                                  <span className="font-bold text-slate-700 text-[11px] md:text-xs">
                                    {format(new Date(expense.date), "dd MMM yyyy")}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-2.5 md:py-3 whitespace-nowrap">
                                  <span className="px-2 md:px-3 py-1 bg-blue-50 text-primary text-[9px] md:text-[10px] font-black rounded-lg border border-blue-100 uppercase">
                                    {expense.loanNumber || "OFFICE"}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-2.5 md:py-3 whitespace-nowrap">
                                  <span className="font-black text-slate-900 text-[9px] md:text-[10px] uppercase tracking-wider">
                                    {!expense.vehicleNumber || expense.vehicleNumber === "N/A" ? "-" : expense.vehicleNumber}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-2.5 md:py-3">
                                  <p className="text-slate-500 font-medium text-[11px] md:text-xs max-w-[150px] md:max-w-xs truncate md:whitespace-normal">
                                    {expense.particulars}
                                  </p>
                                </td>
                                <td className="px-3 md:px-4 py-2.5 md:py-3 text-right whitespace-nowrap">
                                  <span className="font-black text-slate-900 text-[11px] md:text-xs">
                                    ₹{expense.amount.toLocaleString()}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-2.5 md:py-3 whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleEdit(expense)}
                                      className="px-3 py-1.5 bg-blue-50 text-primary text-[9px] font-black uppercase tracking-widest rounded-xl border border-blue-100 hover:bg-blue-100 transition-all"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(expense)}
                                      className="px-3 py-1.5 bg-rose-50 text-rose-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-rose-100 hover:bg-rose-100 transition-all"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
                totalRecords={totalRecords}
                limit={limit}
              />
            </div>
          </main>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={() => fetchExpenses(currentPage)}
        editExpense={editExpense}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] border border-slate-200 shadow-2xl p-8 text-center">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑️</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Delete Expense?</h3>
            <p className="text-slate-500 text-xs font-medium mb-1">{deleteConfirm.particulars}</p>
            <p className="text-rose-500 font-black text-sm mb-6">₹{deleteConfirm.amount.toLocaleString()}</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6">This action cannot be undone</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-rose-500 text-white hover:bg-rose-600 transition-all disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
};

export default ExpensesPage;
