import React, { useState } from "react";
import { updateEMI } from "../services/customer";
import interestLoanService from "../services/interestLoanService";
import { useToast } from "../context/ToastContext";
import PaymentModeSelector from "./PaymentModeSelector";

const EMITable = ({ emis, isEditMode = false, onUpdateSuccess, loanType = "standard" }) => {
  const [editingEmi, setEditingEmi] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();
  const [dateGroups, setDateGroups] = useState([]);
  const [selectedRowId, setSelectedRowId] = useState(null);

  const toggleHighlight = (e, id) => {
    // Don't toggle if clicking a button or internal interactive element
    if (e.target.closest("button") || e.target.closest("select")) return;
    setSelectedRowId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleEditClick = (emi) => {
    setEditingEmi(emi);
    
    // Priority: 1. Pending Approval Data, 2. Confirmed EMI Data, 3. Defaults
    const pendingData = emi.pendingApproval || {};
    
    setEditData({
      overdue: (pendingData.overdue && pendingData.overdue.length > 0)
        ? pendingData.overdue.map(ov => ({ ...ov, id: Math.random(), mode: ov.mode || "Cash", chequeNumber: ov.chequeNumber || "" }))
        : (emi.overdue && Array.isArray(emi.overdue) && emi.overdue.length > 0)
          ? emi.overdue.map(ov => ({ ...ov, id: Math.random(), mode: ov.mode || "Cash", chequeNumber: ov.chequeNumber || "" }))
          : [],
      status: emi.status || "Pending",
      remarks: pendingData.remarks || emi.remarks || "",
    });

    if (pendingData.dateGroups && pendingData.dateGroups.length > 0) {
      // Use pending data groups
      setDateGroups(pendingData.dateGroups.map(g => ({
        ...g,
        id: Math.random(),
        payments: (g.payments || []).map(p => ({ ...p, id: Math.random() }))
      })));
    } else if (emi.paymentHistory && emi.paymentHistory.length > 0) {
      // Group history by date
      const groups = {};
      emi.paymentHistory.forEach((p) => {
        const dateKey = new Date(p.date).toISOString().split("T")[0];
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
          chequeNumber: p.chequeNumber || "",
        });
      });
      setDateGroups(Object.values(groups));
    } else if (emi.amountPaid > 0) {
      // Fallback for legacy data (before paymentHistory was added)
      setDateGroups([
        {
          id: Date.now(),
          date: emi.paymentDate
            ? new Date(emi.paymentDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          payments: [
            {
              id: Date.now() + 1,
              mode: (emi.paymentMode || "").split(", ")[0] || "Cash",
              amount: emi.amountPaid,
              chequeNumber: "",
            },
          ],
        },
      ]);
    } else {
      setDateGroups([
        {
          id: Date.now(),
          date: new Date().toISOString().split("T")[0],
          payments: [{ id: Date.now() + 1, mode: "Cash", amount: "", chequeNumber: "" }],
        },
      ]);
    }
    setShowModal(true);
  };

  const handleAddDate = () => {
    setDateGroups([
      ...dateGroups,
      {
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        payments: [{ id: Date.now() + 1, mode: "Cash", amount: "", chequeNumber: "" }],
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
              { id: Date.now(), mode: "Cash", amount: "", chequeNumber: "" },
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

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    const totalAddedAmount = dateGroups.reduce((acc, group) => {
      return (
        acc +
        group.payments.reduce(
          (pAcc, p) => pAcc + (parseFloat(p.amount) || 0),
          0,
        )
      );
    }, 0);

    const allModes = [
      ...new Set(
        dateGroups
          .flatMap((g) => g.payments.map((p) => p.mode))
          .filter(Boolean),
      ),
    ].join(", ");

    const latestDate = dateGroups[dateGroups.length - 1]?.date;

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

      // Validation for Cheque Numbers
      for (const group of sanitizedDateGroups) {
        for (const p of group.payments) {
          if (p.mode === "Cheque") {
            if (!p.chequeNumber || p.chequeNumber.length !== 6) {
              showToast("Cheque number must be exactly 6 digits", "error");
              setLoading(false);
              return;
            }
          }
        }
      }

      const sanitizedOverdue = editData.overdue
        .filter(ov => ov.amount && parseFloat(ov.amount) > 0)
        .map(({ date, amount, mode, chequeNumber }) => ({ date, amount, mode, chequeNumber }));

      for (const ov of sanitizedOverdue) {
        if (ov.mode === "Cheque") {
          if (!ov.chequeNumber || ov.chequeNumber.length !== 6) {
            showToast("Overdue Cheque number must be exactly 6 digits", "error");
            setLoading(false);
            return;
          }
        }
      }

      if (loanType === "interest") {
        await interestLoanService.payInterestEMI(editingEmi._id, {
          ...editData,
          overdue: sanitizedOverdue,
          dateGroups: sanitizedDateGroups,
        });
      } else {
        await updateEMI(editingEmi._id, {
          ...editData,
          overdue: sanitizedOverdue,
          dateGroups: sanitizedDateGroups,
        });
      }
      setShowModal(false);
      setEditingEmi(null);
      showToast(`${loanType === "interest" ? "Interest" : "EMI"} updated successfully`, "success");
      // Small delay to ensure database write completes before refresh
      setTimeout(() => {
        if (onUpdateSuccess) onUpdateSuccess();
      }, 800);
    } catch (error) {
      console.error("Error updating EMI:", error);
      showToast(
        error.message || `An error occurred while updating ${loanType === "interest" ? "Interest" : "EMI"}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOverdue = () => {
    setEditData((prev) => ({
      ...prev,
      overdue: [
        ...prev.overdue,
        { id: Date.now(), date: new Date().toISOString().split("T")[0], amount: "", mode: "Cash", chequeNumber: "" },
      ],
    }));
  };

  const handleOverdueChange = (id, field, value) => {
    setEditData((prev) => ({
      ...prev,
      overdue: prev.overdue.map((ov) =>
        ov.id === id ? { ...ov, [field]: value } : ov,
      ),
    }));
  };

  const handleRemoveOverdue = (id) => {
    setEditData((prev) => ({
      ...prev,
      overdue: prev.overdue.filter((ov) => ov.id !== id),
    }));
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
    (editingEmi?.emiAmount || 0) - calculateTotalPaidNow(),
  );

  return (
    <div className="mt-8">
      <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap min-w-[60px]">
                No.
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap min-w-[120px]">
                Due Date
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center min-w-[120px]">
                {loanType === "interest" ? "Interest Amount" : "EMI Amount"}
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center min-w-[120px]">
                Amount Paid
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center min-w-[120px]">
                Payment Date
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center min-w-[100px]">
                Mode
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center min-w-[100px]">
                Overdue
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center min-w-[120px]">
                Payment
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center min-w-[150px]">
                Remarks
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center min-w-[150px]">
                Approved By
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center min-w-[150px]">
                Last Updated
              </th>
              {isEditMode && (
                <th className="sticky right-0 bg-slate-50 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap text-center z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] min-w-[100px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {emis.length === 0 ? (
              <tr>
                <td
                  colSpan={isEditMode ? 11 : 10}
                  className="px-6 py-12 text-center text-sm font-bold text-slate-400 italic"
                >
                  No payment records found. The schedule will be initialized
                  automatically.
                </td>
              </tr>
            ) : (
              emis.map((emi, index) => (
              <tr
                key={emi._id}
                onClick={(e) => toggleHighlight(e, emi._id)}
                className={`cursor-pointer transition-colors group ${
                  selectedRowId === emi._id
                    ? "bg-blue-50/80"
                    : "hover:bg-slate-50/50"
                }`}
              >
                <td className="px-6 py-4 text-xs font-bold text-slate-900">
                  {emi.emiNumber}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                  {formatDate(emi.dueDate)}
                </td>
                <td className="px-6 py-4 text-xs font-black text-slate-900 text-center">
                  ₹{emi.emiAmount}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 text-center whitespace-nowrap">
                  ₹{emi.amountPaid || 0}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 text-center whitespace-nowrap">
                  {formatDate(emi.paymentDate)}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 text-center">
                  {emi.status === "Pending" &&
                  new Date() < new Date(emi.dueDate) ? (
                    "-"
                  ) : (
                    <div className="flex flex-col gap-1 items-center">
                      {[
                        ...(emi.paymentMode ? emi.paymentMode.split(", ") : []),
                        ...(Array.isArray(emi.overdue) ? emi.overdue.map(ov => ov.mode).filter(Boolean) : [])
                      ].filter((v, i, a) => a.indexOf(v) === i) // Unique modes
                       .map((mode, idx) => (
                        <span key={idx} className="block whitespace-nowrap">
                          {mode || "-"}
                        </span>
                      ))}
                      {(!emi.paymentMode && (!Array.isArray(emi.overdue) || emi.overdue.length === 0)) && "-"}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 text-xs font-medium text-red-600 text-center">
                  ₹{Array.isArray(emi.overdue) ? emi.overdue.reduce((acc, curr) => acc + (curr.amount || 0), 0) : (emi.overdue || 0)}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  {emi.status === "Pending" &&
                  new Date() < new Date(emi.dueDate) ? (
                    <span className="text-xs font-bold text-slate-400">-</span>
                  ) : (
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        emi.status === "Paid"
                          ? "bg-green-100 text-green-700"
                          : emi.status === "Partially Paid"
                            ? "bg-orange-100 text-orange-700"
                            : emi.status === "Waiting for Approval"
                              ? "bg-blue-100 text-blue-700 animate-pulse"
                              : "bg-red-100 text-red-700"
                      }`}
                    >
                      {emi.status}
                    </span>
                  )}
                </td>
                <td
                  className="px-6 py-4 text-xs font-medium text-slate-500 text-center max-w-[150px] truncate"
                  title={emi.remarks}
                >
                  {emi.remarks || "-"}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-500 text-center whitespace-nowrap">
                  {emi.approvedBy ? (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">
                        {typeof emi.approvedBy === "string"
                          ? emi.approvedBy
                          : emi.approvedBy.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(emi.approvedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}{" "}
                        {new Date(emi.approvedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-500 text-center whitespace-nowrap">
                  {emi.updatedBy ? (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">
                        {typeof emi.updatedBy === "string"
                          ? emi.updatedBy
                          : emi.updatedBy.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(emi.updatedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}{" "}
                        {new Date(emi.updatedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                {isEditMode && (
                  <td
                    className={`sticky right-0 transition-colors z-10 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] ${
                      selectedRowId === emi._id
                        ? "bg-blue-50/80"
                        : "bg-white group-hover:bg-slate-50 group-active:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleEditClick(emi)}
                        className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pop-up Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Update {loanType === "interest" ? "Interest" : "EMI"} #{editingEmi?.emiNumber}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Due Date: {formatDate(editingEmi?.dueDate)} | Amount: ₹
                  {editingEmi?.emiAmount}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col max-h-[85vh]">
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
                  {dateGroups.map((group, groupIdx) => (
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
                              handleGroupDateChange(group.id, e.target.value)
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
                                dateGroups.filter((g) => g.id !== group.id),
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
                        {group.payments.map((payment, pIdx) => (
                          <div
                            key={payment.id}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4 relative"
                          >
                            <div className="relative">
                              <PaymentModeSelector
                                value={payment.mode}
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
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                  Amount
                                </label>
                                <input
                                  type="number"
                                  value={payment.amount || ""}
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
                                />
                              </div>
                              {group.payments.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemovePayment(group.id, payment.id)
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

                {/* Payment Status (Moved back up as per user request) */}
                <div className="pt-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Payment Status
                  </label>
                  <div
                    className={`w-full px-4 py-3 border rounded-xl text-sm font-black uppercase tracking-wider ${
                      remainingBalance === 0
                        ? "bg-green-50 border-green-200 text-green-600"
                        : remainingBalance < (editingEmi?.emiAmount || 0)
                          ? "bg-orange-50 border-orange-200 text-orange-600"
                          : "bg-red-50 border-red-200 text-red-600"
                    }`}
                  >
                    {editingEmi?.status === "Waiting for Approval"
                      ? "Waiting for Approval"
                      : remainingBalance === 0
                        ? "Paid"
                        : remainingBalance < (editingEmi?.emiAmount || 0)
                          ? "Partially Paid"
                          : "Pending"}
                  </div>
                </div>

                {/* Overdue Section */}
                <div className="space-y-6 pt-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Overdue
                    </label>
                  </div>
                  
                  <div className="space-y-6">
                    {editData.overdue.map((ov, idx) => (
                      <div key={ov.id} className="space-y-4 p-4 border border-red-50 rounded-2xl bg-white shadow-sm relative">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between items-center px-1 mb-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Overdue Date
                              </label>
                              {ov.date && (
                                <button
                                  type="button"
                                  onClick={() => handleOverdueChange(ov.id, "date", "")}
                                  className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <input
                              type="date"
                              value={ov.date ? new Date(ov.date).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleOverdueChange(ov.id, "date", e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-mono"
                            />
                          </div>
                          {editData.overdue.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOverdue(ov.id)}
                              className="mt-6 p-2 text-red-400 hover:text-red-600 transition-colors"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Mode and Amount Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative">
                            {/* Removed redundant Payment Mode label here as requested */}
                            <PaymentModeSelector
                              value={ov.mode}
                              onChange={(val) => handleOverdueChange(ov.id, "mode", val)}
                            />
                          </div>
                          {ov.mode === "Cheque" && (
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                Cheque Number (6 Digits)
                              </label>
                              <input
                                type="text"
                                maxLength="6"
                                value={ov.chequeNumber || ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  handleOverdueChange(ov.id, "chequeNumber", val);
                                }}
                                className="w-full px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm font-bold text-red-600 focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-mono"
                                placeholder="123456"
                                required
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                              Amount
                            </label>
                            <input
                              type="number"
                              value={ov.amount || ""}
                              onChange={(e) => handleOverdueChange(ov.id, "amount", e.target.value)}
                              className="w-full px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm font-bold text-red-600 focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-mono"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddOverdue}
                    className="w-full py-4 border-2 border-dashed border-red-100 rounded-2xl text-[10px] font-black text-red-400 uppercase tracking-widest hover:border-red-300 hover:bg-red-50/50 transition-all bg-red-50/20"
                  >
                    + Add More
                  </button>
                </div>

                {/* Remarks */}
                <div className="pt-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Remark
                  </label>
                  <textarea
                    name="remarks"
                    value={editData.remarks}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none min-h-[80px]"
                    placeholder="Add any notes..."
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
                  disabled={loading}
                  className="flex-[2] px-6 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      PROCESSING...
                    </>
                  ) : (
                    "UPDATE EMI"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMITable;
