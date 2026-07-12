"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import interestLoanService from "@/services/interestLoanService";
import { useToast } from "@/context/ToastContext";
import { Plus, IndianRupee, History, Info } from "lucide-react";

const InterestLoanDetails = ({ loan, emis, onRefresh }) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [principalModalOpen, setPrincipalModalOpen] = useState(false);
  const [principalPayment, setPrincipalPayment] = useState({
    amount: "",
    paymentMode: "Cash",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    remarks: "",
  });

  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedEMI, setSelectedEMI] = useState(null);
  const [interestPayment, setInterestPayment] = useState({
    amountPaid: "",
    paymentMode: "Cash",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    remarks: "",
  });

  const handlePrincipalSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await interestLoanService.addPrincipalPayment(loan._id, principalPayment);
      showToast("Principal payment recorded", "success");
      setPrincipalModalOpen(false);
      onRefresh();
    } catch (err) {
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInterestSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await interestLoanService.payInterestEMI(selectedEMI._id, interestPayment);
      showToast("Interest payment recorded", "success");
      setInterestModalOpen(false);
      onRefresh();
    } catch (err) {
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openInterestModal = (emi) => {
    setSelectedEMI(emi);
    setInterestPayment({
      amountPaid: emi.interestAmount - (emi.amountPaid || 0),
      paymentMode: "Cash",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      remarks: "",
    });
    setInterestModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><IndianRupee size={20} /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remaining Principal</span>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{loan.remainingPrincipalAmount?.toLocaleString("en-IN")}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Initial: ₹{loan.initialPrincipalAmount?.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">%</div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interest Rate</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{loan.interestRate}%</p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Monthly Payable</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Plus size={20} /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Interest</span>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{Math.ceil(loan.remainingPrincipalAmount * (loan.interestRate / 100))?.toLocaleString("en-IN")}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Next Cycle</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-center items-center">
          <button 
            onClick={() => setPrincipalModalOpen(true)}
            className="w-full h-full bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
          >
            <Plus size={16} /> Pay Principal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tables */}
        <div className="lg:col-span-2 space-y-8">
          {/* Interest EMI Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">📅</span>
                Interest Payments
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Interest #</th>
                    <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                    <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {emis.map((emi) => (
                    <tr key={emi._id} className="hover:bg-slate-50 group">
                      <td className="px-8 py-4 font-black text-slate-400 text-xs">#{emi.emiNumber}</td>
                      <td className="px-4 py-4 font-bold text-slate-600 text-xs">{format(new Date(emi.dueDate), "dd MMM yyyy")}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-xs">₹{emi.interestAmount?.toLocaleString("en-IN")}</span>
                          {emi.amountPaid > 0 && <span className="text-[9px] text-emerald-500 font-bold">Paid: ₹{emi.amountPaid}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                          emi.status === "Paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          emi.status === "Partially Paid" ? "bg-blue-50 text-blue-600 border-blue-100" :
                          "bg-slate-50 text-slate-400 border-slate-100"
                        }`}>{emi.status}</span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        {emi.status !== "Paid" && (
                          <button 
                            onClick={() => openInterestModal(emi)}
                            className="text-[9px] font-black text-primary uppercase border border-primary/20 px-3 py-1 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Principal Repayment History */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-sm">💰</span>
                Principal Repayment History
              </h3>
            </div>
            <div className="p-8">
              {loan.principalPayments?.length > 0 ? (
                <div className="space-y-4">
                  {loan.principalPayments.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100"><IndianRupee size={16} /></div>
                        <div>
                          <p className="text-sm font-black text-slate-900">₹{p.amount?.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{p.paymentMode} • {format(new Date(p.paymentDate), "dd/MM/yyyy")}</p>
                        </div>
                      </div>
                      {p.remarks && <span className="text-[10px] text-slate-400 italic bg-white px-3 py-1 rounded-lg border border-slate-100">{p.remarks}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-300 font-bold text-xs uppercase tracking-widest">No principal payments yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Info Cards */}
        <div className="space-y-8">
          {/* Customer Info */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Info size={14} className="text-primary" /> Customer Details
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Name</p>
                <p className="text-sm font-bold text-slate-900">{loan.customerName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PAN</p>
                  <p className="text-xs font-bold text-slate-700">{loan.panNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aadhaar</p>
                  <p className="text-xs font-bold text-slate-700">{loan.aadharNumber || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                <p className="text-xs font-bold text-slate-600 leading-relaxed">{loan.address || "—"}</p>
              </div>

              {/* Guarantor Info */}
              <div className="pt-4 border-t border-slate-50 space-y-4">
                <div>
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Guarantor Name</p>
                  <p className="text-sm font-bold text-slate-900">{loan.guarantorName || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Guarantor Contacts</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {loan.guarantorMobileNumbers?.length > 0 ? (
                      loan.guarantorMobileNumbers.map((num, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-100">
                          {num}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 font-bold italic">—</span>
                    )}
                  </div>
                </div>
              </div>
          </div>
        </div>

        {/* Pledge Info */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <History size={14} className="text-primary" /> Pledge Information
            </h3>
            {loan.remarks ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {loan.remarks}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-bold italic">
                No pledge information recorded
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Principal Payment Modal */}
      {principalModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-md p-10 shadow-2xl relative">
            <button onClick={() => setPrincipalModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors text-2xl font-black">×</button>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8">Principal Payment</h3>
            <form onSubmit={handlePrincipalSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Amount to Repay</label>
                <input 
                  type="number" 
                  value={principalPayment.amount} 
                  onChange={(e) => setPrincipalPayment({ ...principalPayment, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent rounded-2xl px-6 py-5 text-sm font-black focus:ring-4 focus:ring-emerald-100 focus:outline-none transition-all"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Mode</label>
                  <select 
                    value={principalPayment.paymentMode} 
                    onChange={(e) => setPrincipalPayment({ ...principalPayment, paymentMode: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-inter"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Date</label>
                  <input 
                    type="date" 
                    value={principalPayment.paymentDate}
                    onChange={(e) => setPrincipalPayment({ ...principalPayment, paymentDate: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Remarks</label>
                <textarea 
                  value={principalPayment.remarks}
                  onChange={(e) => setPrincipalPayment({ ...principalPayment, remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all min-h-[80px]"
                  placeholder="Optional remarks"
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-emerald-600 text-white rounded-2xl py-5 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Confirm Repayment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Interest Payment Modal */}
      {interestModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-md p-10 shadow-2xl relative">
            <button onClick={() => setInterestModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-colors text-2xl font-black">×</button>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Interest Payment</h3>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-8">FOR INTEREST #{selectedEMI?.emiNumber}</p>
            <form onSubmit={handleInterestSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Amount to Pay</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={interestPayment.amountPaid} 
                    onChange={(e) => setInterestPayment({ ...interestPayment, amountPaid: e.target.value })}
                    className="w-full bg-blue-50/50 border border-transparent rounded-2xl px-6 py-5 text-sm font-black text-blue-900 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                    required
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-300 uppercase tracking-widest">Payable: ₹{selectedEMI?.interestAmount - selectedEMI?.amountPaid}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Mode</label>
                  <select 
                    value={interestPayment.paymentMode} 
                    onChange={(e) => setInterestPayment({ ...interestPayment, paymentMode: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Date</label>
                  <input 
                    type="date" 
                    value={interestPayment.paymentDate}
                    onChange={(e) => setInterestPayment({ ...interestPayment, paymentDate: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-blue-600 text-white rounded-2xl py-5 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Complete Payment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterestLoanDetails;
