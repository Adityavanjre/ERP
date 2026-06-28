"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isDesktopShell } from "../lib/desktop-offline";
import Link from "next/link";
import { Button } from "../components/ui/button";
import {
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Zap,
  Globe,
  Cpu,
  CheckCircle2,
  Smartphone,
  Download,
} from "lucide-react";
import { KlypsoLogo } from "../components/brand/logo";
import Script from "next/script";

export default function Home() {
  const router = useRouter();
  const hasAttemptedRedirect = useRef(false);

  useEffect(() => {
    // DESKTOP-REDIRECT: Skip marketing landing page if running as a standalone app.
    if (isDesktopShell() && !hasAttemptedRedirect.current) {
      hasAttemptedRedirect.current = true;
      router.replace("/login");
    }
  }, [router]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Klypso ERP",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    description:
      "Advanced ERP for Manufacturing and GST Compliance. Features Tally Prime sync, BOM management, and automated accounting.",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "120",
    },
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "INR",
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 h-20">
        <div className="max-w-[1400px] mx-auto h-full px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <KlypsoLogo size={32} />
            <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-lg ml-2 uppercase tracking-widest">
              Enterprise
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-10">
            <Link
              href="#features"
              className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              Features
            </Link>
            <Link
              href="#solutions"
              className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              Solutions
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-black text-slate-900 hover:text-blue-600 transition-colors uppercase tracking-widest mr-4"
            >
              Sign In
            </Link>
            <Link href="/login">
              <Button className="rounded-2xl bg-slate-900 hover:bg-black px-8 py-6 h-auto font-black shadow-xl shadow-slate-900/10 text-xs uppercase tracking-widest whitespace-nowrap">
                {isDesktopShell() ? "Open Dashboard" : "Sign In"}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 pt-32">
        <section className="relative overflow-hidden px-6 lg:px-8 py-24 sm:py-32">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.08),transparent_70%)] pointer-events-none" />
          <div className="absolute -top-24 right-0 w-96 h-96 bg-blue-400/5 blur-[120px] rounded-full" />
          <div className="absolute top-1/2 left-0 w-72 h-72 bg-emerald-400/5 blur-[120px] rounded-full" />

          <div className="max-w-[1400px] mx-auto relative">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-10">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">
                  Next-Gen ERP for Industry 4.0
                </span>
              </div>

              <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 leading-[0.9] italic animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
                BUILD{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">
                  SMARTER.
                </span>
                <br />
                SCALE FASTER.
              </h1>

              <p className="text-xl md:text-2xl text-slate-600 font-medium leading-relaxed max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                The ultimate enterprise operating system for manufacturing
                leaders. Automated GST compliance, real-time BOM management, and
                deep Tally Prime integration.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-6 pt-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
                <Link href="/login">
                  <Button className="rounded-[2rem] bg-blue-600 hover:bg-blue-700 px-12 py-8 h-auto text-lg font-black shadow-2xl shadow-blue-600/30 text-white flex items-center group transition-all hover:scale-105">
                    {isDesktopShell() ? "Enter Dashboard" : "Enter Platform"}{" "}
                    <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button
                    variant="outline"
                    className="rounded-[2rem] px-12 py-8 h-auto text-lg font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all"
                  >
                    Book Custom Demo
                  </Button>
                </Link>
              </div>

              {/* Stats/Badges */}
              <div className="flex flex-wrap justify-center gap-8 pt-20 animate-in fade-in duration-1000 delay-700">
                {[
                  { label: "Active Enterprises", value: "200+" },
                  { label: "Industry Sectors", value: "12" },
                  { label: "Compliance Score", value: "100%" },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-900 italic tracking-tighter">
                      {stat.value}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 sm:py-32 bg-slate-50/50">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="p-10 bg-white rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 h-32 w-32 bg-blue-50 rounded-bl-[4rem] group-hover:scale-110 transition-transform" />
                <BarChart3 className="h-10 w-10 text-blue-600 mb-8 relative z-10" />
                <h3 className="text-22xl font-black text-slate-900 mb-4 tracking-tight uppercase italic underline decoration-blue-500/30">
                  Intelligence
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Advanced analytics for production forecasting and financial
                  health monitoring.
                </p>
              </div>

              <div className="p-10 bg-white rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 h-32 w-32 bg-emerald-50 rounded-bl-[4rem] group-hover:scale-110 transition-transform" />
                <ShieldCheck className="h-10 w-10 text-emerald-600 mb-8 relative z-10" />
                <h3 className="text-22xl font-black text-slate-900 mb-4 tracking-tight uppercase italic underline decoration-emerald-500/30">
                  Compliance
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Bulletproof GST automation with direct Tally synchronization.
                </p>
              </div>

              <div className="p-10 bg-white rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 h-32 w-32 bg-amber-50 rounded-bl-[4rem] group-hover:scale-110 transition-transform" />
                <Zap className="h-10 w-10 text-amber-500 mb-8 relative z-10" />
                <h3 className="text-22xl font-black text-slate-900 mb-4 tracking-tight uppercase italic underline decoration-amber-500/30">
                  Performance
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Lightning-fast interface built on industrial-grade cloud
                  infrastructure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Industry Solutions */}
        <section id="solutions" className="py-24 sm:py-32">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight italic uppercase">
                  Specialized Solutions
                </h2>
                <p className="text-lg text-slate-500 mt-4 font-medium italic underline decoration-blue-500/20 underline-offset-8 decoration-4">
                  Tailored technology for your specific industrial vertical.
                </p>
              </div>
              <Link
                href="/login"
                className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline decoration-2"
              >
                View all industries &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: "Manufacturing", icon: Cpu, color: "blue" },
                { name: "Healthcare", icon: Globe, color: "emerald" },
                { name: "Logistics", icon: Smartphone, color: "amber" },
                { name: "Construction", icon: CheckCircle2, color: "rose" },
              ].map((ind, i) => (
                <div
                  key={i}
                  className="p-8 bg-slate-50 rounded-3xl hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group cursor-pointer border border-transparent hover:border-slate-100"
                >
                  <div
                    className={`h-14 w-14 rounded-2xl bg-${ind.color}-100 flex items-center justify-center text-${ind.color}-600 mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <ind.icon className="h-7 w-7" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">
                    {ind.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">
                    Industry Package
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Global Download Center */}
        <section className="py-24 bg-slate-900 relative overflow-hidden rounded-[4rem] mx-6 mb-24 min-h-[500px] flex items-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(59,130,246,0.15),transparent)]" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full" />

          <div className="max-w-[1400px] mx-auto px-12 w-full relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className="text-5xl font-black text-white tracking-tight italic leading-tight">
                  THE KLYPSO APP
                </h2>
                <p className="text-xl text-slate-400 mt-6 font-medium leading-relaxed max-w-lg mb-8 italic">
                  Take your enterprise control system anywhere. Native
                  experience on Windows, MacOS, and mobile devices.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button className="rounded-2xl bg-white hover:bg-slate-100 text-slate-900 px-8 py-6 h-auto font-black flex items-center shadow-2xl shadow-white/5">
                    <Download className="mr-3 h-5 w-5" /> Windows Desktop
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl border-slate-700 text-white hover:bg-white/5 px-8 py-6 h-auto font-bold"
                  >
                    Mobile Application
                  </Button>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="bg-gradient-to-br from-blue-600/20 to-emerald-600/20 p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl relative">
                  <div className="h-64 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden group">
                    {/* Mock App Interface Mini UI */}
                    <div className="w-[80%] space-y-4">
                      <div className="h-3 w-1/2 bg-blue-500/40 rounded-full" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-20 bg-slate-900 rounded-xl" />
                        <div className="h-20 bg-slate-900 rounded-xl" />
                      </div>
                      <div className="h-3 w-full bg-slate-800 rounded-full" />
                    </div>
                    <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Floating Elements */}
                  <div className="absolute -top-6 -right-6 h-20 w-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-600/40 animate-bounce">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <KlypsoLogo size={24} />
              <span className="text-[10px] font-black text-slate-400 ml-2">
                &copy; 2024
              </span>
            </div>
            <div className="flex items-center gap-10">
              <Link
                href="#"
                className="font-bold text-slate-400 hover:text-slate-900 text-xs uppercase tracking-widest"
              >
                Privacy
              </Link>
              <Link
                href="#"
                className="font-bold text-slate-400 hover:text-slate-900 text-xs uppercase tracking-widest"
              >
                Terms
              </Link>
              <Link
                href="#"
                className="font-bold text-slate-400 hover:text-slate-900 text-xs uppercase tracking-widest"
              >
                Security
              </Link>
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Designed for high-performance Industry
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

