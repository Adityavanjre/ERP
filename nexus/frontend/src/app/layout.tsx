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
  title: "Klypso | Business Management",
  description: "A simple, all-in-one business management platform. Manage your sales, inventory, purchases, HR, and accounting in one place.",
  keywords: ["ERP", "Business Management", "Inventory", "Accounting", "HR", "Sales", "Manufacturing"],
  authors: [{ name: "Klypso Core Engineering", url: "https://klypso.agency" }],
  creator: "Klypso Ecosystems",
  publisher: "Klypso Ecosystems",
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
    title: "Klypso | Business Management",
    description: "The easiest way to manage your business — from inventory to accounting.",
    url: "https://klypso.in/portal",
    siteName: "Klypso",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Klypso Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Klypso | Business Management",
    description: "Manage your business in one place — sales, inventory, HR, purchases, and accounting.",
    creator: "@klypso",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/portal/manifest.json",
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
