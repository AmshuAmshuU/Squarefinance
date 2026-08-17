"use client";
import AuthGuard from "../../../components/AuthGuard";
import Navbar from "../../../components/Navbar";
import Sidebar from "../../../components/Sidebar";
import FollowupAccountabilityCard from "../../../components/analytics/FollowupAccountabilityCard";
import RtoWorkAccountabilityCard from "../../../components/analytics/RtoWorkAccountabilityCard";
import TodayCollectionCard from "../../../components/analytics/TodayCollectionCard";
import { useUI } from "../../../context/UIContext";

const DashboardPage = () => {
  const { isDarkMode } = useUI();

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

              {/* Today's Collections */}
              <div className="mb-10">
                <TodayCollectionCard />
              </div>

              {/* Followup Accountability */}
              <div className="mb-10">
                <FollowupAccountabilityCard />
              </div>

              {/* RTO Work Accountability */}
              <div>
                <RtoWorkAccountabilityCard />
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default DashboardPage;
