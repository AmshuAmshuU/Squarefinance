"use client";
import { useState, useEffect, useCallback } from "react";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { useRouter } from "next/navigation";
import { useToast } from "../../../context/ToastContext";
import { getPendingApprovals, processApproval } from "../../../services/approvalService";
import { useUI } from "../../../context/UIContext";

const ApprovalsPage = () => {
    const router = useRouter();
    const { isDarkMode } = useUI();
    const { showToast } = useToast();
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchApprovals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPendingApprovals();
            setApprovals(res.data || []);
        } catch (err) {
            showToast(err.message || "Failed to fetch approvals", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    const redirectToLoan = (app) => {
        const loanId = app.requestedData?.loanId || app.targetId;
        const model = app.targetModel;
        let path = "";
        
        if (model === "EMI" || model === "Loan") path = `/admin/loans/edit/${loanId}`;
        else if (model === "DailyLoan") path = `/admin/daily-loans/edit/${loanId}`;
        else if (model === "WeeklyLoan") path = `/admin/weekly-loans/edit/${loanId}`;
        else if (model === "InterestEMI" || model === "InterestLoan") path = `/admin/interest-loan/edit/${loanId}`;
        
        if (path) router.push(path);
    };

    useEffect(() => {
        fetchApprovals();
        // No auto-polling — use the refresh button to reload
    }, []);

    const handleAction = async (id, status) => {
        setProcessingId(id);
        try {
            await processApproval(id, status, "");
            showToast(`Request ${status.toLowerCase()} successfully`, "success");
            fetchApprovals();
        } catch (err) {
            showToast(err.message || "Failed to process request", "error");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <AuthGuard roles={["SUPER_ADMIN"]}>
            <style jsx global>{`
                /* Scoped approvals page dark mode overrides. Prefixed with
                   .approvals-dark-mode so nothing here can affect any
                   other page. Only one <style jsx> tag in this component -
                   this page renders no shared components that carry their
                   own style tags. */
                .approvals-dark-mode {
                    background-color: #0f172a;
                }
                .approvals-dark-mode .bg-white {
                    background-color: #1e293b !important;
                }
                .approvals-dark-mode .bg-slate-50,
                .approvals-dark-mode .bg-slate-100 {
                    background-color: #334155 !important;
                }
                .approvals-dark-mode .hover\:bg-slate-50:hover,
                .approvals-dark-mode .hover\:bg-slate-50\/50:hover {
                    background-color: #334155 !important;
                }
                .approvals-dark-mode .bg-blue-50 {
                    background-color: rgba(59, 130, 246, 0.15) !important;
                }
                .approvals-dark-mode .bg-amber-50,
                .approvals-dark-mode .bg-amber-50\/50 {
                    background-color: rgba(245, 158, 11, 0.12) !important;
                }
                .approvals-dark-mode .bg-amber-100 {
                    background-color: rgba(245, 158, 11, 0.2) !important;
                }
                .approvals-dark-mode .hover\:bg-rose-50:hover {
                    background-color: rgba(244, 63, 94, 0.15) !important;
                }
                .approvals-dark-mode .text-slate-900 {
                    color: #f1f5f9 !important;
                }
                .approvals-dark-mode .text-slate-700 {
                    color: #e2e8f0 !important;
                }
                .approvals-dark-mode .text-slate-600 {
                    color: #cbd5e1 !important;
                }
                .approvals-dark-mode .text-slate-500,
                .approvals-dark-mode .text-slate-400,
                .approvals-dark-mode .text-slate-300 {
                    color: #94a3b8 !important;
                }
                .approvals-dark-mode .border-slate-100,
                .approvals-dark-mode .border-slate-200,
                .approvals-dark-mode .border-slate-50,
                .approvals-dark-mode .border-amber-100,
                .approvals-dark-mode .border-blue-100 {
                    border-color: rgba(255, 255, 255, 0.08) !important;
                }
                .approvals-dark-mode .divide-slate-50,
                .approvals-dark-mode .divide-amber-50 {
                    border-color: rgba(255, 255, 255, 0.08) !important;
                }
            `}</style>
            <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "approvals-dark-mode" : ""}`}>
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0">
                    <Navbar />
                    <main className="py-8 px-4 sm:px-8">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Approval Queue</h1>
                                    <p className="text-slate-500 font-medium text-sm">Review and authorize pending payment requests</p>
                                </div>
                                <button 
                                    onClick={fetchApprovals}
                                    className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                    <span className={loading ? "animate-spin" : ""}>🔄</span> Refresh
                                </button>
                            </div>

                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                {loading ? (
                                    <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Registry</p>
                                    </div>
                                ) : approvals.length === 0 ? (
                                    <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                                        <div className="text-6xl">✅</div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Queue Clean - No Pending Requests</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan #</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">EMI #</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested By</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {approvals.map((app) => {
                                                    const getLoanType = () => {
                                                        const model = app.targetModel;
                                                        if (model === "EMI") return "Monthly";
                                                        if (model === "DailyLoan") return "Daily";
                                                        if (model === "WeeklyLoan") return "Weekly";
                                                        if (model === "InterestEMI" || model === "InterestLoan") return "Interest";
                                                        return model || "N/A";
                                                    };

                                                    // LOAN_EDIT: render diff card
                                                    if (app.requestType === "LOAN_EDIT") {
                                                      return (
                                                        <tr key={app._id} className="border-b border-slate-50">
                                                          <td colSpan={8} className="px-3 py-3">
                                                            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                                                              <div className="flex items-center justify-between mb-3">
                                                                <div>
                                                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-100 px-2 py-1 rounded-lg">Loan Edit Request</span>
                                                                  <p className="text-xs font-bold text-slate-700 mt-1">Loan {app.loanNumber} — {app.customerName}</p>
                                                                  <p className="text-[10px] text-slate-400 mt-0.5">by {app.requestedBy?.name} • {new Date(app.createdAt).toLocaleString("en-IN")}</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                  <button onClick={() => handleAction(app._id, "Rejected")} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-200 bg-white rounded-xl hover:bg-rose-50 transition-all">Reject</button>
                                                                  <button onClick={() => handleAction(app._id, "Approved")} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-all">Approve</button>
                                                                </div>
                                                              </div>
                                                              <table className="w-full text-[10px]">
                                                                <thead>
                                                                  <tr className="border-b border-amber-100">
                                                                    <th className="text-left font-black text-slate-400 uppercase tracking-widest pb-1.5 pr-4 w-1/3">Field</th>
                                                                    <th className="text-left font-black text-rose-400 uppercase tracking-widest pb-1.5 pr-4 w-1/3">Current</th>
                                                                    <th className="text-left font-black text-emerald-500 uppercase tracking-widest pb-1.5 w-1/3">Proposed</th>
                                                                  </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-amber-50">
                                                                  {(app.requestedData?.changes || []).map((change, idx) => (
                                                                    <tr key={idx}>
                                                                      <td className="py-1.5 pr-4 font-bold text-slate-600">{change.label}</td>
                                                                      <td className="py-1.5 pr-4 text-rose-500">{change.oldValue}</td>
                                                                      <td className="py-1.5 font-bold text-emerald-600">{change.newValue}</td>
                                                                    </tr>
                                                                  ))}
                                                                </tbody>
                                                              </table>
                                                            </div>
                                                          </td>
                                                        </tr>
                                                      );
                                                    }

                                                    // Returns { emi: {mode: amount}, od: {mode: amount} } so EMI and OD
                                                    // portions are always shown separately, never collapsed into one
                                                    // combined number when a submission mixes both.
                                                    const getSplits = () => {
                                                        const data = app.requestedData;
                                                        const emiSplits = {};
                                                        const odSplits = {};

                                                        // EMI portion: prefer backend-identified NEW payments (avoids
                                                        // re-counting payments already recorded on a prior partial
                                                        // submission), otherwise fall back to raw dateGroups.
                                                        if (data.newPayments && Array.isArray(data.newPayments)) {
                                                            data.newPayments.forEach(p => {
                                                                const mode = p.mode || "N/A";
                                                                emiSplits[mode] = (emiSplits[mode] || 0) + (parseFloat(p.amount) || 0);
                                                            });
                                                        } else if (data.dateGroups) {
                                                            data.dateGroups.forEach(g => {
                                                                (g.payments || []).forEach(p => {
                                                                    const mode = p.mode || "N/A";
                                                                    emiSplits[mode] = (emiSplits[mode] || 0) + (parseFloat(p.amount) || 0);
                                                                });
                                                            });
                                                        }

                                                        // OD portion - always checked, independent of whether an EMI
                                                        // portion was found above.
                                                        if (data.overdue && Array.isArray(data.overdue)) {
                                                            data.overdue.forEach(ov => {
                                                                const mode = ov.mode || "N/A";
                                                                odSplits[mode] = (odSplits[mode] || 0) + (parseFloat(ov.amount) || 0);
                                                            });
                                                        }

                                                        // Fallback if nothing found in either portion
                                                        if (Object.keys(emiSplits).length === 0 && Object.keys(odSplits).length === 0) {
                                                            const amount = data.addedAmount || data.amountPaid || data.totalAmount || data.amount || 0;
                                                            const mode = data.paymentMode || "N/A";
                                                            if (amount > 0) {
                                                                emiSplits[mode] = (emiSplits[mode] || 0) + parseFloat(amount);
                                                            }
                                                        }
                                                        return { emiSplits, odSplits };
                                                    };

                                                    const { emiSplits, odSplits } = getSplits();
                                                    const totalAmount = [...Object.values(emiSplits), ...Object.values(odSplits)].reduce((a, b) => a + b, 0);

                                                    return (
                                                        <tr key={app._id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-5 text-sm">
                                                                <button 
                                                                    onClick={() => redirectToLoan(app)}
                                                                    className="text-xs font-black text-primary hover:underline uppercase"
                                                                >
                                                                    {app.loanNumber}
                                                                </button>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <span className="text-xs font-bold text-slate-600 uppercase">{app.customerName}</span>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <span className="px-2 py-1 bg-slate-100 text-[9px] font-black text-slate-500 rounded uppercase">
                                                                    {getLoanType()}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <span className="text-xs font-black text-slate-400">
                                                                    {app.requestedData.emiNumber || "—"}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <span className="text-sm font-black text-emerald-600">
                                                                    ₹{totalAmount.toLocaleString()}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <div className="flex flex-col gap-1">
                                                                    {Object.entries(emiSplits).map(([mode, amt]) => (
                                                                        <div key={`emi-${mode}`} className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-black text-primary uppercase w-10">EMI</span>
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase w-12">{mode}</span>
                                                                            <span className="text-[10px] font-black text-slate-600">- ₹{amt.toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                    {Object.entries(odSplits).map(([mode, amt]) => (
                                                                        <div key={`od-${mode}`} className="flex items-center gap-2">
                                                                            <span className="text-[9px] font-black text-rose-500 uppercase w-10">OD</span>
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase w-12">{mode}</span>
                                                                            <span className="text-[10px] font-black text-slate-600">- ₹{amt.toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-[8px] font-black text-primary border border-blue-100">
                                                                            {app.requestedBy?.name?.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <span className="text-[11px] font-black text-slate-700">{app.requestedBy?.name}</span>
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-slate-400">
                                                                        {new Date(app.createdAt).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button 
                                                                        onClick={() => handleAction(app._id, "Rejected")}
                                                                        disabled={processingId === app._id}
                                                                        className="px-4 py-2 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 disabled:opacity-50"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleAction(app._id, "Approved")}
                                                                        disabled={processingId === app._id}
                                                                        className="px-6 py-2 text-[10px] font-black uppercase text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-100 transform active:scale-95 transition-all disabled:opacity-50"
                                                                    >
                                                                        Authorize
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
};

export default ApprovalsPage;
