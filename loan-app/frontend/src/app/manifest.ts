import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Square Finance | Fast & Reliable Vehicle Loans in Bengaluru",
    short_name: "Square Finance",
    description: "Specializing in Car and Auto-Rickshaw commercial vehicle loans in Bengaluru with quick approvals and minimal paperwork.",
    start_url: "/admin/login",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/logo.jpg",
        sizes: "1024x819",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/pwa-icon-192.png",
        sizes: "640x640",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "640x640",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
