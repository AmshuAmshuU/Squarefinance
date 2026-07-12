"use client";
import React from "react";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import AuthGuard from "../../../components/AuthGuard";
import DailyLoansList from "../../../components/DailyLoansList";

const DailyLoansPage = () => {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F8FAFC]">
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
