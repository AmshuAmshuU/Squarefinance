"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import { useToast } from "../../../../../context/ToastContext";
import {
  getEmployeeById,
  toggleEmployeeStatus,
  deleteEmployee,
} from "../../../../../services/userService";
import TodoDashboardSection from "../../../../../components/analytics/TodoDashboardSection";

const ViewEmployeePage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeById(id);
      const fetchedPermissions = res.data.permissions || {};
      const completePermissions = {
        loans: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.loans || {}) },
        weeklyLoans: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.weeklyLoans || {}) },
        dailyLoans: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.dailyLoans || {}) },
        interestLoans: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.interestLoans || {}) },
        emis: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.emis || {}) },
        vehicles: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.vehicles || {}) },
        payments: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.payments || {}) },
        documents: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.documents || {}) },
        analytics: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.analytics || {}) },
        dashboard: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.dashboard || {}) },
        expenses: { view: false, create: false, edit: false, delete: false, ...(fetchedPermissions.expenses || {}) },
        paymentApproval: fetchedPermissions.paymentApproval || false,
      };
      
      setEmployee({
        ...res.data,
        permissions: completePermissions
      });
    } catch (err) {
      showToast("Failed to fetch employee details", "error");
      router.push("/admin/employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const handleToggleStatus = async () => {
    try {
      await toggleEmployeeStatus(id);
      showToast("Employee status updated", "success");
      fetchEmployee();
    } catch (err) {
      showToast(err.message || "Failed to toggle status", "error");
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "CRITICAL: Are you sure you want to remove this operator from the registry? This cannot be undone.",
      )
    )
      return;
    try {
      await deleteEmployee(id);
      showToast("Operator removed from registry", "success");
      router.push("/admin/employees");
    } catch (err) {
      showToast(err.message || "Failed to delete employee", "error");
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F8FAFC] flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar />
            <main className="py-8 px-4 sm:px-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            </main>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <button
                    onClick={() => router.push("/admin/employees")}
                    className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4 transition-all"
                  >
                    ← Back
                  </button>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                    Employee Details
                  </h1>
                  <p className="text-slate-500 font-medium text-sm">
                    Profile and protocol status for {employee.name}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/admin/employees/edit/${id}`)}
                    className="bg-white border border-slate-200 text-primary px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-2xl shadow-blue-100 ring-4 ring-primary/5 group"
                  >
                    Edit Profile
                    <svg
                      className="w-4 h-4 group-hover:rotate-12 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Status Card */}
                <div
                  className={`p-8 rounded-[2rem] border flex items-center justify-between ${
                    employee.isActive
                      ? "bg-emerald-50/50 border-emerald-100 shadow-xl shadow-emerald-50"
                      : "bg-amber-50/50 border-amber-100 shadow-xl shadow-amber-50"
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={`w-4 h-4 rounded-full animate-pulse ${
                        employee.isActive ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    ></div>
                    <div>
                      <p
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          employee.isActive
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        Registry Status
                      </p>
                      <p className="text-xl font-black text-slate-900 uppercase">
                        {employee.isActive ? "Operational" : "Suspended"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleStatus}
                    className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ring-4 flex items-center gap-2 group ${
                      employee.isActive
                        ? "bg-amber-500 text-white shadow-2xl shadow-amber-100 ring-amber-500/10 hover:bg-amber-600"
                        : "bg-emerald-600 text-white shadow-2xl shadow-emerald-100 ring-emerald-500/10 hover:bg-emerald-700"
                    }`}
                  >
                    {employee.isActive ? (
                      <>
                        Remove Access
                        <svg
                          className="w-4 h-4 group-active:rotate-90 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </>
                    ) : (
                      <>
                        Grant Access
                        <svg
                          className="w-4 h-4 group-hover:scale-110 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>

                {/* Info and Permissions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Basic Info */}
                  <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Operator
                        </p>
                        <p className="text-xl font-black text-slate-900 uppercase">
                          {employee.name}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Level
                        </p>
                        <span className="inline-flex px-3 py-1 bg-blue-50 text-primary text-[10px] font-black uppercase rounded-lg border border-blue-100">
                          {employee.role}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Registry Email
                        </p>
                        <p className="font-bold text-slate-700 break-all">
                          {employee.email}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Access Key
                        </p>
                        <p className="font-bold text-slate-700 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 inline-block text-xs">
                          {employee.accessKey || "NONE"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleDelete}
                      className="w-full bg-white text-red-500 border border-red-100 p-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all shadow-sm"
                    >
                      Delete User
                    </button>
                  </div>

                  {/* Permissions */}
                  <div className="md:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="mb-6">
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        Access controls
                      </h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                        Granular access matrix enabled
                      </p>
                    </div>

                    <div className="space-y-4">
                      {employee.permissions ? (
                        Object.entries(employee.permissions).map(
                          ([key, val]) => (
                            <div
                              key={key}
                              className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100"
                            >
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">
                                <span className="capitalize">
                                  {key === "loans"
                                    ? "Loans (Main)"
                                    : key.replace(/([A-Z])/g, " $1")}
                                </span>{" "}
                                Module
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(val).map(([act, allowed]) => (
                                  <span
                                    key={act}
                                    className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                                      allowed
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : "bg-white text-slate-300 border-slate-100 line-through opacity-50"
                                    }`}
                                  >
                                    {act}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ),
                        )
                      ) : (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            No Specific Permissions Assigned
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-slate-400">
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1">
                        Security Log Check
                      </p>
                      <p className="text-[10px] font-medium italic">
                        Authorized since{" "}
                        {new Date(employee.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tasks Section - NEW */}
                <div className="mt-8">
                  <TodoDashboardSection 
                    employeeId={id} 
                    title={`${employee.name.split(" ")[0]}'s Current Tasks`} 
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default ViewEmployeePage;
