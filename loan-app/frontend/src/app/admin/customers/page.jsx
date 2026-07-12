"use client";
import { useState, useEffect, useCallback } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import ContactActionMenu from "../../../components/ContactActionMenu";
import { useToast } from "../../../context/ToastContext";
import { getCustomers, createCustomer } from "../../../services/customer";
import { exportLoansToExcel } from "../../../utils/exportExcel";
import { calculateEMI as fetchEMI } from "../../../services/loan.service";

const CustomersPage = () => {
  const { showToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }

  const [formData, setFormData] = useState({
    loanNumber: "",
    customerName: "",
    mobileNumbers: [""],
    alternateMobile: "", // Internal backup, but primary is in mobileNumbers[0]
    address: "",
    principalAmount: "",
    annualInterestRate: "",
    tenureMonths: "",
    processingFeeRate: "",
    processingFee: "",
    loanStartDate: new Date().toISOString().split("T")[0],
    emiStartDate: "",
    emiEndDate: "",
    remarks: "",
    guarantorName: "",
    guarantorMobileNumbers: [""],
    status: "",
  });

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCustomers();
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch customers", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const P = parseFloat(formData.principalAmount);
    const R = parseFloat(formData.annualInterestRate);
    const N = parseFloat(formData.tenureMonths);

    if (P && R && N) {
      const getEMI = async () => {
        try {
          const res = await fetchEMI({
            principalAmount: P,
            annualInterestRate: R,
            tenureMonths: N,
          });
          if (res.data && res.data.emi) {
            const totalInt = P * (R / 100) * N;
            setFormData((prev) => ({
              ...prev,
              monthlyEMI: res.data.emi,
              totalInterestAmount: totalInt.toFixed(2),
            }));
          }
        } catch (err) {
          console.error("Failed to fetch EMI", err);
        }
      };
      getEMI();
    } else {
      setFormData((prev) => ({
        ...prev,
        monthlyEMI: 0,
        totalInterestAmount: 0,
      }));
    }
  }, [
    formData.principalAmount,
    formData.annualInterestRate,
    formData.tenureMonths,
  ]);

  const currentEMI = formData.monthlyEMI || 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    const principal =
      parseFloat(
        name === "principalAmount" ? value : formData.principalAmount,
      ) || 0;

    if (name === "processingFeeRate") {
      const rate = parseFloat(value) || 0;
      const fee = ((principal * rate) / 100).toFixed(2);
      newFormData.processingFee = fee;
    } else if (name === "processingFee") {
      const fee = parseFloat(value) || 0;
      const rate = principal > 0 ? ((fee / principal) * 100).toFixed(2) : 0;
      newFormData.processingFeeRate = rate;
    } else if (name === "principalAmount") {
      const rate = parseFloat(formData.processingFeeRate) || 0;
      const fee = ((principal * rate) / 100).toFixed(2);
      newFormData.processingFee = fee;
    }

    // Automate Dates
    const lDate = name === "loanStartDate" ? value : formData.loanStartDate;
    const tenure =
      parseInt(name === "tenureMonths" ? value : formData.tenureMonths) || 0;

    if (lDate) {
      const d = new Date(lDate);
      const start = new Date(d);
      start.setMonth(start.getMonth() + 1);
      newFormData.emiStartDate = start.toISOString().split("T")[0];

      if (tenure) {
        const end = new Date(d);
        end.setMonth(end.getMonth() + tenure);
        newFormData.emiEndDate = end.toISOString().split("T")[0];
      }
    }

    setFormData(newFormData);
  };

  const addAdditionalMobile = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeAdditionalMobile = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleArrayInputChange = (field, index, value) => {
    const val = value.replace(/[^0-9]/g, "");
    setFormData((prev) => {
      const newArr = [...prev[field]];
      newArr[index] = val;
      return { ...prev, [field]: newArr };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createCustomer({
        ...formData,
        monthlyEMI: currentEMI,
      });
      showToast("Internal Record Synchronized Successfully", "success");
      setIsModalOpen(false);
      setFormData({
        loanNumber: "",
        customerName: "",
        mobileNumbers: [""],
        alternateMobile: "",
        address: "",
        principalAmount: "",
        annualInterestRate: "",
        tenureMonths: "",
        loanStartDate: new Date().toISOString().split("T")[0],
        emiStartDate: "",
        emiEndDate: "",
        remarks: "",
        guarantorName: "",
        guarantorMobileNumbers: [""],
        status: "",
      });
      fetchCustomers();
    } catch (err) {
      showToast(err.message || "Failed to create customer", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      (c.loanNumber?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (c.customerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8 w-full">
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  Customer Management
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Registry of validated loan profiles and active accounts
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () =>
                    await exportLoansToExcel(customers, "Customers_Report.xlsx")
                  }
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
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

            {/* Search Bar */}
            <div className="mb-8 p-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <span className="pl-4 text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                placeholder="Search by name or loan number..."
                className="w-full p-3 text-sm font-bold text-slate-700 focus:outline-none placeholder:text-slate-300 placeholder:font-black uppercase tracking-tighter"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              {/* MOBILE VIEW (Table Optimized for small screens) */}
              <div className="md:hidden">
                <div className="overflow-x-auto scrollbar-none">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 uppercase">
                        <th className="w-[80px] px-4 py-4 text-[9px] font-black text-slate-400 tracking-wider">
                          LOAN NO
                        </th>
                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 tracking-wider">
                          CUSTOMER NAME
                        </th>
                        <th className="w-[120px] px-4 py-4 text-[9px] font-black text-slate-400 tracking-wider">
                          CONTACTS
                        </th>

                        <th className="w-[100px] px-4 py-4 text-[9px] font-black text-slate-400 tracking-wider text-right">
                          MONTHLY EMI
                        </th>
                        <th className="w-[80px] px-4 py-4 text-[9px] font-black text-slate-400 tracking-wider text-center">
                          STATUS
                        </th>
                        <th className="w-[100px] px-4 py-4 text-[9px] font-black text-slate-400 tracking-wider sticky right-0 bg-slate-50/50 z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td
                            colSpan="7"
                            className="px-4 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest"
                          >
                            Synchronizing Registry...
                          </td>
                        </tr>
                      ) : filteredCustomers.length === 0 ? (
                        <tr>
                          <td
                            colSpan="7"
                            className="px-4 py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest"
                          >
                            No records
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((cust) => (
                          <tr
                            key={cust._id}
                            className="active:bg-slate-50 transition-colors group"
                          >
                            <td className="px-4 py-5">
                              <span className="font-black text-primary uppercase text-[10px] tracking-tighter bg-blue-50 px-2 py-1 rounded-md whitespace-nowrap">
                                {cust.loanNumber}
                              </span>
                            </td>
                            <td className="px-4 py-5">
                              <span className="font-black text-slate-900 uppercase text-xs tracking-tighter block truncate">
                                {cust.customerName}
                              </span>
                            </td>
                            <td className="px-4 py-5 font-bold text-slate-500 text-[10px] whitespace-nowrap">
                              <div className="flex flex-col gap-0.5 mt-1">
                                {(cust.mobileNumbers || []).map((num, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      setActiveContactMenu({
                                        number: num,
                                        name: cust.customerName,
                                        type: "Applicant",
                                        x: rect.left,
                                        y: rect.bottom,
                                      });
                                    }}
                                    className="hover:text-primary transition-colors text-left"
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </td>

                            <td className="px-4 py-5 text-right font-black text-slate-900 text-[11px] whitespace-nowrap">
                              ₹{cust.monthlyEMI?.toLocaleString()}
                            </td>
                            <td className="px-4 py-5 text-center">
                              {cust.isSeized ? (
                                <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[8px] font-black rounded uppercase">
                                  Seized
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-500 text-[8px] font-black rounded uppercase">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-5 text-center whitespace-nowrap sticky right-0 bg-white group-active:bg-slate-50 z-10 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                              <div className="flex justify-center items-center gap-3">
                                <button
                                  onClick={() => {
                                    if (cust.loanId) {
                                      window.location.href = `/admin/loans/${cust.loanId}`;
                                    } else {
                                      console.error(
                                        "Loan ID not found for customer",
                                        cust,
                                      );
                                    }
                                  }}
                                  className="text-primary hover:scale-110 transition-transform"
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
                                <button
                                  onClick={() => {
                                    if (cust.loanId) {
                                      window.location.href = `/admin/loans/edit/${cust.loanId}`;
                                    } else {
                                      console.error(
                                        "Loan ID not found for customer",
                                        cust,
                                      );
                                    }
                                  }}
                                  className="text-primary hover:scale-110 transition-transform"
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="py-3 bg-slate-50/50 border-t border-slate-100 text-center">
                  <p className="text-[9px] font-bold text-slate-400 italic">
                    Swipe horizontally to see more details
                  </p>
                </div>
              </div>

              {/* DESKTOP VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Loan Number
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Customer Name
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Contact
                      </th>

                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Monthly EMI
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Tenure
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest"
                        >
                          Synchronizing Registry...
                        </td>
                      </tr>
                    ) : filteredCustomers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest"
                        >
                          No matching records identified
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <tr
                          key={cust._id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="font-black text-primary uppercase text-xs tracking-tighter bg-blue-50 px-2 py-1 rounded-md">
                              {cust.loanNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-black text-slate-900 uppercase text-xs tracking-tighter">
                            {cust.customerName}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-500 text-xs">
                            <div className="flex flex-col gap-1 items-start">
                              {(cust.mobileNumbers || []).map((num, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => {
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();
                                    setActiveContactMenu({
                                      number: num,
                                      name: cust.customerName,
                                      type: "Applicant",
                                      x: rect.left,
                                      y: rect.bottom,
                                    });
                                  }}
                                  className="hover:text-primary transition-colors"
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <span className="font-black text-slate-900 text-xs">
                              ₹{cust.monthlyEMI?.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase">
                              {cust.tenureMonths} Months
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {cust.isSeized ? (
                              <span className="px-2 py-1 bg-red-50 text-red-500 text-[9px] font-black rounded uppercase">
                                Seized
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-500 text-[9px] font-black rounded uppercase">
                                Active
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                    Create Customer Profile
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Authorized Entry Point
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-2xl font-black text-slate-400"
                >
                  &times;
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-8 space-y-8 overflow-y-auto"
              >
                {/* Section 1: Loan Identity */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-primary text-white w-5 h-5 flex items-center justify-center rounded-full">
                      1
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Loan Identity
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Loan Number (Manual)
                      </label>
                      <input
                        type="text"
                        name="loanNumber"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all uppercase"
                        value={formData.loanNumber}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Launch Date
                      </label>
                      <input
                        type="date"
                        name="loanStartDate"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.loanStartDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        EMI Start Date
                      </label>
                      <input
                        type="date"
                        name="emiStartDate"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.emiStartDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        EMI End Date
                      </label>
                      <input
                        type="date"
                        name="emiEndDate"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.emiEndDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Personal Dossier */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-primary text-white w-5 h-5 flex items-center justify-center rounded-full">
                      2
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Personal Dossier
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.customerName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-4 col-span-2 pt-2 border-t border-slate-100 mt-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                        <span>Customer Contact Numbers</span>
                        <button
                          type="button"
                          onClick={() => addAdditionalMobile("mobileNumbers")}
                          className="text-primary hover:text-primary/70 transition-colors"
                        >
                          + Add Number
                        </button>
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {formData.mobileNumbers.map((num, idx) => (
                          <div
                            key={idx}
                            className="flex gap-2 animate-in zoom-in duration-200"
                          >
                            <input
                              type="text"
                              maxLength={10}
                              className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-primary transition-all"
                              placeholder={
                                idx === 0
                                  ? "Primary Mobile"
                                  : `Alt Number ${idx}`
                              }
                              value={num}
                              onChange={(e) =>
                                handleArrayInputChange(
                                  "mobileNumbers",
                                  idx,
                                  e.target.value,
                                )
                              }
                            />
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeAdditionalMobile("mobileNumbers", idx)
                                }
                                className="text-red-400 hover:text-red-500 transition-colors"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 col-span-2 pt-4 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Guarantor Name
                      </label>
                      <input
                        type="text"
                        name="guarantorName"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.guarantorName}
                        onChange={handleInputChange}
                        placeholder="Enter Guarantor Legal Name"
                      />
                    </div>

                    <div className="space-y-4 col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                        <span>Guarantor Contact Numbers</span>
                        <button
                          type="button"
                          onClick={() =>
                            addAdditionalMobile("guarantorMobileNumbers")
                          }
                          className="text-primary hover:text-primary/70 transition-colors"
                        >
                          + Add Number
                        </button>
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {formData.guarantorMobileNumbers.map((num, idx) => (
                          <div
                            key={idx}
                            className="flex gap-2 animate-in zoom-in duration-200"
                          >
                            <input
                              type="text"
                              maxLength={10}
                              className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-primary transition-all"
                              placeholder={
                                idx === 0
                                  ? "Primary Guarantor No."
                                  : `Alt Number ${idx}`
                              }
                              value={num}
                              onChange={(e) =>
                                handleArrayInputChange(
                                  "guarantorMobileNumbers",
                                  idx,
                                  e.target.value,
                                )
                              }
                            />
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeAdditionalMobile(
                                    "guarantorMobileNumbers",
                                    idx,
                                  )
                                }
                                className="text-red-400 hover:text-red-500 transition-colors"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Current Address
                      </label>
                      <textarea
                        name="address"
                        required
                        rows="2"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all resize-none"
                        value={formData.address}
                        onChange={handleInputChange}
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Section 3: Financial Parameters */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black bg-primary text-white w-5 h-5 flex items-center justify-center rounded-full">
                      3
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Financial Parameters
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Principal (₹)
                      </label>
                      <input
                        type="number"
                        name="principalAmount"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.principalAmount}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Annual ROI (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="annualInterestRate"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.annualInterestRate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Tenure (Months)
                      </label>
                      <input
                        type="number"
                        name="tenureMonths"
                        required
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.tenureMonths}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Proc. Fee Rate (%)
                      </label>
                      <input
                        type="number"
                        name="processingFeeRate"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.processingFeeRate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Processing Fee (₹)
                      </label>
                      <input
                        type="number"
                        name="processingFee"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                        value={formData.processingFee}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex justify-between items-center shadow-inner">
                  <div>
                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">
                      Computed Pipeline EMI
                    </span>
                    <p className="text-3xl font-black text-primary tracking-tighter">
                      ₹{parseFloat(currentEMI).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">
                      Total Interest Amount
                    </span>
                    <p className="text-[14px] font-black text-slate-900 uppercase">
                      ₹
                      {parseFloat(
                        formData.totalInterestAmount || 0,
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Status of Customer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="status"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                    value={formData.status}
                    onChange={handleInputChange}
                    placeholder="Enter current status"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    System Remarks (Optional)
                  </label>
                  <textarea
                    name="remarks"
                    rows="1"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                    value={formData.remarks}
                    onChange={handleInputChange}
                  ></textarea>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-500 p-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Abort Registry
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] bg-primary text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {submitting
                      ? "Transmitting Byte Stream..."
                      : "Authorize & Save Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Contact Action Menu */}
        <ContactActionMenu
          contact={activeContactMenu}
          onClose={() => setActiveContactMenu(null)}
        />
      </div>
    </AuthGuard>
  );
};

export default CustomersPage;
