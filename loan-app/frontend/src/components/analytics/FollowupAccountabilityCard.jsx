"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getFollowupDashboardSummary } from "../../services/loan.service";
import { PhoneCall, AlertTriangle, Loader2, ChevronDown, Pencil } from "lucide-react";
import ContactActionMenu from "../ContactActionMenu";
import FollowupEditModal from "../FollowupEditModal";

// Loan number links open the loan directly in modify mode - staff coming
// from a follow-up call almost always need to edit something (log the
// response, update a number), not just look at the profile.
const LOAN_TYPE_ROUTES = {
  Vehicle: "/admin/loans/edit",
  Weekly: "/admin/weekly-loans/edit",
  Daily: "/admin/daily-loans/edit",
  Interest: "/admin/interest-loan/edit",
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never";

const FollowupAccountabilityCard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ today: { count: 0, items: [] }, stale: { count: 0, items: [] } });
  const [activeTab, setActiveTab] = useState(null); // null | "today" | "stale"
  const [activeContactMenu, setActiveContactMenu] = useState(null); // { number, name, type, x, y }
  const [editingLoan, setEditingLoan] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getFollowupDashboardSummary();
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load follow-up summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const toggleTab = (tab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const activeItems = activeTab ? data[activeTab]?.items || [] : [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/30">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">Followup Accountability</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          Who needs a call today, and who&apos;s been missed
        </p>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Loading...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 text-xs font-bold uppercase tracking-tight">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <button
              onClick={() => toggleTab("today")}
              className={`p-6 text-left transition-colors ${activeTab === "today" ? "bg-blue-50" : "hover:bg-slate-50"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-300 transition-transform ${activeTab === "today" ? "rotate-180" : ""}`}
                />
              </div>
              <p className="text-2xl font-black text-slate-900">{data.today.count}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Followups today</p>
            </button>

            <button
              onClick={() => toggleTab("stale")}
              className={`p-6 text-left transition-colors ${activeTab === "stale" ? "bg-red-50" : "hover:bg-slate-50"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-300 transition-transform ${activeTab === "stale" ? "rotate-180" : ""}`}
                />
              </div>
              <p className="text-2xl font-black text-slate-900">{data.stale.count}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Old followups pending</p>
            </button>
          </div>

          {activeTab && (
            <div className="border-t border-slate-100">
              {activeItems.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                    {activeTab === "today" ? "No followups scheduled for today" : "Nothing pending without a followup date"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-slate-100">
                        <th className="px-3 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Loan</th>
                        <th className="px-3 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                        <th className="px-3 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Mobile</th>
                        <th className="px-3 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending</th>
                        <th className="px-3 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Response &amp; followup</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeItems.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-3 py-2.5">
                            <Link
                              href={`${LOAN_TYPE_ROUTES[item.loanType] || "/admin/loans/edit"}/${item._id}`}
                              className="text-xs font-black text-primary group-hover:underline"
                            >
                              {item.loanNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-bold text-slate-600">{item.customerName || "-"}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              {(item.mobileNumbers || []).length > 0 ? (
                                item.mobileNumbers.map((num, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setActiveContactMenu({
                                        number: num,
                                        name: item.customerName,
                                        type: "Applicant",
                                        x: rect.left,
                                        y: rect.bottom,
                                      });
                                    }}
                                    className="text-xs font-bold text-blue-500 tracking-tight hover:text-primary transition-colors text-left"
                                  >
                                    {num}
                                  </button>
                                ))
                              ) : (
                                <span className="text-xs font-bold text-slate-500">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {item.pendingAmount > 0 ? (
                              <>
                                <p className="text-xs font-black text-red-500">
                                  ₹{item.pendingAmount.toLocaleString("en-IN")}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                  Due {formatDate(item.pendingDueDate)}
                                </p>
                              </>
                            ) : (
                              <span className="text-xs font-bold text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-start gap-1.5 max-w-[180px]">
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-600 truncate">
                                  {item.clientResponse || "-"}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                  Followup {formatDate(item.nextFollowUpDate)}
                                </p>
                              </div>
                              <button
                                onClick={() => setEditingLoan(item)}
                                className="flex-none w-5 h-5 flex items-center justify-center rounded-md bg-blue-50 text-primary hover:bg-blue-100 transition-colors"
                                aria-label="Edit response and followup date"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <ContactActionMenu
        contact={activeContactMenu}
        onClose={() => setActiveContactMenu(null)}
      />

      {editingLoan && (
        <FollowupEditModal
          loan={editingLoan}
          onClose={() => setEditingLoan(null)}
          onSaved={() => {
            setEditingLoan(null);
            fetchSummary();
          }}
        />
      )}
    </div>
  );
};

export default FollowupAccountabilityCard;
