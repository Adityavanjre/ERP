import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, ShieldCheck, Zap, Globe, Cpu, CheckCircle2, Settings2 } from "lucide-react";
import { KlypsoLogo } from "@/components/brand/logo";
import Script from "next/script";
import { InternalLink } from "@/components/seo/internal-link";

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

  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Nexus ERP India",
    "image": "https://nexus.klypso.in/portal/favicon.svg",
    "@id": "https://nexus.klypso.in/portal",
    "url": "https://nexus.klypso.in/portal",
    "telephone": "+91-XXXXXXXXXX",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Nexus Tech Center, Sector 62",
      "addressLocality": "Noida",
      "addressRegion": "UP",
      "postalCode": "201301",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 28.6282,
      "longitude": 77.3898
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
      ],
      "opens": "09:00",
      "closes": "18:00"
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/10">
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        id="local-business-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
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
                A modern, all-in-one platform to run your <InternalLink>Manufacturing</InternalLink> or <InternalLink>Retail</InternalLink> business with ease.
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
                { title: "Real-time Inventory", desc: "Elite tracking with automated stock journals and multi-location valuation.", icon: BarChart3 },
                { title: "Manufacturing", desc: "Complex BOMs and shop-floor management with real-time tracking.", icon: Cpu },
                { title: "GST Accounting", desc: "Automated GSTR-1 preparation and seamless Tally Prime export architecture.", icon: ShieldCheck },
                { title: "Supply Chain", desc: "Coordinate stock across distributed locations with audit-ready log trails.", icon: Globe },
                { title: "CRM Excellence", desc: "Convert leads to customers with integrated sales pipeline management.", icon: Zap },
                { title: "Advanced Security", desc: "Enterprise-ready SOC2 compliance with robust system auditing.", icon: ShieldCheck },
              ].map((feature, i) => (
                <div key={i} className="group p-8 rounded-3xl bg-slate-50/50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{feature.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Industry Solutions - SEO Powerhouse */}
        <section id="solutions" className="w-full py-24 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <div className="inline-block rounded-lg bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600 uppercase tracking-widest">
                Tailored Solutions
              </div>
              <h2 className="text-3xl font-black tracking-tighter sm:text-5xl text-slate-900 leading-tight">
                Designed for Your <span className="text-blue-600">Specific Industry.</span>
              </h2>
              <p className="max-w-[800px] text-slate-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed font-medium">
                Nexus isn&apos;t just a generic ERP. We&apos;ve built industry-specific architectures to handle the unique complexities of your business.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <Link href="/industries/manufacturing" className="group p-8 rounded-3xl border border-slate-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all text-center space-y-4 bg-slate-50/50 hover:bg-white">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tighter text-sm">Manufacturing</h3>
              </Link>
              <Link href="/industries/healthcare" className="group p-8 rounded-3xl border border-slate-100 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all text-center space-y-4 bg-slate-50/50 hover:bg-white">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tighter text-sm">Healthcare</h3>
              </Link>
              <Link href="/industries/construction" className="group p-8 rounded-3xl border border-slate-100 hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/10 transition-all text-center space-y-4 bg-slate-50/50 hover:bg-white">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tighter text-sm">Construction</h3>
              </Link>
              <Link href="/industries/logistics" className="group p-8 rounded-3xl border border-slate-100 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all text-center space-y-4 bg-slate-50/50 hover:bg-white">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tighter text-sm">Logistics</h3>
              </Link>
              <Link href="/industries/retail" className="group p-8 rounded-3xl border border-slate-100 hover:border-rose-500 hover:shadow-2xl hover:shadow-rose-500/10 transition-all text-center space-y-4 bg-slate-50/50 hover:bg-white">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tighter text-sm">Retail</h3>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-20 bg-slate-50/50">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <KlypsoLogo size={24} />
              <p className="mt-4 text-sm text-slate-500 font-medium">
                The imperial standard for SME management. Engineered for excellence, built for scale.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">Solutions</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-semibold">
                <li><InternalLink>Manufacturing</InternalLink></li>
                <li><InternalLink>Healthcare</InternalLink></li>
                <li><InternalLink>Construction</InternalLink></li>
                <li><InternalLink>Logistics</InternalLink></li>
                <li><InternalLink>Retail</InternalLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">Features</h4>
              <ul className="space-y-4 text-sm text-slate-500 font-semibold text-nowrap">
                <li><InternalLink>Bill of Materials</InternalLink></li>
                <li><InternalLink>Warehouse</InternalLink></li>
                <li><InternalLink>POS</InternalLink></li>
                <li><InternalLink>GSTR-1 Compliance</InternalLink></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-xs">Connect</h4>
              <div className="flex gap-6 mt-2">
                <Link href="#" className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-tighter">Twitter</Link>
                <Link href="#" className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-tighter">GitHub</Link>
                <Link href="#" className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-tighter">LinkedIn</Link>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">
              © 2026 Nexus Ecosystems. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
