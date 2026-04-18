import React from "react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  Settings2,
  Home,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { industryThemes } from "../../../constants/industries";
import Script from "next/script";
import { SmartContent } from "../../../components/seo/smart-content";
import { DesktopRouteGate } from "../../../components/auth/route-gate";

interface Props {
  params: Promise<{ slug: string }>;
}

const icons: Record<string, React.ReactNode> = {
  Settings2: <Settings2 className="h-12 w-12 text-blue-600" />,
  ShieldCheck: <ShieldCheck className="h-12 w-12 text-emerald-600" />,
  BarChart3: <BarChart3 className="h-12 w-12 text-amber-600" />,
  CheckCircle2: <CheckCircle2 className="h-12 w-12 text-indigo-600" />,
};

export async function generateStaticParams() {
  return Object.keys(industryThemes).map((slug) => ({
    slug: slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const theme = industryThemes[slug.toLowerCase()];
  if (!theme) return { title: &quot;Klypso ERP&quot; };

  return {
    title: theme.title,
    description: theme.desc,
    keywords: [
      `ERP for ${theme.name}`,
      `${theme.name} Software India`,
      `Best ${theme.name} ERP`,
      `भारत के लिए ${theme.name} ईआरपी`, // Hindi: Industry ERP for India
      `जीएसटी सॉफ्टवेयर ${theme.name}`, // Hindi: GST Software Industry
    ],
    alternates: {
      canonical: `https://klypso.in/portal/industries/${slug.toLowerCase()}`,
    },
    openGraph: {
      title: theme.title,
      description: theme.desc,
      type: &quot;website&quot;,
    },
    other: {
      &quot;twitter:label1&quot;: &quot;Region&quot;,
      &quot;twitter:data1&quot;: &quot;India / Regional&quot;,
      &quot;twitter:label2&quot;: &quot;Rating&quot;,
      &quot;twitter:data2&quot;: &quot;4.9/5 ⭐&quot;,
      &quot;theme-color&quot;: &quot;#0f172a&quot;,
      &quot;ai-optimized&quot;: &quot;true&quot;,
    },
  };
}

export default async function IndustryLandingPage({ params }: Props) {
  const { slug } = await params;
  const theme = industryThemes[slug.toLowerCase()];

  if (!theme) {
    notFound();
  }

  const Icon = icons[theme.icon] || (
    <CheckCircle2 className="h-12 w-12 text-blue-600" />
  );

  const jsonLd = {
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;SoftwareApplication&quot;,
    name: `Klypso ERP for ${theme.name}`,
    description: theme.desc,
    applicationCategory: &quot;BusinessApplication&quot;,
    operatingSystem: &quot;Web&quot;,
    offers: {
      &quot;@type&quot;: &quot;Offer&quot;,
      price: &quot;0.00&quot;,
      priceCurrency: &quot;INR&quot;,
    },
    featureList: theme.features,
  };

  const faqJsonLd = {
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;FAQPage&quot;,
    mainEntity: theme.faqs.map((faq: { q: string; a: string }) => ({
      &quot;@type&quot;: &quot;Question&quot;,
      name: faq.q,
      acceptedAnswer: {
        &quot;@type&quot;: &quot;Answer&quot;,
        text: faq.a,
      },
    })),
  };

  const breadcrumbJsonLd = {
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;BreadcrumbList&quot;,
    itemListElement: [
      {
        &quot;@type&quot;: &quot;ListItem&quot;,
        position: 1,
        name: &quot;Klypso ERP&quot;,
        item: &quot;https://klypso.in/portal&quot;,
      },
      {
        &quot;@type&quot;: &quot;ListItem&quot;,
        position: 2,
        name: &quot;Solutions&quot;,
        item: &quot;https://klypso.in/portal#solutions&quot;,
      },
      {
        &quot;@type&quot;: &quot;ListItem&quot;,
        position: 3,
        name: theme.name,
        item: `https://klypso.in/portal/industries/${slug}`,
      },
    ],
  };

  const serviceJsonLd = {
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;Service&quot;,
    serviceType: &quot;Enterprise Resource Planning&quot;,
    provider: {
      &quot;@type&quot;: &quot;Organization&quot;,
      name: &quot;Klypso ERP India&quot;,
    },
    areaServed: &quot;IN&quot;,
    description: theme.desc,
    aggregateRating: {
      &quot;@type&quot;: &quot;AggregateRating&quot;,
      ratingValue: &quot;4.9&quot;,
      reviewCount: &quot;250&quot;,
    },
    offers: {
      &quot;@type&quot;: &quot;Offer&quot;,
      price: &quot;0.00&quot;,
      priceCurrency: &quot;INR&quot;,
    },
  };

  const speakableJsonLd = {
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;WebPage&quot;,
    speakable: {
      &quot;@type&quot;: &quot;SpeakableSpecification&quot;,
      cssSelector: [&quot;.industry-desc&quot;, &quot;.industry-title&quot;],
    },
    url: `https://klypso.in/portal/industries/${slug}`,
  };

  const videoJsonLd = {
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;VideoObject&quot;,
    name: `Klypso ERP for ${theme.name} Demo`,
    description: `Watch how Klypso ERP transforms ${theme.name} businesses in India with automated BOM and GST compliance.`,
    thumbnailUrl: &quot;https://klypso.in/portal/og-image.png&quot;,
    uploadDate: &quot;2024-01-01T08:00:00+08:00&quot;,
    duration: &quot;PT2M30S&quot;,
    contentUrl: `https://klypso.in/portal/videos/${slug}-demo.mp4`,
    embedUrl: `https://klypso.in/portal/embed/${slug}`,
    interactionStatistic: {
      &quot;@type&quot;: &quot;InteractionCounter&quot;,
      interactionType: { &quot;@type&quot;: &quot;WatchAction&quot; },
      userInteractionCount: 12500,
    },
  };

  const sourceCodeJsonLd = {
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;SoftwareSourceCode&quot;,
    name: &quot;Klypso ERP Core Engine&quot;,
    description:
      &quot;High-performance business OS built with Next.js, Prisma, and PostgreSQL.&quot;,
    programmingLanguage: &quot;TypeScript&quot;,
    runtimePlatform: &quot;Node.js&quot;,
    codeRepository: &quot;https://github.com/adityavanjre/ERP&quot;,
    author: {
      &quot;@type&quot;: &quot;Organization&quot;,
      name: &quot;Klypso Ecosystems&quot;,
    },
  };

  const relatedIndustries = Object.keys(industryThemes)
    .filter((s) => s !== slug.toLowerCase())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-500/10">
      <DesktopRouteGate />
      <Script
        id={`jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        id={`faq-jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Script
        id={`breadcrumb-jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Script
        id={`service-jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <Script
        id={`speakable-jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableJsonLd) }}
      />
      <Script
        id={`video-jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
      />
      <Script
        id={`sourcecode-jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sourceCodeJsonLd) }}
      />

      <header className="px-6 h-20 flex items-center border-b bg-white border-slate-100 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <nav className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Klypso</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-300">Solutions</span>
            <span className="text-slate-300">/</span>
            <span className="text-blue-600 font-bold">{theme.name}</span>
          </nav>

          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-semibold text-xs uppercase tracking-widest">
              Home
            </span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-20">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
          <div className="p-4 bg-white rounded-2xl shadow-xl shadow-slate-200/50 scale-110 mb-4">
            {Icon}
          </div>

          <h1 className="industry-title text-4xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.1]">
            Klypso ERP for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {theme.name}
            </span>
          </h1>

          <p className="industry-desc text-xl md:text-2xl text-slate-600 font-medium leading-relaxed max-w-2xl">
            <SmartContent>{theme.desc}</SmartContent>
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 w-full sm:w-auto">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 h-16 px-10 rounded-full text-lg shadow-xl shadow-blue-500/20 font-bold group"
              >
                Start Free Trial
                <ArrowLeft className="ml-2 h-5 w-5 rotate-180 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-16 w-full text-left">
            {theme.features.map((feature: string) => (
              <div
                key={feature}
                className="group flex items-start gap-4 p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all active:scale-[0.98]"
              >
                <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-lg">
                    {feature}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    <SmartContent>{`Industrial-grade automation for the modern ${theme.name} enterprise. Built to scale with your business.`}</SmartContent>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="w-full pt-32 max-w-3xl">
            <h2 className="text-3xl font-black text-slate-900 mb-12 text-left uppercase tracking-tighter">
              Frequently Asked <span className="text-blue-600">Questions</span>
            </h2>
            <div className="space-y-6 text-left">
              {theme.faqs.map((faq: { q: string; a: string }) => (
                <div
                  key={faq.q}
                  className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-blue-100 transition-colors"
                >
                  <h4 className="font-bold text-slate-900 text-lg mb-2">
                    {faq.q}
                  </h4>
                  <p className="text-slate-500 font-medium">
                    <SmartContent>{faq.a}</SmartContent>
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Topic Cluster - Related Solutions */}
          <div className="w-full pt-40 border-t border-slate-100 italic">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">
              Related Industry Solutions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedIndustries.map((relSlug) => {
                const relTheme = industryThemes[relSlug];
                return (
                  <Link
                    key={relSlug}
                    href={`/industries/${relSlug}`}
                    className="group p-6 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-lg transition-all text-left"
                  >
                    <div className="text-blue-600 font-black mb-2 uppercase text-[10px]">
                      Solution
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1">
                      {relTheme.name}
                    </h4>
                    <p className="text-slate-400 text-xs font-medium line-clamp-2">
                      {relTheme.desc}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
