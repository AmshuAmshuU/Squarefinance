"use client";
import React, { useState, useEffect, Suspense } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import AddTodoModal from "../../../components/AddTodoModal";
import { getTodos, createTodo, updateTodo, deleteTodo } from "../../../services/todoService";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useToast } from "../../../context/ToastContext";
import { useUI } from "../../../context/UIContext";

const TodoListPage = () => {
  const { isDarkMode } = useUI();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [todoToEdit, setTodoToEdit] = useState(null);
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Pagination State
  const [pagination, setPagination] = useState({
    totalDocs: 0,
    totalPages: 0,
    page: 1,
    limit: 10,
    hasPrevPage: false,
    hasNextPage: false,
  });

  // Filter & Search State
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
    priority: "",
    dueDate: "",
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTodos(pagination.page, filters);
  }, [pagination.page]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && todos.length > 0) {
      const todo = todos.find(t => t._id === editId);
      if (todo) {
        handleEditClick(todo);
        // Clear the query param so it doesn't reopen on every refresh or filter
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [searchParams, todos]);

  const fetchTodos = async (page = 1, currentFilters = filters) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(currentFilters).filter(([, v]) => v !== "")),
      };
      const res = await getTodos(params);
      if (res.data) {
        setTodos(res.data.todos || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, keyword: value }));
    // Reset to page 1 on search
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      fetchTodos(1, { ...filters, keyword: value });
    }
  };

  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchTodos(1, newFilters);
  };

  const handleAddOrUpdateTodo = async (formData) => {
    try {
      setSubmitting(true);
      let res;
      if (todoToEdit) {
        res = await updateTodo(todoToEdit._id, formData);
      } else {
        res = await createTodo(formData);
      }
      
      if (res.status === "success") {
        showToast(`Todo ${todoToEdit ? "updated" : "added"} successfully`, "success");
        setIsModalOpen(false);
        setTodoToEdit(null);
        fetchTodos(pagination.page);
      }
    } catch (err) {
      showToast(err.message || `Failed to ${todoToEdit ? "update" : "add"} todo`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (todo) => {
    setTodoToEdit(todo);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTodoToEdit(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateTodo(id, { status: newStatus });
      showToast("Status updated", "success");
      fetchTodos(pagination.page);
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTodo(id);
        showToast("Task deleted", "success");
        fetchTodos(pagination.page);
      } catch (err) {
        showToast("Failed to delete task", "error");
      }
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      Todo: "bg-slate-100 text-slate-600 border-slate-200",
      "In Progress": "bg-blue-100 text-blue-600 border-blue-200",
      Done: "bg-green-100 text-green-600 border-green-200",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const PriorityBadge = ({ priority }) => {
    const styles = {
      Low: "bg-slate-50 text-slate-400 border-slate-100",
      Medium: "bg-orange-50 text-orange-500 border-orange-100",
      High: "bg-red-50 text-red-500 border-red-100",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Scoped to-do page dark mode overrides, following the same pattern
           as the analytics and dashboard pages. Every rule is prefixed with
           .todo-dark-mode, so nothing here can affect any other page. The
           Add/Edit To-Do modal is a shared component used elsewhere in the
           app and is intentionally left out of this pass. */
        .todo-dark-mode {
          background-color: #0f172a;
          color: #cbd5e1;
        }
        .todo-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .todo-dark-mode .bg-slate-50\/50,
        .todo-dark-mode .hover\:bg-slate-50\/30:hover {
          background-color: rgba(51, 65, 85, 0.5) !important;
        }
        .todo-dark-mode .bg-slate-50,
        .todo-dark-mode .bg-slate-100 {
          background-color: #334155 !important;
        }
        .todo-dark-mode .hover\:bg-slate-50:hover {
          background-color: #334155 !important;
        }
        .todo-dark-mode .bg-slate-900 {
          background-color: #475569 !important;
        }
        .todo-dark-mode .hover\:bg-slate-200:hover {
          background-color: #475569 !important;
        }
        .todo-dark-mode .bg-blue-100 {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
        .todo-dark-mode .bg-green-100 {
          background-color: rgba(34, 197, 94, 0.15) !important;
        }
        .todo-dark-mode .bg-orange-50 {
          background-color: rgba(249, 115, 22, 0.15) !important;
        }
        .todo-dark-mode .bg-red-50 {
          background-color: rgba(239, 68, 68, 0.15) !important;
        }
        .todo-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .todo-dark-mode .text-slate-700 {
          color: #e2e8f0 !important;
        }
        .todo-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .todo-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .todo-dark-mode .text-red-700 {
          color: #fca5a5 !important;
        }
        .todo-dark-mode .border-slate-100,
        .todo-dark-mode .border-slate-200 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex font-sans transition-colors duration-300 ${isDarkMode ? "todo-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                    To-Do List
                  </h1>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-3 bg-white px-3 py-1.5 rounded-lg border border-slate-100 inline-block shadow-sm">
                    {pagination.totalDocs} TOTAL TASKS
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-80">
                    <input
                      type="text"
                      placeholder="SEARCH TASKS..."
                      value={filters.keyword}
                      onChange={handleSearch}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300 shadow-sm"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm">🔍</span>
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all shadow-sm ${
                      showFilters ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    ⚙️
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary text-white px-3 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/25 hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <span className="text-lg leading-none">+</span> Add Todo
                  </button>
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange("status", e.target.value)}
                      className="w-full bg-slate-50 border border-transparent rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">ALL STATUS</option>
                      <option value="Todo">TODO</option>
                      <option value="In Progress">IN PROGRESS</option>
                      <option value="Done">DONE</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Priority</label>
                    <select
                      value={filters.priority}
                      onChange={(e) => handleFilterChange("priority", e.target.value)}
                      className="w-full bg-slate-50 border border-transparent rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">ALL PRIORITIES</option>
                      <option value="Low">LOW</option>
                      <option value="Medium">MEDIUM</option>
                      <option value="High">HIGH</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Due Date</label>
                    <input
                      type="date"
                      value={filters.dueDate}
                      onChange={(e) => handleFilterChange("dueDate", e.target.value)}
                      className="w-full bg-slate-50 border border-transparent rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        const cleared = { keyword: "", status: "", priority: "", dueDate: "" };
                        setFilters(cleared);
                        fetchTodos(1, cleared);
                      }}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] py-3.5 rounded-xl uppercase tracking-widest transition-all"
                    >
                      Reset All
                    </button>
                  </div>
                </div>
              )}

              {error && (
                 <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[10px] font-black uppercase tracking-tight">
                   {error}
                 </div>
              )}

              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden min-w-full">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Title</th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Description</th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Latest Update</th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Priority</th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Due Date</th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Created By</th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Updated By</th>
                        <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="10" className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                            <div className="flex flex-col items-center gap-4">
                              <span className="animate-spin text-3xl">⚙️</span>
                              Loading tasks...
                            </div>
                          </td>
                        </tr>
                      ) : todos.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="px-6 py-20 text-center">
                            <div className="text-slate-200 text-5xl mb-4">📋</div>
                            <h2 className="text-slate-400 font-black text-sm uppercase tracking-tight">No tasks found</h2>
                            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-1">Adjust filters or search keywords</p>
                          </td>
                        </tr>
                      ) : (
                        todos.map((todo) => (
                          <tr key={todo._id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                            <td className="px-3 py-3 whitespace-nowrap">
                              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{todo.title}</p>
                            </td>
                            <td className="px-3 py-3 min-w-[250px]">
                              <div className="max-h-16 overflow-y-auto scrollbar-hide pr-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed text-wrap">{todo.description || "—"}</p>
                              </div>
                            </td>
                            <td className="px-3 py-3 min-w-[200px]">
                              <div className="max-h-16 overflow-y-auto scrollbar-hide pr-2">
                                <p className="text-[10px] font-bold text-primary uppercase leading-relaxed text-wrap italic">{todo.comment || "—"}</p>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="text-[10px] font-bold text-slate-500">{format(new Date(todo.createdAt), "dd MMM yyyy")}</span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <StatusBadge status={todo.status} />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <PriorityBadge priority={todo.priority} />
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status !== "Done"
                                  ? "text-red-500 bg-red-50"
                                  : "text-slate-500 bg-slate-100"
                              }`}>
                                {todo.dueDate ? format(new Date(todo.dueDate), "dd MMM yyyy") : "—"}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                                {todo.createdBy?.name || "SYSTEM"}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                                {todo.updatedBy?.name || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-3 underline-offset-0">
                               <div className="flex items-center justify-center gap-2">
                                 <button 
                                   onClick={() => handleEditClick(todo)}
                                   className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                 >
                                    ✏️
                                 </button>
                                 <button 
                                   onClick={() => handleDelete(todo._id)}
                                   className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                 >
                                    🗑️
                                 </button>
                               </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {!loading && pagination.totalPages > 1 && (
                  <div className="px-3 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      SHOWING PAGE <span className="text-slate-900">{pagination.page}</span> OF <span className="text-slate-900">{pagination.totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={!pagination.hasPrevPage}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all shadow-sm"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={!pagination.hasNextPage}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-500 transition-all shadow-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        <AddTodoModal
          key={`${todoToEdit?._id || "new"}-${isModalOpen}`}
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleAddOrUpdateTodo}
          submitting={submitting}
          todoToEdit={todoToEdit}
        />
      </div>
    </AuthGuard>
  );
};

const TodoListPageWithSuspense = () => (
  <Suspense fallback={<div>Loading tasks...</div>}>
    <TodoListPage />
  </Suspense>
);

export default TodoListPageWithSuspense;
