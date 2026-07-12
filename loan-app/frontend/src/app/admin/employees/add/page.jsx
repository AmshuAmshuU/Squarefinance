"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../../components/AuthGuard";
import Navbar from "../../../../components/Navbar";
import Sidebar from "../../../../components/Sidebar";
import { useToast } from "../../../../context/ToastContext";
import { createEmployee } from "../../../../services/userService";

const AddEmployeePage = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(1); // 1: Details, 2: Access, 3: Preview
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

  const handleNext = (e) => {
    if (e) e.preventDefault();
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await createEmployee(formData);
      showToast("Employee authorized successfully", "success");
      router.push("/admin/employees");
    } catch (err) {
      showToast(err.message || "Failed to create employee", "error");
      setStep(1);
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
              className={`w-6 h-6 border-2 rounded-full flex items-center justify-center transition-all peer-focus:ring-4 peer-focus:ring-primary/10 ${
                formData.permissions[module][action]
                  ? "bg-primary border-primary shadow-lg shadow-blue-200"
                  : "border-slate-200 bg-white hover:border-primary/50"
              } ${
                action === "view" &&
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-2xl mx-auto">
              <div className="mb-8">
                <button
                  onClick={() => (step === 1 ? router.back() : handleBack())}
                  className="text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4 transition-all"
                >
                  ← {step === 1 ? "Back" : "Previous Step"}
                </button>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  New Employee
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Step {step} of 3:{" "}
                  {step === 1
                    ? "Credential Entry"
                    : step === 2
                      ? "Access Control"
                      : "Final Review"}
                </p>
              </div>

              {step === 1 && (
                <form
                  onSubmit={handleNext}
                  className="space-y-5 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                      placeholder="E.G. JOHN DOE"
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
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                        placeholder="ADMIN@GENIUS.APP"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Set Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={formData.password}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Set Access Key
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

                  <button
                    type="submit"
                    className="w-full bg-primary text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transform active:scale-[0.98] transition-all mt-4"
                  >
                    Next: Access Control
                  </button>
                </form>
              )}

              {step === 2 && (
                <div className="space-y-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="mb-4">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      Privilege Matrix
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                      Configure granular action permissions
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden">
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

                  <div className="flex gap-4 mt-10">
                    <button
                      onClick={handleBack}
                      className="flex-1 bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
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
                          strokeWidth="2.5"
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Previous
                    </button>
                    <button
                      onClick={handleNext}
                      className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-100 ring-4 ring-primary/5 hover:bg-blue-700 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                    >
                      Finalize Review
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
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Full Name
                        </p>
                        <p className="text-xl font-black text-slate-900 uppercase">
                          {formData.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Registry Type
                        </p>
                        <span className="inline-flex px-4 py-1.5 bg-blue-50 text-primary text-[10px] font-black uppercase rounded-xl border border-blue-100">
                          {formData.role === "ADMIN"
                            ? "MANAGER"
                            : formData.role}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Email Address
                        </p>
                        <p className="font-bold text-slate-700">
                          {formData.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Access Key
                        </p>
                        <p className="font-bold text-slate-700 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 inline-block">
                          {formData.accessKey || "NONE"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        Assigned Permissions
                      </p>
                      <div className="grid grid-cols-1 gap-4">
                        {Object.entries(formData.permissions).map(
                          ([key, val]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100"
                            >
                              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest pl-2">
                                {key}
                              </span>
                              <div className="flex gap-2">
                                {Object.entries(val).map(([act, allowed]) =>
                                  allowed ? (
                                    <span
                                      key={act}
                                      className="text-[8px] font-black uppercase bg-white border border-slate-200 px-2.5 py-1 rounded-full text-slate-500 shadow-sm"
                                    >
                                      {act}
                                    </span>
                                  ) : null,
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex gap-4">
                    <button
                      onClick={handleBack}
                      className="flex-1 bg-slate-100 text-slate-500 p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-[2] bg-emerald-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-emerald-100 ring-4 ring-emerald-500/10 hover:bg-emerald-700 transform active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          Finalize Authorization
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
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AddEmployeePage;
