import type { Metadata } from "next";
import "./globals.css";
import "./space-theme.css";
import { ToastProvider } from "../context/ToastContext";
import "./nature-themes.css";
import { SPACE_SCENE_RULES, DEFAULT_SPACE_SCENE, NATURE_SCENE_RULES, DEFAULT_NATURE_SCENE } from "../utils/spaceScenes";

// Runs before the page paints: if this device chose a picture theme (Space, Desert, Rainforest or Island
// beach), mark the page with it (and with the picture for this section) so there is no flash of the plain
// look. Mirrors UIContext + spaceScenes.js.
const themeBootScript = `(function(){try{var p=location.pathname,t=localStorage.getItem('sf_theme');if(p.indexOf('/admin')!==0||p==='/admin/login')return;var d=document.documentElement;function pick(R,s){for(var i=0;i<R.length;i++){if(p===R[i][0]||p.indexOf(R[i][0]+'/')===0){return R[i][1]}}return s}if(t==='space'){d.setAttribute('data-theme','space');d.setAttribute('data-space-scene',pick(${JSON.stringify(SPACE_SCENE_RULES)},'${DEFAULT_SPACE_SCENE}'))}else if(t==='desert'||t==='rainforest'||t==='beach'){d.setAttribute('data-theme',t);d.setAttribute('data-nature-scene',pick(${JSON.stringify(NATURE_SCENE_RULES)},'${DEFAULT_NATURE_SCENE}'))}}catch(e){}})();`;

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
