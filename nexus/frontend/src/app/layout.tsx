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
  title: "Klypso Nexus | Enterprise Intelligence",
  description: "High-integrity enterprise intelligence platform for elite brands. Centralized finance, inventory, and diverse operations.",
  keywords: ["ERP", "Enterprise Resource Planning", "Klypso Nexus", "Business Intelligence", "Inventory Management", "Financial Systems"],
  authors: [{ name: "Klypso Engineering", url: "https://klypso.agency" }],
  creator: "Klypso Agency",
  publisher: "Klypso Agency",
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
    title: "Klypso Nexus | Enterprise Intelligence",
    description: "Operate at the speed of thought. The comprehensive operating system for modern business.",
    url: "https://klypso.in/portal",
    siteName: "Klypso Nexus",
    images: [
      {
        url: "/portal/og-image.png",
        width: 1200,
        height: 630,
        alt: "Klypso Nexus Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Klypso Nexus | Enterprise Intelligence",
    description: "High-integrity enterprise intelligence platform for elite brands.",
    creator: "@klypso",
    images: ["/portal/og-image.png"],
  },
  icons: {
    icon: "/portal/favicon.svg",
    apple: "/portal/apple-touch-icon.png",
  },
  manifest: "/portal/manifest.json",
  themeColor: "#C5A059",
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
