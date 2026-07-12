"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "../../../../../components/AuthGuard";
import Navbar from "../../../../../components/Navbar";
import Sidebar from "../../../../../components/Sidebar";
import ContactActionMenu from "../../../../../components/ContactActionMenu";
import PaymentModeSelector from "../../../../../components/PaymentModeSelector";
import {
  getLoanById,
  getPendingEmiDetails,
  updateLoan,
  updatePaymentStatus,
  updateFollowup,
} from "../../../../../services/loan.service";
import { updateEMI } from "../../../../../services/customer";
import { format } from "date-fns";
import { useToast } from "../../../../../context/ToastContext";
import { hasPermission } from "../../../../../utils/auth";

const LoanPendingViewPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPage = searchParams.get("from");
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  const fetchLoanDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPendingEmiDetails(id);
      if (res.data && Array.isArray(res.data)) {
        setPendingEmis(res.data);
        const current = res.data.find((e) => e._id === id) || res.data[0];
        setLoan(current);
        setNewStatus(current.clientResponse || "");
        setNewFollowUpDate(
          current.nextFollowUpDate
            ? new Date(current.nextFollowUpDate).toISOString().split("T")[0]
            : "",
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchLoanDetails();
  }, [id, fetchLoanDetails]);

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      await updateFollowup(loan.loanId, {
        loanModel: loan.loanModel || "Loan",
        clientResponse: newStatus,
        nextFollowUpDate: newFollowUpDate,
      });
      showToast("Client response updated globally", "success");
      const redirectPath =
        fromPage === "partial"
          ? "/admin/partial-payments"
          : "/admin/pending-payments";
      router.push(redirectPath);
    } catch (err) {
      setError(err.message);
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
              { id: Date.now(), mode: "CASH", amount: "", chequeNumber: "" },
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
        fromPage === "partial"
          ? "/admin/partial-payments"
          : "/admin/pending-payments";
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
        <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
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
                      {fromPage === "partial"
                        ? "Partial EMI Details"
                        : "Pending EMI Details"}
                    </h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                      Manage collection response for {loan.loanNumber}
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Applicant & Guarantor */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-4">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-2">
                          Applicant
                        </span>
                        <p className="text-sm font-black text-slate-900 uppercase">
                          {loan.customerName}
                        </p>
                        <div className="text-xs font-bold text-slate-500 mt-1 flex flex-col items-start gap-1">
                          {(loan.mobileNumbers || []).map((num, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setActiveContactMenu({
                                  number: num,
                                  name: loan.customerName,
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
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-2">
                          Guarantor
                        </span>
                        <p className="text-sm font-black text-slate-900 uppercase">
                          {loan.guarantorName || "N/A"}
                        </p>
                        <div className="text-xs font-bold text-slate-500 mt-1 flex flex-col items-start gap-1">
                          {(loan.guarantorMobileNumbers || []).length > 0 ? (
                            loan.guarantorMobileNumbers.map((num, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  setActiveContactMenu({
                                    number: num,
                                    name: loan.guarantorName || "Guarantor",
                                    type: "Guarantor",
                                    x: rect.left,
                                    y: rect.bottom,
                                  });
                                }}
                                className="hover:text-primary transition-colors"
                              >
                                {num}
                              </button>
                            ))
                          ) : (
                            <p className="text-slate-300">-</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-50 pb-4">
                      Asset Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                          Vehicle No
                        </span>
                        <p className="text-xs font-black text-slate-800 uppercase">
                          {loan.vehicleNumber}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                          Model Year
                        </span>
                        <p className="text-xs font-black text-slate-800 uppercase">
                          {loan.modelYear}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                          Engine No
                        </span>
                        <p className="text-xs font-black text-slate-800 uppercase">
                          {!loan.engineNumber || loan.engineNumber === "N/A"
                            ? "-"
                            : loan.engineNumber}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">
                          Chassis No
                        </span>
                        <p className="text-xs font-black text-slate-800 uppercase">
                          {!loan.chassisNumber || loan.chassisNumber === "N/A"
                            ? "-"
                            : loan.chassisNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Update Section */}
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
                          className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white text-sm font-medium focus:outline-none focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    {hasPermission("loans.edit") && (
                      <button
                        onClick={handleUpdateStatus}
                        disabled={updating}
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-500/20"
                      >
                        {updating ? "Updating..." : "Update Client Response"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-4">
                      Financial Summary
                    </span>
                    <div className="space-y-4">
                      {/* principal, total months, total overdue summary */}
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Principal
                        </span>
                        <span className="text-xs font-black text-slate-900 font-mono">
                          ₹{loan.principalAmount?.toLocaleString()}
                        </span>
                      </div>

                      {(() => {
                        const filtered = pendingEmis.filter((emi) =>
                          fromPage === "partial"
                            ? emi.status === "Partially Paid"
                            : emi.status === "Pending",
                        );
                        const totalRemaining = filtered.reduce(
                          (sum, emi) =>
                            sum + (emi.emiAmount - (emi.amountPaid || 0)),
                          0,
                        );

                        return (
                          <>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                Total (
                                {fromPage === "partial" ? "Partial" : "Pending"}
                                )
                              </span>
                              <span className="text-xs font-black text-slate-600 font-mono">
                                {filtered.length}{" "}
                                {filtered.length === 1 ? "Month" : "Months"}
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
                          {fromPage === "partial"
                            ? "Partially Paid"
                            : "Pending"}{" "}
                          Installments
                        </span>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {pendingEmis
                          .filter((emi) =>
                            fromPage === "partial"
                              ? emi.status === "Partially Paid"
                              : emi.status === "Pending",
                          )
                          .map((emi, idx) => (
                            <div
                              key={emi._id}
                              className={`bg-white border rounded-[2rem] p-4 mb-2 last:mb-0 shadow-sm hover:shadow-md transition-shadow ${emi.status === "Partially Paid" ? "border-orange-100 ring-1 ring-orange-50" : "border-red-100 ring-1 ring-red-50"}`}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span
                                  className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${emi.status === "Partially Paid" ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"}`}
                                >
                                  {emi.status}
                                </span>
                              </div>
                              {/* Header: Date & Amount */}
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                    Due Date
                                  </span>
                                  <p className="text-[11px] font-black text-slate-900 uppercase">
                                    {emi.dueDate &&
                                      format(
                                        new Date(emi.dueDate),
                                        "dd MMM yy",
                                      )}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                    Due Amount
                                  </span>
                                  <p className="text-[12px] font-black text-red-600 font-mono">
                                    ₹{emi.emiAmount?.toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Mid row: Paid & Balance (Conditional) */}
                              {emi.amountPaid > 0 && (
                                <div className="grid grid-cols-2 gap-2 py-2.5 border-y border-slate-50 mb-3">
                                  <div>
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                      Paid
                                    </span>
                                    <p className="text-[10px] font-bold text-emerald-600">
                                      ₹{emi.amountPaid?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.15em] block mb-0.5">
                                      Balance
                                    </span>
                                    <p className="text-[10px] font-bold text-red-600">
                                      ₹
                                      {Math.max(
                                        0,
                                        (emi.emiAmount || 0) -
                                        (emi.amountPaid || 0),
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Action Row: Full Width Button */}
                              {hasPermission("emis.edit") && (
                                <button
                                  onClick={() => {
                                    setSelectedEmi(emi);
                                    setEditData({
                                      overdue: emi.overdue || 0,
                                      status: emi.status || "Pending",
                                      remarks: emi.remarks || "",
                                    });

                                    const sourceHistory =
                                      emi.paymentRecords &&
                                        emi.paymentRecords.length > 0
                                        ? emi.paymentRecords.map((r) => ({
                                          amount: r.amount,
                                          mode: r.mode,
                                          date: r.paymentDate,
                                        }))
                                        : emi.paymentHistory &&
                                          emi.paymentHistory.length > 0
                                          ? emi.paymentHistory
                                          : [];

                                    if (sourceHistory.length > 0) {
                                      // Group history by date
                                      const groups = {};
                                      sourceHistory.forEach((p) => {
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
                                      // Fallback for legacy data (before paymentHistory was added)
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
                                  className="w-full bg-primary hover:bg-blue-700 text-white rounded-xl py-2.5 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-100 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                  <span className="text-sm">₹</span> PAY EMI
                                </button>
                              )}
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
                        UPDATE EMI #{selectedEmi?.emiNumber}
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
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
                    >
                      ✕
                    </button>
                  </div>

                  <form
                    onSubmit={handleSaveEMI}
                    className="flex flex-col max-h-[85vh]"
                  >
                    {/* Scrollable Content Container */}
                    <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                      {/* Remaining Balance at Top */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">
                          Remaining Amount
                        </label>
                        <div className="text-xl font-black text-slate-900">
                          ₹{remainingBalance.toLocaleString()}
                        </div>
                      </div>

                      {/* Dynamic Date Groups */}
                      <div className="space-y-8">
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
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono"
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

                            {/* Payments within group */}
                            <div className="space-y-4 pl-4 border-l-2 border-slate-50">
                              {group.payments.map((payment) => (
                                <div
                                  key={payment.id}
                                  className="grid grid-cols-1 md:grid-cols-2 gap-4 relative"
                                >
                                  <div className="relative">
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
                                  </div>
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
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300 font-mono"
                                        placeholder="123456"
                                        required
                                      />
                                    </div>
                                  )}
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
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300 font-mono"
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
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
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
                                        className="mb-2 p-2 text-red-400 hover:text-red-600 transition-colors"
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
                                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1.5 px-1 py-2"
                              >
                                + Add More
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={handleAddDate}
                          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-primary hover:text-primary transition-all bg-slate-50/50"
                        >
                          + Add Date
                        </button>
                      </div>

                      {/* Status and Overdue Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                            Payment Status
                          </label>
                          <div
                            className={`w-full px-4 py-3 border rounded-xl text-sm font-black uppercase tracking-wider ${remainingBalance === 0
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
                            Overdue Amount
                          </label>
                          <input
                            type="number"
                            name="overdue"
                            value={editData.overdue}
                            onChange={handleModalChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all font-mono"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Remarks */}
                      <div className="pt-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                          Remark
                        </label>
                        <textarea
                          name="remarks"
                          value={editData.remarks}
                          onChange={handleModalChange}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none min-h-[100px]"
                          placeholder="Add any payment notes..."
                        ></textarea>
                      </div>
                    </div>

                    {/* Fixed Footer Buttons Container */}
                    <div className="p-8 border-t border-slate-100 bg-white flex gap-4 mt-auto">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-6 py-4 border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                        CANCEL
                      </button>
                      <button
                        type="submit"
                        disabled={updating}
                        className="flex-[2] px-6 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {updating ? "PROCESSING..." : "UPDATE EMI"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
        {/* Contact Action Menu */}
        <ContactActionMenu
          contact={activeContactMenu}
          onClose={() => setActiveContactMenu(null)}
        />
      </div>
    </AuthGuard>
  );
};

export default LoanPendingViewPage;
