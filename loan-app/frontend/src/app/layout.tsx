import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "../context/ToastContext";

export const metadata: Metadata = {
  title: "Square Finance | Fast & Reliable Vehicle Loans in Bengaluru",
  description: "Specializing in Car and Auto-Rickshaw commercial vehicle loans in Bengaluru with quick approvals and minimal paperwork.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export const viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900" suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
