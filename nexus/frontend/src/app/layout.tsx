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
  title: "Zenith Intelligence | Enterprise Nexus",
  description: "A simple, all-in-one business management platform. Manage your sales, inventory, purchases, HR, and accounting in one place.",
  keywords: ["ERP", "Enterprise Resource Planning", "Zenith Intelligence", "Business Intelligence", "Inventory Management", "Financial Systems", "Nexus"],
  authors: [{ name: "Zenith Core Engineering", url: "https://klypso.agency" }],
  creator: "Zenith Ecosystems",
  publisher: "Zenith Ecosystems",
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
    title: "Zenith Intelligence | Enterprise Nexus",
    description: "Operate at the speed of thought. The autonomous operating system for modern enterprise.",
    url: "https://klypso.in/portal",
    siteName: "Zenith Intelligence",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Zenith Intelligence Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zenith Intelligence | Enterprise Nexus",
    description: "High-integrity enterprise intelligence platform for elite brands.",
    creator: "@klypso",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  themeColor: "#2563eb",
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
