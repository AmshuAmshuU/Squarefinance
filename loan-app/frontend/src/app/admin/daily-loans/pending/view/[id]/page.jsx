"use client";
import { useState, useEffect, use, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "../../../../../../components/AuthGuard";
import Navbar from "../../../../../../components/Navbar";
import Sidebar from "../../../../../../components/Sidebar";
import ContactActionMenu from "../../../../../../components/ContactActionMenu";
import PaymentModeSelector from "../../../../../../components/PaymentModeSelector";
import {
  getDailyPendingEmiDetails,
  updateDailyLoan,
} from "../../../../../../services/dailyLoan.service";
import { updateEMI } from "../../../../../../services/customer";
import { format } from "date-fns";
import { useToast } from "../../../../../../context/ToastContext";

const DailyLoanPendingViewPage = ({ params: paramsPromise }) => {
  const params = use(paramsPromise);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPage = searchParams.get("from");
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dateGroups, setDateGroups] = useState([]);
  const [editData, setEditData] = useState({
    overdue: 0,
    status: "Pending",
    remarks: "",
  });
  const [activeContactMenu, setActiveContactMenu] = useState(null);
  const [pendingEmis, setPendingEmis] = useState([]);
  const [selectedEmi, setSelectedEmi] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (params.id) fetchLoanDetails();
  }, [params.id, fetchLoanDetails]);

  const fetchLoanDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDailyPendingEmiDetails(params.id);
      if (res.data && Array.isArray(res.data)) {
        setPendingEmis(res.data);
        const current =
          res.data.find((e) => e._id === params.id) || res.data[0];
        setLoan(current);
        setNewStatus(current.clientResponse || "");
        setNewFollowUpDate(
          current.nextFollowUpDate
            ? new Date(current.nextFollowUpDate).toISOString().split("T")[0]
            : "",
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      await updateDailyLoan(loan.loanId, {
        clientResponse: newStatus,
        nextFollowUpDate: newFollowUpDate,
      });
      showToast("Client response updated globally", "success");
      const redirectPath =
        fromPage === "followup"
          ? "/admin/daily-loans/followups"
          : "/admin/daily-loans/pending";
      router.push(redirectPath);
    } catch (err) {
      showToast(err.message || "Failed to update response", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddDate = () => {
    setDateGroups([
      ...dateGroups,
      {
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        payments: [{ id: Date.now() + 1, mode: "CASH", amount: "", chequeNumber: "" }],
      },
    ]);
  };

  const handleAddMore = (groupId) => {
    setDateGroups(
      dateGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            payments: [
              ...group.payments,
              { id: Date.now(), mode: "", amount: "" },
            ],
          };
        }
        return group;
      }),
    );
  };

  const handleGroupDateChange = (groupId, value) => {
    setDateGroups(
      dateGroups.map((group) =>
        group.id === groupId ? { ...group, date: value } : group,
      ),
    );
  };

  const handlePaymentChange = (groupId, paymentId, field, value) => {
    setDateGroups(
      dateGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            payments: group.payments.map((p) =>
              p.id === paymentId ? { ...p, [field]: value } : p,
            ),
          };
        }
        return group;
      }),
    );
  };

  const handleRemovePayment = (groupId, paymentId) => {
    setDateGroups(
      dateGroups
        .map((group) => {
          if (group.id === groupId) {
            return {
              ...group,
              payments: group.payments.filter((p) => p.id !== paymentId),
            };
          }
          return group;
        })
        .filter((g) => g.payments.length > 0),
    );
  };

  const calculateTotalPaidNow = () => {
    return dateGroups.reduce((acc, group) => {
      return (
        acc +
        group.payments.reduce(
          (pAcc, p) => pAcc + (parseFloat(p.amount) || 0),
          0,
        )
      );
    }, 0);
  };

  const remainingBalance = Math.max(
    0,
    (selectedEmi?.emiAmount || 0) - calculateTotalPaidNow(),
  );

  const handleSaveEMI = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      // Filter out payments with no amount before sending
      const sanitizedDateGroups = dateGroups
        .map((group) => ({
          ...group,
          payments: group.payments.filter(
            (p) => p.amount && parseFloat(p.amount) > 0,
          ),
        }))
        .filter((group) => group.payments.length > 0);

      const payload = {
        ...editData,
        dateGroups: sanitizedDateGroups,
      };

      // Validation for Cheque Numbers
      for (const group of sanitizedDateGroups) {
        for (const p of group.payments) {
          if (p.mode === "Cheque") {
            if (!p.chequeNumber || p.chequeNumber.length !== 6) {
              showToast("Cheque number must be exactly 6 digits", "error");
              setUpdating(false);
              return;
            }
          }
        }
      }

      await updateEMI(selectedEmi._id, payload);
      showToast("EMI updated successfully", "success");
      setShowModal(false);
      const redirectPath =
        fromPage === "followup"
          ? "/admin/daily-loans/followups"
          : "/admin/daily-loans/pending";
      router.push(redirectPath);
    } catch (error) {
      showToast(error.message || "Failed to update EMI", "error");
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center font-black uppercase text-slate-300">
        Loading details...
      </div>
    );
  if (!loan)
    return (
      <div className="p-20 text-center font-black uppercase text-red-400">
        Loan record not found
      </div>
    );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                  >
                    ←
                  </button>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                      Daily Loan Pending Details
                    </h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                      Manage collection response for {loan.loanNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Contact Information */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-4">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-1">
                          Applicant
                        </span>
                        <p className="text-sm font-black text-slate-900 uppercase">
                          {loan.customerName}
                        </p>
                        <div className="space-y-2 mt-1">
                          {(Array.isArray(loan.mobileNumbers) ? loan.mobileNumbers : [loan.mobileNumber]).filter(Boolean).map((num, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveContactMenu({
                                  number: num,
                                  name: loan.customerName,
                                  type: "Applicant",
                                  x: rect.left,
                                  y: rect.bottom,
                                });
                              }}
                              className="text-xs font-bold text-primary hover:underline block"
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(loan.guarantorName || loan.guarantorMobileNumber) && (
                        <div>
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-1">
                            Guarantor
                          </span>
                          <p className="text-sm font-black text-slate-900 uppercase">
                            {loan.guarantorName || "N/A"}
                          </p>
                          <div className="space-y-2 mt-1">
                            {(Array.isArray(loan.guarantorMobileNumbers) ? loan.guarantorMobileNumbers : [loan.guarantorMobileNumber]).filter(Boolean).map((num, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setActiveContactMenu({
                                    number: num,
                                    name: loan.guarantorName,
                                    type: "Guarantor",
                                    x: rect.left,
                                    y: rect.bottom,
                                  });
                                }}
                                className="text-xs font-bold text-primary hover:underline block"
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Update Section */}
                  <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl shadow-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Status Update (Client Response)
                      </h3>
                      {loan.updatedBy && (
                        <div className="flex flex-col items-start md:items-end pointer-events-none">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                            Last Updated By
                          </span>
                          <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tight">
                              {loan.updatedBy}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-red-500/40" />
                            <span className="text-[9px] font-bold text-slate-400 font-mono">
                              {loan.updatedAt &&
                                format(new Date(loan.updatedAt), "dd/MM/yy HH:mm")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                          Message
                        </label>
                        <textarea
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          placeholder="Enter response..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-sm font-medium focus:outline-none focus:border-primary transition-all min-h-[100px] placeholder:text-slate-600 resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Follow-up Date
                          </label>
                          {newFollowUpDate && (
                            <button
                              type="button"
                              onClick={() => setNewFollowUpDate("")}
                              className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <input
                          type="date"
                          value={newFollowUpDate}
                          onChange={(e) => setNewFollowUpDate(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-sm font-medium focus:outline-none focus:border-primary transition-all [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleUpdateStatus}
                      disabled={updating}
                      className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-500/20"
                    >
                      {updating ? "Updating..." : "Update Client Response"}
                    </button>
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-4">
                      Installment Summary
                    </span>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Disbursement
                        </span>
                        <span className="text-xs font-black text-slate-900 font-mono">
                          ₹{loan.disbursementAmount?.toLocaleString()}
                        </span>
                      </div>

                      {(() => {
                        const totalRemaining = pendingEmis.reduce(
                          (sum, emi) =>
                            sum + (emi.emiAmount - (emi.amountPaid || 0)),
                          0,
                        );

                        return (
                          <>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                Overdue Days
                              </span>
                              <span className="text-xs font-black text-slate-600 font-mono">
                                {pendingEmis.length}{" "}
                                {pendingEmis.length === 1 ? "Day" : "Days"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-50 pt-3 mb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                Remaining Due
                              </span>
                              <span className="text-sm font-black text-red-600 font-mono">
                                ₹{totalRemaining.toLocaleString()}
                              </span>
                            </div>
                          </>
                        );
                      })()}

                      <div className="pt-4 pb-2">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-2 border-b border-primary/20 pb-1">
                          Pending Installments
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {pendingEmis.map((emi) => (
                          <div
                            key={emi._id}
                            className="bg-white border border-red-100 ring-1 ring-red-50 rounded-[2rem] p-4 mb-2 last:mb-0 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                {emi.status}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase">
                                Day #{emi.emiNumber}
                              </span>
                            </div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                  Due Date
                                </span>
                                <p className="text-[11px] font-black text-slate-900 uppercase">
                                  {emi.dueDate &&
                                    format(new Date(emi.dueDate), "dd MMM yy")}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                  Amount
                                </span>
                                <p className="text-[12px] font-black text-red-600 font-mono">
                                  ₹{emi.emiAmount?.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedEmi(emi);
                                setEditData({
                                  overdue: emi.overdue || 0,
                                  status: emi.status || "Pending",
                                  remarks: emi.remarks || "",
                                });

                                if (
                                  emi.paymentHistory &&
                                  emi.paymentHistory.length > 0
                                ) {
                                  const groups = {};
                                  emi.paymentHistory.forEach((p) => {
                                    const dateKey = new Date(p.date)
                                      .toISOString()
                                      .split("T")[0];
                                    if (!groups[dateKey]) {
                                      groups[dateKey] = {
                                        id: Math.random(),
                                        date: dateKey,
                                        payments: [],
                                      };
                                    }
                                    groups[dateKey].payments.push({
                                      id: Math.random(),
                                      mode: p.mode,
                                      amount: p.amount,
                                    });
                                  });
                                  setDateGroups(Object.values(groups));
                                } else if (emi.amountPaid > 0) {
                                  setDateGroups([
                                    {
                                      id: Date.now(),
                                      date: emi.paymentDate
                                        ? new Date(emi.paymentDate)
                                            .toISOString()
                                            .split("T")[0]
                                        : new Date()
                                            .toISOString()
                                            .split("T")[0],
                                      payments: [
                                        {
                                          id: Date.now() + 1,
                                          mode:
                                            (emi.paymentMode || "").split(
                                              ", ",
                                            )[0] || "CASH",
                                          amount: emi.amountPaid,
                                        },
                                      ],
                                    },
                                  ]);
                                } else {
                                  setDateGroups([
                                    {
                                      id: Date.now(),
                                      date: new Date()
                                        .toISOString()
                                        .split("T")[0],
                                      payments: [
                                        {
                                          id: Date.now() + 1,
                                          mode: "CASH",
                                          amount: "",
                                        },
                                      ],
                                    },
                                  ]);
                                }
                                setShowModal(true);
                              }}
                              className="w-full bg-primary hover:bg-blue-700 text-white rounded-xl py-2.5 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 mt-2"
                            >
                              PAY EMI
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Modal */}
            {showModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        UPDATE DAY #{selectedEmi?.emiNumber}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        DUE DATE:{" "}
                        {selectedEmi?.dueDate &&
                          format(
                            new Date(selectedEmi.dueDate),
                            "dd-MM-yyyy",
                          )}{" "}
                        | AMOUNT: ₹{selectedEmi?.emiAmount}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form
                    onSubmit={handleSaveEMI}
                    className="flex flex-col max-h-[85vh]"
                  >
                    <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">
                          Remaining Amount
                        </label>
                        <div className="text-xl font-black text-slate-900">
                          ₹{remainingBalance.toLocaleString()}
                        </div>
                      </div>

                      <div className="space-y-6">
                        {dateGroups.map((group) => (
                          <div
                            key={group.id}
                            className="space-y-4 p-4 border border-slate-100 rounded-2xl bg-white shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex justify-between items-center px-1 mb-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Payment Date
                                  </label>
                                  {group.date && (
                                    <button
                                      type="button"
                                      onClick={() => handleGroupDateChange(group.id, "")}
                                      className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="date"
                                  value={group.date}
                                  onChange={(e) =>
                                    handleGroupDateChange(
                                      group.id,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                  required
                                />
                              </div>
                              {dateGroups.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDateGroups(
                                      dateGroups.filter(
                                        (g) => g.id !== group.id,
                                      ),
                                    )
                                  }
                                  className="mt-6 p-2 text-red-400 hover:text-red-600 transition-colors"
                                >
                                  ✕
                                </button>
                              )}
                            </div>

                            <div className="space-y-4 pl-4 border-l-2 border-slate-50">
                              {group.payments.map((payment) => (
                                <div
                                  key={payment.id}
                                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                  <PaymentModeSelector
                                    value={payment.mode}
                                    allowMultiple={false}
                                    onChange={(val) =>
                                      handlePaymentChange(
                                        group.id,
                                        payment.id,
                                        "mode",
                                        val,
                                      )
                                    }
                                  />
                                  {payment.mode === "Cheque" && (
                                    <div className="md:col-span-2">
                                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        Cheque Number (6 Digits)
                                      </label>
                                      <input
                                        type="text"
                                        maxLength="6"
                                        value={payment.chequeNumber || ""}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/\D/g, "");
                                          handlePaymentChange(
                                            group.id,
                                            payment.id,
                                            "chequeNumber",
                                            val,
                                          );
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                                        placeholder="123456"
                                        required
                                      />
                                    </div>
                                  )}
                                  <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        Amount
                                      </label>
                                      <input
                                        type="number"
                                        value={payment.amount}
                                        onChange={(e) =>
                                          handlePaymentChange(
                                            group.id,
                                            payment.id,
                                            "amount",
                                            e.target.value,
                                          )
                                        }
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                        placeholder="0.00"
                                        required
                                      />
                                    </div>
                                    {group.payments.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemovePayment(
                                            group.id,
                                            payment.id,
                                          )
                                        }
                                        className="mb-2 p-2 text-red-400 hover:text-red-600 transition-colors font-bold"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => handleAddMore(group.id)}
                                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1.5 px-1 py-1"
                              >
                                + Add More Payment
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleAddDate}
                          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-primary hover:text-primary transition-all bg-slate-50/50"
                        >
                          + Add Payment Date
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Status
                          </label>
                          <div
                            className={`w-full px-4 py-3 border rounded-xl text-sm font-black uppercase tracking-wider ${
                              remainingBalance === 0
                                ? "bg-green-50 border-green-200 text-green-600"
                                : remainingBalance <
                                    (selectedEmi?.emiAmount || 0)
                                  ? "bg-orange-50 border-orange-200 text-orange-600"
                                  : "bg-red-50 border-red-200 text-red-600"
                            }`}
                          >
                            {remainingBalance === 0
                              ? "Paid"
                              : remainingBalance < (selectedEmi?.emiAmount || 0)
                                ? "Partially Paid"
                                : "Pending"}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Remark
                          </label>
                          <input
                            type="text"
                            name="remarks"
                            value={editData.remarks}
                            onChange={handleModalChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            placeholder="Optional..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                      <button
                        type="submit"
                        disabled={updating}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        {updating ? "Processing..." : "Submit Payment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
        <ContactActionMenu
          contact={activeContactMenu}
          onClose={() => setActiveContactMenu(null)}
        />
      </div>
    </AuthGuard>
  );
};

export default DailyLoanPendingViewPage;
