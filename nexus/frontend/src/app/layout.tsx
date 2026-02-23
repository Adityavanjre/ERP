import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as HotToaster } from 'react-hot-toast';
import { UXProvider } from "@/components/providers/ux-provider";
import { LoadingBar } from "@/components/ui/loading-bar";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus ERP | Advanced Business OS for Manufacturing & GST Compliance",
  description: "The imperial standard for SME management. Professional ERP with Tally Prime sync, automated GST GSTR-1 compliance, manufacturing BOM/WIP tracking, and double-entry accounting.",
  keywords: [
    "Best ERP for Manufacturing India",
    "GST Accounting Software",
    "Tally Prime Integration ERP",
    "SME Business Management India",
    "Automated GSTR-1 Software",
    "Cloud ERP for Small Factory",
    "Double Entry Accounting Software",
    "Inventory Management System India",
    "Bill of Materials Software",
    "Work Order Management ERP"
  ],
  authors: [{ name: "Klypso Engineering", url: "https://klypso.agency" }],
  creator: "Nexus Ecosystems",
  publisher: "Nexus Ecosystems",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Nexus ERP | The OS for Modern Indian Business",
    description: "Scale your factory or retail business with elite-grade accounting and inventory.",
    url: "https://nexus.klypso.in",
    siteName: "Nexus ERP",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nexus ERP Dashboard",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus ERP | Manufacturing & Accounting Refined",
    description: "Built for Tally users, loved by manufacturers. The most powerful ERP for Indian SMEs.",
    creator: "@klypso",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UXProvider>
          <Suspense fallback={null}>
            <LoadingBar />
          </Suspense>
          {children}
          <Toaster />
          <HotToaster position="bottom-right" />
        </UXProvider>
      </body>
    </html>
  );
}
