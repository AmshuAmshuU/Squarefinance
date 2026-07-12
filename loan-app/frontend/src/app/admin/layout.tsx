import React from "react";
import { UIProvider } from "../../context/UIContext";
import { NotificationProvider } from "../../context/NotificationContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UIProvider>
      <NotificationProvider>
        <div className="flex-1 animate-fade-in w-full max-w-[800px] mx-auto sm:max-w-none sm:px-0">
          {children}
        </div>
      </NotificationProvider>
    </UIProvider>
  );
}
