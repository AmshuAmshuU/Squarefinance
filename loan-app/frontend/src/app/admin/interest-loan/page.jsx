"use client";
import React from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import InterestLoansList from "@/components/InterestLoansList";

const InterestLoansPage = () => {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F8FAFC]">
        <Sidebar aria-label="Sidebar navigation" />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar aria-label="Top navigation" />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
            <InterestLoansList title="All Interest Loans" />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default InterestLoansPage;
