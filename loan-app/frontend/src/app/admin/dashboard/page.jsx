"use client";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import { getUserFromToken } from "../../../utils/auth";
import { useState, useEffect } from "react";
import { getAnalyticsStats } from "../../../services/loan.service";
import {
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import TodoDashboardSection from "../../../components/analytics/TodoDashboardSection";
import { useUI } from "../../../context/UIContext";

const DashboardPage = () => {
  const user = getUserFromToken();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useUI();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getAnalyticsStats();
        if (res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Dashboard stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Scoped dashboard dark mode overrides, following the same pattern
           as the analytics page. Every rule is prefixed with
           .dashboard-dark-mode, so nothing here can affect any other page. */
        .dashboard-dark-mode {
          background-color: #0f172a;
          color: #cbd5e1;
        }
        .dashboard-dark-mode .bg-white {
          background-color: #1e293b !important;
        }
        .dashboard-dark-mode .bg-slate-50\/30 {
          background-color: rgba(51, 65, 85, 0.5) !important;
        }
        .dashboard-dark-mode .bg-slate-50,
        .dashboard-dark-mode .bg-slate-100 {
          background-color: #334155 !important;
        }
        .dashboard-dark-mode .hover\:bg-slate-50:hover {
          background-color: #334155 !important;
        }
        .dashboard-dark-mode .bg-blue-50 {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
        .dashboard-dark-mode .bg-emerald-50 {
          background-color: rgba(16, 185, 129, 0.15) !important;
        }
        .dashboard-dark-mode .bg-amber-50 {
          background-color: rgba(245, 158, 11, 0.15) !important;
        }
        .dashboard-dark-mode .bg-red-50 {
          background-color: rgba(239, 68, 68, 0.15) !important;
        }
        .dashboard-dark-mode .text-slate-900 {
          color: #f1f5f9 !important;
        }
        .dashboard-dark-mode .text-slate-600 {
          color: #cbd5e1 !important;
        }
        .dashboard-dark-mode .text-slate-500 {
          color: #94a3b8 !important;
        }
        .dashboard-dark-mode .border-slate-100,
        .dashboard-dark-mode .border-slate-200 {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .dashboard-dark-mode .divide-slate-50 > :not([hidden]) ~ :not([hidden]) {
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      <div className={`min-h-screen bg-[#F8FAFC] flex transition-colors duration-300 ${isDarkMode ? "dashboard-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />

          <main className="py-8 px-4 sm:px-8">
            <div className="max-w-6xl mx-auto">
              {/* Header Section */}
              <div className="mb-10 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full mb-4">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                    System Operational
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">
                  System Dashboard
                </h1>
                <p className="text-secondary font-medium text-base sm:text-lg max-w-2xl">
                  Monitoring internal operations. Your session is secured with
                  enterprise-grade encryption.
                </p>
              </div>

              {/* Employee Management Counts - NEW SECTION */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">
                    Human Capital Modules
                  </h2>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-200 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Super Admin
                      </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-1">
                      {loading
                        ? "..."
                        : stats?.cards?.userCounts?.SUPER_ADMIN || "0"}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Admin
                      </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-1">
                      {loading ? "..." : stats?.cards?.userCounts?.ADMIN || "0"}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Employees
                      </span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-1">
                      {loading
                        ? "..."
                        : stats?.cards?.userCounts?.EMPLOYEE || "0"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Todo Section - NEW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <TodoDashboardSection />
                </div>
                <div className="space-y-6">
                  {/* Additional dashboard widgets could go here in the future */}
                  <div className="bg-gradient-to-br from-primary to-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-100 flex flex-col justify-between min-h-[300px]">
                    <div>
                      <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Need Help?</h3>
                      <p className="text-blue-100 font-bold text-xs uppercase tracking-widest leading-relaxed">
                        If you have issues with assigned tasks or permissions, please contact your administrator.
                      </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">Current Role</p>
                      <p className="text-sm font-black text-white uppercase">{user?.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default DashboardPage;
