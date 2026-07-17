"use client";
import React from "react";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import AuthGuard from "../../../components/AuthGuard";
import DailyLoansList from "../../../components/DailyLoansList";
import { useUI } from "../../../context/UIContext";

const DailyLoansPage = () => {
  const { isDarkMode } = useUI();
  return (
    <AuthGuard>
      <style jsx global>{`
        .daily-loans-page-dark-mode {
          background-color: #0f172a;
        }
      `}</style>
      <div className={`flex min-h-screen bg-[#F8FAFC] transition-colors duration-300 ${isDarkMode ? "daily-loans-page-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <DailyLoansList type="all" title="Daily Loan Management" />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default DailyLoansPage;
