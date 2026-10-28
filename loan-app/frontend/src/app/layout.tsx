import type { Metadata } from "next";
import "./globals.css";
import "./space-theme.css";
import { ToastProvider } from "../context/ToastContext";
import { SPACE_SCENE_RULES, DEFAULT_SPACE_SCENE } from "../utils/spaceScenes";

// Runs before the page paints: if this device chose the Space theme, mark the page with it (and with
// the photo for this section) so there is no flash of the plain look. Mirrors UIContext + spaceScenes.js.
const themeBootScript = `(function(){try{var p=location.pathname;if(localStorage.getItem('sf_theme')==='space'&&p.indexOf('/admin')===0&&p!=='/admin/login'){var d=document.documentElement,R=${JSON.stringify(SPACE_SCENE_RULES)},s='${DEFAULT_SPACE_SCENE}';for(var i=0;i<R.length;i++){if(p===R[i][0]||p.indexOf(R[i][0]+'/')===0){s=R[i][1];break}}d.setAttribute('data-theme','space');d.setAttribute('data-space-scene',s)}}catch(e){}})();`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900" suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
