import React, { Suspense } from "react";
import { UIProvider } from "../../context/UIContext";
import { NotificationProvider } from "../../context/NotificationContext";
import { LocationAlertProvider } from "../../context/LocationAlertContext";
import NavTracker from "../../components/NavTracker";
import DeviceLocationPinger from "../../components/DeviceLocationPinger";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UIProvider>
      <NotificationProvider>
        <LocationAlertProvider>
          <Suspense fallback={null}>
            <NavTracker />
          </Suspense>
          <DeviceLocationPinger />
          <div className="flex-1 animate-fade-in w-full max-w-[800px] mx-auto sm:max-w-none sm:px-0">
            {children}
          </div>
        </LocationAlertProvider>
      </NotificationProvider>
    </UIProvider>
  );
}
