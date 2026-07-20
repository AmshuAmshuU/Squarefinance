"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { useToast } from "../../../context/ToastContext";
import { getUserFromToken } from "../../../utils/auth";
import {
  getEmployees,
  toggleEmployeeStatus,
  deleteEmployee,
} from "../../../services/userService";
import { useUI } from "../../../context/UIContext";

const EmployeesPage = () => {
  const { isDarkMode } = useUI();
  const router = useRouter();
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { showToast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ totalUsers: 0, employeeCount: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await getEmployees();
      if (res.data && res.data.employees) {
        setEmployees(res.data.employees);
        setMeta(res.data.meta || { totalUsers: 0, employeeCount: 0 });
      } else {
        setEmployees(res.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch employees", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    // For now, client-side search since we don't have backend search for users yet
    // In a real app, this would call fetchEmployees with query params
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.accessKey &&
        emp.accessKey.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <AuthGuard>
      <style jsx global>{`
        .employees-dark-mode {
          background-color: #0f172a;
        }
        .employees-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .employees-dark-mode .bg-slate-50,
        .employees-dark-mode .bg-slate-50\/50,
        .employees-dark-mode .bg-slate-100 {
          background-color: #334155 !important;
        }
        .employees-dark-mode .hover\:bg-slate-50\/50:hover {
          background-color: #334155 !important;
        }
        .employees-dark-mode .bg-blue-50 {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
        .employees-dark-mode .bg-emerald-50 {
          background-color: rgba(16, 185, 129, 0.15) !important;
        }
        .employees-dark-mode .text-slate-900,
        .employees-dark-mode .text-slate-800 {
          color: #f1f5f9 !important;
        }
        .employees-dark-mode .text-slate-700 {
          color: #e2e8f0 !important;
        }
        .employees-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .employees-dark-mode .text-slate-500,
        .employees-dark-mode .text-slate-400,
        .employees-dark-mode .text-slate-300 {
          color: #94a3b8 !important;
        }
        .employees-dark-mode .placeholder\:text-slate-300::placeholder {
          color: #64748b !important;
        }
        .employees-dark-mode .border-slate-200,
        .employees-dark-mode .border-slate-100,
        .employees-dark-mode .border-blue-100,
        .employees-dark-mode .border-emerald-100 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .employees-dark-mode .divide-slate-100 > * {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "employees-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Employee Management
                  </h1>
                  <p className="text-slate-500 font-medium text-sm">
                    {employees.length} operator records identified in system
                  </p>
                </div>
                <div className="w-full sm:w-auto flex items-center gap-3">
                  {isSuperAdmin && (
                    <button
                      onClick={() => router.push("/admin/employees/add")}
                      className="flex-[2] sm:flex-none bg-primary text-white px-4 sm:px-6 py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <span className="text-lg leading-none">+</span> Add
                      Operator
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Stats */}
              <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
                <div className="w-full lg:flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center overflow-hidden">
                  <form
                    onSubmit={handleSearch}
                    className="flex-1 flex items-center"
                  >
                    <div className="pl-4 text-slate-400">🔍</div>
                    <input
                      type="text"
                      placeholder="Search by Name, Email or Access Key"
                      className="w-full py-3 px-3 text-xs font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-bold uppercase"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </form>
                </div>
                <div className="w-full lg:w-auto flex items-center gap-3">
                  <button className="flex-1 lg:flex-none bg-primary text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                    🔍 Search
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Access Key
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Operator Name
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Credential ID
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Protocol Level
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Registry Status
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest"
                          >
                            Synchronizing Registry...
                          </td>
                        </tr>
                      ) : filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center">
                            <p className="text-slate-300 font-bold uppercase text-[10px] tracking-widest mb-2">
                              No matching operators identified
                            </p>
                            {meta.totalUsers > 0 &&
                              meta.employeeCount === 0 && (
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                  {meta.totalUsers} Administrator(s) hidden by
                                  registry filter. <br />
                                  Please add an &quot;OPERATOR&quot; to see them
                                  here.
                                </p>
                              )}
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <tr
                            key={emp._id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-3 py-3">
                              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                {emp.accessKey || "---"}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-black text-slate-900 uppercase text-xs tracking-tighter">
                              {emp.name}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-500 text-xs">
                              {emp.email}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-primary text-[9px] font-black uppercase border border-blue-100">
                                {emp.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {emp.isActive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-tighter border border-emerald-100">
                                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                  Fully Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-tighter border border-slate-200">
                                  Suspended
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/admin/employees/view/${emp._id}`,
                                  )
                                }
                                className="text-slate-400 hover:text-primary transition-all p-1"
                                title="View Operator Profile"
                              >
                                <svg
                                  className="w-5 h-5 mx-auto"
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
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EmployeesPage;
