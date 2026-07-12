"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import {
  getLoans,
  getLoanById,
  forecloseLoan,
} from "../../../services/loan.service";
import { useToast } from "../../../context/ToastContext";

const ForeclosurePage = () => {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Preview, 2: Payment

  const [formData, setFormData] = useState({
    foreclosureChargePercent: 0,
    foreclosureChargeAmount: 0,
    od: 0,
    miscellaneousFee: 0,
    remarks: "",
    paymentMode: "Cash",
    chequeNumber: "",
  });

  const [paymentData, setPaymentData] = useState({
    paymentBreakdown: [{ mode: "CASH", amount: 0, chequeNumber: "" }],
    paymentDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const fetchLoansList = async () => {
      try {
        const res = await getLoans({ limit: 1000 });
        if (res.data && res.data.loans) {
          setLoans(res.data.loans);
        }
      } catch (err) {
        console.error("Failed to fetch loans", err);
      }
    };
    fetchLoansList();
  }, []);

  const handleLoanSelect = async (loan) => {
    setLoading(true);
    try {
      const res = await getLoanById(loan._id);
      if (res.data) {
        if (res.data.status === "Closed") {
          showToast("the loan has been closed already", "error");
          setSelectedLoan(null);
          setSearchTerm("");
          return;
        }
        setSelectedLoan(res.data);
        setSearchTerm(res.data.loanTerms?.loanNumber || "");
      }
    } catch (err) {
      showToast("Failed to fetch loan details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Handle text fields (remarks, paymentMode, chequeNumber)
    if (e.target.type === "textarea" || name === "paymentMode") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    // Handle chequeNumber: digits only, max 6
    if (name === "chequeNumber") {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      setFormData((prev) => ({ ...prev, chequeNumber: digits }));
      return;
    }

    let numValue = parseFloat(value) || 0;

    setFormData((prev) => {
      const updated = { ...prev, [name]: numValue };

      // Auto-calculate charge amount if percentage changes
      if (name === "foreclosureChargePercent" && selectedLoan) {
        const principal = selectedLoan.loanTerms?.remainingPrincipalAmount || 0;
        updated.foreclosureChargeAmount = Math.ceil((principal * numValue) / 100);
      }

      return updated;
    });
  };

  const handlePaymentChange = (index, field, value) => {
    setPaymentData((prev) => {
      const newBreakdown = [...prev.paymentBreakdown];
      let finalValue = value;
      if (field === "amount") {
        finalValue = parseFloat(value) || 0;
      } else if (field === "chequeNumber") {
        finalValue = value.replace(/\D/g, "");
      }
      newBreakdown[index] = {
        ...newBreakdown[index],
        [field]: finalValue,
      };
      return { ...prev, paymentBreakdown: newBreakdown };
    });
  };

  const addPaymentRow = () => {
    setPaymentData((prev) => ({
      ...prev,
      paymentBreakdown: [...prev.paymentBreakdown, { mode: "CASH", amount: 0, chequeNumber: "" }],
    }));
  };

  const removePaymentRow = (index) => {
    setPaymentData((prev) => ({
      ...prev,
      paymentBreakdown: prev.paymentBreakdown.filter((_, i) => i !== index),
    }));
  };

  const remainingPrincipal =
    selectedLoan?.loanTerms?.remainingPrincipalAmount || 0;
  const totalAmount =
    remainingPrincipal +
    formData.foreclosureChargeAmount +
    formData.od +
    formData.miscellaneousFee;

  const handleProceed = async () => {
    setLoading(true);

    // Validate payment mode cheque number
    if (formData.paymentMode === "Cheque" && formData.chequeNumber.length !== 6) {
      showToast("Cheque number must be exactly 6 digits", "error");
      setLoading(false);
      return;
    }

    const totalReceived = paymentData.paymentBreakdown.reduce(
      (acc, curr) => acc + curr.amount,
      0,
    );
    if (totalReceived < totalAmount - 0.1) {
      showToast("Received amount is less than total amount", "error");
      setLoading(false);
      return;
    }

    // Validation for Cheque Numbers in breakdown
    for (const p of paymentData.paymentBreakdown) {
      if (p.mode === "CHEQUE") {
        if (!p.chequeNumber || p.chequeNumber.length !== 6) {
          showToast("Cheque number must be exactly 6 digits", "error");
          setLoading(false);
          return;
        }
      }
    }

    try {
      await forecloseLoan(selectedLoan._id, {
        ...formData,
        ...paymentData,
        totalAmount,
        remainingPrincipal,
      });
      showToast("Loan foreclosed successfully", "success");
      setShowPreview(false);
      setModalStep(1);
      setSelectedLoan(null);
      setSearchTerm("");
      setFormData({
        foreclosureChargePercent: 0,
        foreclosureChargeAmount: 0,
        od: 0,
        miscellaneousFee: 0,
        remarks: "",
        paymentMode: "Cash",
        chequeNumber: "",
      });
      setPaymentData({
        paymentBreakdown: [{ mode: "CASH", amount: 0 }],
        paymentDate: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      showToast(err.message || "Failed to foreclose loan", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-slate-100 bg-white">
            <Navbar />
          </div>

          <main className="p-4 sm:p-10 max-w-5xl mx-auto w-full">
            <div className="mb-12">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
                Foreclosure Loan
              </h1>
              <div className="h-1.5 w-20 bg-primary rounded-full"></div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Search Section */}
              <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100">
                <div className="max-w-md space-y-3 relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    Enter Loan Number
                  </label>
                  <div className="group relative">
                    <input
                      type="text"
                      placeholder="e.g. LN-001"
                      className="w-full pl-6 pr-12 py-5 bg-white border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-700 focus:outline-none focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-200 uppercase"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && !selectedLoan && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar overflow-hidden">
                        {loans
                          .filter(
                            (l) =>
                              l.loanTerms?.loanNumber &&
                              l.loanTerms.loanNumber
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()),
                          )
                          .map((loan) => (
                            <button
                              key={loan._id}
                              onClick={() => handleLoanSelect(loan)}
                              className="w-full px-6 py-4 text-left hover:bg-slate-50 flex justify-between items-center transition-colors border-b border-slate-50 last:border-0"
                            >
                              <span className="font-black text-slate-700 uppercase">
                                {loan.loanTerms?.loanNumber}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {loan.customerDetails?.customerName}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                    {selectedLoan && (
                      <button
                        onClick={() => {
                          setSelectedLoan(null);
                          setSearchTerm("");
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Simple Table UI Section */}
              <div className="p-0 border-b border-slate-100">
                <table className="w-full border-collapse">
                  <tbody>
                    {/* Row 1: Profile */}
                    <tr className="border-b border-slate-100">
                      <td className="p-5 w-1/3">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Customer Name
                        </label>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                          {selectedLoan?.customerDetails?.customerName || "—"}
                        </p>
                      </td>
                      <td className="p-5 w-1/3 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Mobile Number
                        </label>
                        <p className="text-sm font-bold text-slate-700 tracking-tight">
                          {(
                            selectedLoan?.customerDetails?.mobileNumbers || []
                          ).join(", ") || "—"}
                        </p>
                      </td>
                      <td className="p-5 w-1/3 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Address
                        </label>
                        <p className="text-[10px] font-bold text-slate-500 line-clamp-1 leading-relaxed">
                          {selectedLoan?.customerDetails?.address || "—"}
                        </p>
                      </td>
                    </tr>
                    {/* Row 2: Client Response */}
                    <tr className="border-b border-slate-100">
                      <td colSpan="3" className="p-5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Previous Client Response
                        </label>
                        <p className="text-sm font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                          {selectedLoan?.status?.clientResponse ||
                            selectedLoan?.clientResponse ||
                            "—"}
                        </p>
                      </td>
                    </tr>

                    {/* Row 3: Vehicle & Finance */}
                    <tr className="border-b border-slate-100">
                      <td className="p-5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Vehicle Number
                        </label>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                          {selectedLoan?.vehicleInformation?.vehicleNumber ||
                            "—"}
                        </p>
                      </td>
                      <td className="p-5 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Model
                        </label>
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-tight">
                          {selectedLoan?.vehicleInformation?.model || "—"}
                        </p>
                      </td>
                      <td className="p-5 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2">
                          Remaining Principal
                        </label>
                        <p className="text-base font-black text-primary tracking-tight">
                          ₹
                          {remainingPrincipal.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </td>
                    </tr>

                    {/* Row 3: Charges */}
                    <tr className="border-b border-slate-100">
                      <td className="p-5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Foreclosure Charge (%)
                        </label>
                        <input
                          type="number"
                          name="foreclosureChargePercent"
                          value={formData.foreclosureChargePercent}
                          onChange={handleInputChange}
                          className="w-full bg-transparent text-base font-black text-slate-800 focus:outline-none placeholder:text-slate-200"
                          placeholder="00"
                        />
                      </td>
                      <td className="p-5 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Charge Amount
                        </label>
                        <p className="text-base font-black text-slate-800 tracking-tight">
                          ₹
                          {formData.foreclosureChargeAmount.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            },
                          )}
                        </p>
                      </td>
                      <td className="p-5 border-l border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          OD Amount
                        </label>
                        <input
                          type="number"
                          name="od"
                          value={formData.od}
                          onChange={handleInputChange}
                          className="w-full bg-transparent text-base font-black text-red-500 focus:outline-none placeholder:text-slate-200"
                          placeholder="0000"
                        />
                      </td>
                    </tr>

                    {/* Row 4: Final Calculation */}
                    <tr>
                      <td className="p-5 border-b border-slate-100">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                          Misalliances Fee
                        </label>
                        <input
                          type="number"
                          name="miscellaneousFee"
                          value={formData.miscellaneousFee}
                          onChange={handleInputChange}
                          className="w-full bg-transparent text-base font-black text-slate-800 focus:outline-none placeholder:text-slate-200"
                          placeholder="0000"
                        />
                      </td>
                      <td className="p-5 border-l border-slate-100 border-b border-slate-100"></td>
                      <td className="p-5 border-l border-slate-100 border-b border-slate-100"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Mode Section */}
              <div className="p-6 bg-white border-t border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">
                  Payment Mode
                </label>
                <div className="flex flex-wrap gap-4 items-start">
                  <div className="flex gap-2">
                    {["Cash", "Online", "Cheque"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            paymentMode: mode,
                            chequeNumber: mode !== "Cheque" ? "" : prev.chequeNumber,
                          }))
                        }
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                          formData.paymentMode === mode
                            ? "bg-primary text-white border-primary shadow-lg shadow-blue-100"
                            : "bg-white text-slate-400 border-slate-100 hover:border-primary/30 hover:text-primary"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  {formData.paymentMode === "Cheque" && (
                    <div className="flex flex-col gap-1 min-w-[200px]">
                      <input
                        type="text"
                        name="chequeNumber"
                        value={formData.chequeNumber}
                        onChange={handleInputChange}
                        maxLength={6}
                        placeholder="6-digit cheque number"
                        className="px-5 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:border-primary/20 transition-all font-mono tracking-widest"
                      />
                      {formData.chequeNumber && formData.chequeNumber.length !== 6 && (
                        <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider ml-1">
                          Cheque number must be 6 digits
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks Section */}
              <div className="p-6 bg-white">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-4">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className="w-full p-6 bg-slate-50/50 border border-slate-100 rounded-3xl text-sm font-bold text-slate-600 focus:outline-none focus:border-primary/20 transition-all resize-none h-24 placeholder:text-slate-300"
                  placeholder="Add a remark for this foreclosure..."
                ></textarea>
              </div>

              {/* Separated Total Pay Card */}
              <div className="px-6 py-6 flex justify-end bg-slate-50/10">
                <div className="bg-slate-900 rounded-[1.8rem] overflow-hidden flex items-center shadow-2xl shadow-slate-900/40 w-full max-w-sm h-24">
                  <div className="flex-1 px-8 py-4">
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-0.5">
                      Total Pay Amount
                    </label>
                    <p className="text-2xl font-black text-white tracking-tighter">
                      ₹
                      {totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div className="px-6 h-full flex items-center bg-white/5 border-l border-white/5">
                    <button
                      onClick={() => setShowPreview(true)}
                      disabled={!selectedLoan || loading}
                      className="px-8 py-3.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-30 disabled:grayscale disabled:pointer-events-none"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {modalStep === 1
                      ? "Foreclosure Preview"
                      : "Payment Details"}
                  </h3>
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setModalStep(1);
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 transition-all"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  {modalStep === 1 ? (
                    <>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Customer
                          </label>
                          <p className="text-xs font-black text-slate-900 uppercase">
                            {selectedLoan?.customerDetails?.customerName}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Loan Number
                          </label>
                          <p className="text-xs font-black text-primary uppercase">
                            {selectedLoan?.loanTerms?.loanNumber}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Vehicle
                          </label>
                          <p className="text-xs font-black text-slate-900 uppercase">
                            {selectedLoan?.vehicleInformation?.vehicleNumber} (
                            {selectedLoan?.vehicleInformation?.model || "—"})
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Remaining Principal
                          </label>
                          <p className="text-xs font-black text-slate-900">
                            ₹
                            {remainingPrincipal.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-900 rounded-[1.2rem] p-4 text-center space-y-0.5 max-w-[220px] mx-auto">
                        <label className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em]">
                          Total Foreclosure Amount
                        </label>
                        <p className="text-lg font-black text-white tracking-tighter">
                          ₹
                          {totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                          <span className="text-lg">⚠️</span>
                          <p className="text-[9px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
                            Warning: This action will close the loan
                            permanently. All pending EMIs will be marked as
                            paid. This process cannot be undone.
                          </p>
                        </div>

                        <div className="flex gap-4 pt-2">
                          <button
                            onClick={() => setShowPreview(false)}
                            className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[9px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                          >
                            BACK TO EDIT
                          </button>
                          <button
                            onClick={() => {
                              setPaymentData((prev) => ({
                                ...prev,
                                paymentBreakdown: [
                                  { mode: "CASH", amount: totalAmount },
                                ],
                              }));
                              setModalStep(2);
                            }}
                            className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
                          >
                            PROCEED TO PAYMENT
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Payment Date
                          </label>
                          <input
                            type="date"
                            name="paymentDate"
                            value={paymentData.paymentDate}
                            onChange={(e) =>
                              setPaymentData({
                                ...paymentData,
                                paymentDate: e.target.value,
                              })
                            }
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-primary/20 transition-all"
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Payment Breakdown
                            </label>
                            <button
                              onClick={addPaymentRow}
                              className="text-[9px] font-black text-primary uppercase tracking-tighter hover:underline"
                            >
                              + Add Mode
                            </button>
                          </div>

                          <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {paymentData.paymentBreakdown.map((row, index) => (
                              <div
                                key={index}
                                className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-300"
                              >
                                <select
                                  value={row.mode}
                                  onChange={(e) =>
                                    handlePaymentChange(
                                      index,
                                      "mode",
                                      e.target.value,
                                    )
                                  }
                                  className="w-1/3 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-primary/20"
                                >
                                  <option value="CASH">CASH</option>
                                  <option value="BANK">BANK</option>
                                  <option value="PAYTM">PAYTM</option>
                                  <option value="CHEQUE">CHEQUE</option>
                                  <option value="OTHERS">OTHERS</option>
                                </select>
                                <div className="flex-1 relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    value={row.amount}
                                    onChange={(e) =>
                                      handlePaymentChange(
                                        index,
                                        "amount",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full pl-7 pr-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:border-primary/20"
                                    placeholder="0.00"
                                  />
                                </div>
                                {row.mode === "CHEQUE" && (
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      maxLength="6"
                                      value={row.chequeNumber || ""}
                                      onChange={(e) =>
                                        handlePaymentChange(
                                          index,
                                          "chequeNumber",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:border-primary/20 font-mono"
                                      placeholder="Cheque No."
                                      required
                                    />
                                  </div>
                                )}
                                {paymentData.paymentBreakdown.length > 1 && (
                                  <button
                                    onClick={() => removePaymentRow(index)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Total Summary */}
                        <div className="pt-4 border-t border-slate-100">
                          <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Received Total
                            </span>
                            <span
                              className={`text-sm font-black tracking-tight ${
                                paymentData.paymentBreakdown.reduce(
                                  (acc, curr) => acc + curr.amount,
                                  0,
                                ) <
                                totalAmount - 0.1
                                  ? "text-red-500"
                                  : "text-green-600"
                              }`}
                            >
                              ₹
                              {paymentData.paymentBreakdown
                                .reduce((acc, curr) => acc + curr.amount, 0)
                                .toLocaleString()}
                            </span>
                          </div>
                          {paymentData.paymentBreakdown.reduce(
                            (acc, curr) => acc + curr.amount,
                            0,
                          ) <
                            totalAmount - 0.1 && (
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-tight text-right pr-2 mt-1 animate-pulse">
                              Must be at least: ₹{totalAmount.toLocaleString()}
                            </p>
                          )}
                          {paymentData.paymentBreakdown.reduce(
                            (acc, curr) => acc + curr.amount,
                            0,
                          ) >
                            totalAmount + 0.1 && (
                            <p className="text-[9px] font-black text-green-600 uppercase tracking-tight text-right pr-2 mt-1">
                              Excess Amount: ₹
                              {(
                                paymentData.paymentBreakdown.reduce(
                                  (acc, curr) => acc + curr.amount,
                                  0,
                                ) - totalAmount
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {paymentData.paymentBreakdown.reduce(
                          (acc, curr) => acc + curr.amount,
                          0,
                        ) >=
                          totalAmount - 0.1 && (
                          <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex gap-3 animate-in fade-in duration-300">
                            <span className="text-lg">✅</span>
                            <p className="text-[9px] font-bold text-green-800 leading-relaxed uppercase tracking-tight">
                              Amounts verified.{" "}
                              {paymentData.paymentBreakdown.reduce(
                                (acc, curr) => acc + curr.amount,
                                0,
                              ) >
                                totalAmount + 0.1 &&
                                "Excess payment being recorded. "}
                              Ready to close the loan.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => setModalStep(1)}
                          className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-[9px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                        >
                          BACK
                        </button>
                        <button
                          onClick={handleProceed}
                          disabled={
                            loading ||
                            paymentData.paymentBreakdown.reduce(
                              (acc, curr) => acc + curr.amount,
                              0,
                            ) <
                              totalAmount - 0.1
                          }
                          className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-30 disabled:grayscale"
                        >
                          {loading ? "PROCESSING..." : "CONFIRM & CLOSE LOAN"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default ForeclosurePage;
