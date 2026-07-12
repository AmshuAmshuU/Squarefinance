"use client";
import React from "react";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import AuthGuard from "../../../components/AuthGuard";
import WeeklyLoansList from "../../../components/WeeklyLoansList";

const WeeklyLoansPage = () => {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F8FAFC]">
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
