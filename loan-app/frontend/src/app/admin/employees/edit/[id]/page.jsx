"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import { useToast } from "../../../../../context/ToastContext";
import {
  getEmployeeById,
  updateEmployee,
} from "../../../../../services/userService";

const EditEmployeePage = () => {
  const router = useRouter();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    accessKey: "",
    permissions: {
      loans: { view: false, create: false, edit: false, delete: false },
      weeklyLoans: { view: false, create: false, edit: false, delete: false },
      dailyLoans: { view: false, create: false, edit: false, delete: false },
      interestLoans: { view: false, create: false, edit: false, delete: false },
      emis: { view: false, create: false, edit: false, delete: false },
      vehicles: { view: false, create: false, edit: false, delete: false },
      payments: { view: false, create: false, edit: false, delete: false },
      documents: { view: false, create: false, edit: false, delete: false },
      analytics: { view: false, create: false, edit: false, delete: false },
      dashboard: { view: false, create: false, edit: false, delete: false },
      expenses: { view: false, create: false, edit: false, delete: false },
      paymentApproval: false,
    },
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await getEmployeeById(id);
        const { name, email, role, accessKey, permissions } = res.data;
        setFormData({
          name,
          email,
          role,
          accessKey,
          password: "",
          permissions: {
            loans: { view: false, create: false, edit: false, delete: false, ...(permissions?.loans || {}) },
            weeklyLoans: { view: false, create: false, edit: false, delete: false, ...(permissions?.weeklyLoans || {}) },
            dailyLoans: { view: false, create: false, edit: false, delete: false, ...(permissions?.dailyLoans || {}) },
            interestLoans: { view: false, create: false, edit: false, delete: false, ...(permissions?.interestLoans || {}) },
            emis: { view: false, create: false, edit: false, delete: false, ...(permissions?.emis || {}) },
            vehicles: { view: false, create: false, edit: false, delete: false, ...(permissions?.vehicles || {}) },
            payments: { view: false, create: false, edit: false, delete: false, ...(permissions?.payments || {}) },
            documents: { view: false, create: false, edit: false, delete: false, ...(permissions?.documents || {}) },
            analytics: { view: false, create: false, edit: false, delete: false, ...(permissions?.analytics || {}) },
            dashboard: { view: false, create: false, edit: false, delete: false, ...(permissions?.dashboard || {}) },
            expenses: { view: false, create: false, edit: false, delete: false, ...(permissions?.expenses || {}) },
            paymentApproval: permissions?.paymentApproval || false,
          },
        });
      } catch (err) {
        showToast("Failed to fetch employee details", "error");
        router.push("/admin/employees");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (module, action) => {
    setFormData((prev) => {
      const newPermissions = { ...prev.permissions };
      const modulePermissions = { ...newPermissions[module] };
      const newValue = !modulePermissions[action];
      modulePermissions[action] = newValue;

      // Dependency logic: If create, edit, or delete is true, view MUST be true
      if (
        modulePermissions.create ||
        modulePermissions.edit ||
        modulePermissions.delete
      ) {
        modulePermissions.view = true;
      }

      newPermissions[module] = modulePermissions;
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const dataToUpdate = { ...formData };
      if (!dataToUpdate.password) delete dataToUpdate.password;

      await updateEmployee(id, dataToUpdate);
      showToast("Operator updated successfully", "success");
      router.push("/admin/employees");
    } catch (err) {
      showToast(err.message || "Failed to update employee", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const PermissionRow = ({ label, module }) => (
    <div className="grid grid-cols-5 items-center py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-xl">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest col-span-1 pl-2">
        {label}
      </span>
      {["view", "create", "edit", "delete"].map((action) => (
        <div key={action} className="flex justify-center col-span-1">
          <label className="relative flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.permissions[module][action]}
              onChange={() => handlePermissionChange(module, action)}
              disabled={
                action === "view" &&
                (formData.permissions[module].create ||
                  formData.permissions[module].edit ||
                  formData.permissions[module].delete)
              }
            />
            <div
              className={`w-6 h-6 border-2 rounded-full flex items-center justify-center transition-all peer-focus:ring-4 peer-focus:ring-primary/10 ${formData.permissions[module][action]
                ? "bg-primary border-primary shadow-lg shadow-blue-200"
                : "border-slate-200 bg-white hover:border-primary/50"
                } ${action === "view" &&
                  (formData.permissions[module].create ||
                    formData.permissions[module].edit ||
                    formData.permissions[module].delete)
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer"
                }`}
            >
              {formData.permissions[module][action] && (
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          </label>
        </div>
      ))}
    </div>
  );

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
              <div className="mb-8">
                <button
                  onClick={() => router.back()}
                  className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4"
                >
                  ← Back
                </button>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  Edit Operator
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Modify protocol access levels and credentials
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Protocol Level
                      </label>
                      <select
                        name="role"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                        value={formData.role}
                        onChange={handleChange}
                      >
                        <option value="EMPLOYEE">OPERATOR (EMPLOYEE)</option>
                        <option value="ADMIN">MANAGER (ADMIN)</option>
                        <option value="SUPER_ADMIN">ADMINISTRATOR</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Update Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        placeholder="Leave blank to keep current"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                        value={formData.password}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Access Key
                      </label>
                      <input
                        type="text"
                        name="accessKey"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300 uppercase"
                        placeholder="E.G. OP-44"
                        value={formData.accessKey}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      Access Control
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                      Manage module privilege matrix
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-5 bg-slate-50 py-3 border-b border-slate-100 px-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">
                        Module
                      </span>
                      {["View", "Create", "Edit", "Delete"].map((h) => (
                        <span
                          key={h}
                          className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center"
                        >
                          {h}
                        </span>
                      ))}
                    </div>

                    <div className="divide-y divide-slate-50">
                      <PermissionRow label="Loans (Main)" module="loans" />
                      <PermissionRow
                        label="Weekly Loans"
                        module="weeklyLoans"
                      />
                      <PermissionRow label="Daily Loans" module="dailyLoans" />
                      <PermissionRow label="Interest Loans" module="interestLoans" />
                      <PermissionRow label="EMIs" module="emis" />
                      <PermissionRow
                        label="Seized Vehicles"
                        module="vehicles"
                      />
                      <PermissionRow label="Payments" module="payments" />
                      <PermissionRow label="Documents" module="documents" />
                      <PermissionRow label="Analytics" module="analytics" />
                      <PermissionRow label="Dashboard" module="dashboard" />
                      <PermissionRow label="Expenses" module="expenses" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between mt-6">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Payment Approval Authority</h3>
                      <p className="text-slate-400 text-[9px] font-bold uppercase tracking-tighter mt-1">
                        If enabled, the employee can mark payments as PAID directly. If disabled, all payments will require Super Admin approval.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.permissions.paymentApproval}
                        onChange={() => setFormData(prev => ({
                          ...prev,
                          permissions: {
                            ...prev.permissions,
                            paymentApproval: !prev.permissions.paymentApproval
                          }
                        }))}
                      />
                      <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-100 ring-4 ring-primary/5 hover:bg-blue-700 transform active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Update Operator Registry
                      <svg
                        className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default EditEmployeePage;
