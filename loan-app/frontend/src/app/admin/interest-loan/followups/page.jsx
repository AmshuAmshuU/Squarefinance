"use client";
import React from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import InterestFollowupList from "@/components/InterestFollowupList";
import { useUI } from "@/context/UIContext";

const InterestFollowupsPage = () => {
  const { isDarkMode } = useUI();
  return (
    <AuthGuard>
      <style jsx global>{`
        .interest-followup-page-dark-mode {
          background-color: #0f172a;
        }
      `}</style>
      <div className={`flex min-h-screen bg-[#F8FAFC] transition-colors duration-300 ${isDarkMode ? "interest-followup-page-dark-mode" : ""}`}>
        <Sidebar aria-label="Sidebar navigation" />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar aria-label="Top navigation" />
          <main className="flex-1 p-4 sm:p-8">
            <InterestFollowupList />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
};

export default InterestFollowupsPage;
