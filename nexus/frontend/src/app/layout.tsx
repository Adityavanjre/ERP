import type { Metadata, Viewport } from "next";

export const dynamic = 'force-dynamic';

import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { UXProvider } from "../components/providers/ux-provider";
import { LoadingBar } from "../components/ui/loading-bar";
import { Suspense } from "react";
import { PerformanceMonitor } from "../components/seo/performance-monitor";
import Script from "next/script";

// Mocking Google Fonts to resolve fetch errors during build in local/restricted environments
const geistSans = {
  variable: "--font-geist-sans",
};

const geistMono = {
  variable: "--font-geist-mono",
};

export const metadata: Metadata = {
  metadataBase: new URL('https://klypso.in/portal'), title: "Klypso ERP | Advanced Business OS for Manufacturing & GST Compliance",
  description: "The imperial standard for SME management. Professional ERP with Tally Prime sync, automated GST GSTR-1 compliance, manufacturing BOM/WIP tracking, and double-entry accounting.",
  alternates: {
    canonical: 'https://klypso.in/portal',
  },
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
    title: "Klypso ERP | The OS for Modern Indian Business",
    description: "Scale your factory or retail business with elite-grade accounting and inventory.",
    url: "https://klypso.in",
    siteName: "Klypso ERP",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Klypso ERP Dashboard",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Klypso ERP | Manufacturing & Accounting Refined",
    description: "Built for Tally users, loved by manufacturers. The most powerful ERP for Indian SMEs.",
    creator: "@klypso",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/portal/favicon.svg",
    apple: "/portal/apple-touch-icon.png",
  },
  manifest: "/portal/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Klypso ERP",
  "alternateName": "Klypso",
  "url": "https://klypso.in/portal",
  "logo": "https://klypso.in/portal/favicon.svg",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+91-XXXXXXXXXX",
    "contactType": "customer service",
    "contactOption": "TollFree",
    "areaServed": "IN",
    "availableLanguage": "en"
  },
  "sameAs": [
    "https://twitter.com/klypso",
    "https://linkedin.com/company/klypso"
  ],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://klypso.in/portal/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

import { ErrorBoundary } from "../components/providers/error-boundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="ai-content" content="index, follow" />
        <meta name="discovery" content="https://klypso.in/portal/sitemap.xml" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <UXProvider>
            <Script
              id="organization-jsonld"
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
            <PerformanceMonitor />
            <Suspense fallback={null}>
              <LoadingBar />
            </Suspense>
            {children}
            <Toaster />
          </UXProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
