"use client";
import React from "react";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import AuthGuard from "../../../components/AuthGuard";
import WeeklyLoansList from "../../../components/WeeklyLoansList";
import { useUI } from "../../../context/UIContext";

const WeeklyLoansPage = () => {
  const { isDarkMode } = useUI();
  return (
    <AuthGuard>
      <style jsx global>{`
        .weekly-loans-page-dark-mode {
          background-color: #0f172a;
        }
      `}</style>
      <div className={`flex min-h-screen bg-[#F8FAFC] transition-colors duration-300 ${isDarkMode ? "weekly-loans-page-dark-mode" : ""}`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="py-8 px-4 sm:px-8">
            <WeeklyLoansList type="all" title="Weekly Loan Management" />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default WeeklyLoansPage;
