import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PWARegister from "@/app/components/PWARegister";
import CapacitorInit from "@/app/components/CapacitorInit";
import UpdateBanner from "@/app/components/UpdateBanner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#6366f1",
};

export const metadata: Metadata = {
  title: "RefineAI",
  description:
    "RefineAI generates, critiques, and refines output in a loop until it matches your target.",
  applicationName: "RefineAI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "RefineAI",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <PWARegister />
        <CapacitorInit />
        <UpdateBanner />
      </body>
    </html>
  );
}
