import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, ShieldCheck, Zap, Globe, Cpu } from "lucide-react";
import { KlypsoLogo } from "@/components/brand/logo";
import Script from "next/script";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Nexus ERP",
    "operatingSystem": "Web",
    "applicationCategory": "BusinessApplication",
    "description": "Advanced ERP for Manufacturing and GST Compliance. Features Tally Prime sync, BOM management, and automated accounting.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "120"
    },
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "INR"
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/10">
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
      <header className="px-4 lg:px-6 h-20 flex items-center border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center group" href="/">
          <KlypsoLogo size={40} />
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-8 items-center">
          <Link className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors hidden md:block" href="#features">
            Features
          </Link>
          <Link className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors hidden md:block" href="#solutions">
            Solutions
          </Link>
          <div className="h-4 w-px bg-slate-200 hidden md:block" />
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-semibold hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-all">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-full px-6 group transition-all shadow-md shadow-blue-500/10">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 lg:py-48 overflow-hidden bg-slate-50/50">
          {/* Background decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[120px] -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-200/40 rounded-full blur-[120px] -z-10 animate-delay-1000 animate-pulse" />
          </div>

          <div className="container px-4 md:px-6 mx-auto relative">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="inline-flex items-center rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-bold text-blue-600 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-ping" />
                Klypso Software v2.0
              </div>
              <h1 className="text-4xl font-extrabold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl text-slate-900 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                Operate at the <br />
                <span className="text-blue-600">Run Your Business Faster.</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-slate-600 md:text-xl/relaxed lg:text-2xl/relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
                A modern, all-in-one platform to run your manufacturing or retail business with ease.
              </p>
              <div className="flex flex-col gap-4 min-[400px]:flex-row justify-center animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-700">
                <Link href="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-14 text-lg shadow-lg shadow-blue-500/20">
                    Create Workspace
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="border-slate-200 bg-white shadow-sm rounded-full px-8 h-14 text-lg hover:bg-slate-50 hover:border-slate-300">
                    Live Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 bg-white border-y border-slate-100">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-bold mb-16 text-slate-900">All-in-one Platform.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Smart Inventory", desc: "Precision stock predictions and automated replenishment systems.", icon: BarChart3 },
                { title: "Manufacturing", desc: "Complex BOMs and shop-floor management with real-time data.", icon: Cpu },
                { title: "Accounting", desc: "Keep your books accurate and up-to-date automatically.", icon: ShieldCheck },
                { title: "Supply Chain", desc: "Track your orders and shipments in real-time with automatic updates.", icon: Globe },
                { title: "CRM Excellence", desc: "Manage your customers and track your sales from first contact to closing.", icon: Zap },
                { title: "Advanced Security", desc: "Enterprise-grade SOC2 compliant access and auditing.", icon: ShieldCheck },
              ].map((feature, i) => (
                <div key={i} className="group p-8 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{feature.title}</h3>
                  <p className="text-slate-500 font-medium">Launch your business operations in minutes.</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12 bg-slate-50/50">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <KlypsoLogo size={24} />
          <p className="text-sm text-slate-500 font-semibold tracking-wide uppercase italic">
            Engineered for Excellence. Built for Scale.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-tighter">Twitter</Link>
            <Link href="#" className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-tighter">GitHub</Link>
            <Link href="#" className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-tighter">LinkedIn</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
