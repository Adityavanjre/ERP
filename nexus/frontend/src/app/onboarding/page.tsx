"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Factory, 
  Store, 
  Stethoscope, 
  Truck, 
  HardHat, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Building2,
  Globe,
  ShieldCheck,
  Zap,
  CreditCard,
  Briefcase,
  Car,
  ShoppingBag
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

const INDUSTRIES = [
  {
    id: "Manufacturing",
    title: "Manufacturing",
    description: "Production, BOM exploded, WIP tracking, and inventory parity.",
    icon: Factory,
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "Retail",
    title: "Retail & Trade",
    description: "Omnichannel sales, GST POS, and retail stock management.",
    icon: Store,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "Healthcare",
    title: "Healthcare",
    description: "Patient records, clinical inventory, and pharmacy management.",
    icon: Stethoscope,
    color: "from-rose-500 to-pink-600",
  },
  {
    id: "Logistics",
    title: "Logistics",
    description: "Fleet monitoring, shipment tracking, and yard management.",
    icon: Truck,
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "Construction",
    title: "Construction",
    description: "Project sites, resource allocation, and material requisition.",
    icon: HardHat,
    color: "from-slate-600 to-slate-800",
  },
  {
    id: "NBFC",
    title: "NBFC / Finance",
    description: "Loan lifecycle, KYC compliance, EMI tracking and recovery.",
    icon: CreditCard,
    color: "from-purple-500 to-violet-600",
  },
  {
    id: "Service",
    title: "Service / Agency",
    description: "Project management, timesheets, and professional billing.",
    icon: Briefcase,
    color: "from-sky-500 to-blue-600",
  },
  {
    id: "Automotive",
    title: "Automotive",
    description: "Workshop management, parts catalog, and vehicle sales.",
    icon: Car,
    color: "from-red-500 to-rose-600",
  },
  {
    id: "Ecommerce",
    title: "E-commerce",
    description: "Multi-channel fulfillment, marketplace sync, and D2C sales.",
    icon: ShoppingBag,
    color: "from-fuchsia-500 to-purple-600",
  },
];

const ORGANIZATION_TYPES = [
  "Proprietorship",
  "Partnership",
  "Private Limited",
  "Public Limited",
  "LLP",
  "Non-Profit",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    businessType: "Private Limited",
    industry: "",
  });

  useEffect(() => {
    import("@/lib/desktop-offline").then((m) => {
      if (m.isDesktopShell()) {
        m.hydrateDesktopOfflineSession().catch(console.error);
      }
    });
  }, []);

  const nextStep = () => {
    if (step === 1 && !formData.companyName) {
      toast.error("Please enter your business name.");
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleComplete = async () => {
    if (!formData.industry) {
      toast.error("Please select an industry.");
      return;
    }

    setIsSubmitting(true);
    try {
      // In Desktop Offline, this is intercepted by desktop-offline.ts
      await api.post("auth/onboarding", formData);
      toast.success("Workspace initialized!");
      
      // Delay slightly for effect
      setTimeout(() => {
        router.push("/portal/dashboard");
      }, 800);
    } catch (error) {
      console.error("Onboarding failed:", error);
      toast.error("Failed to initialize workspace.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#020617] p-6 font-sans">
      {/* Background Klypso Visuals */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full delay-1000" />
      </div>

      {/* Glassmorphism Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-4xl"
      >
        <div className="glass-card rounded-[2rem] p-8 md:p-12 border-white/5 shadow-2xl backdrop-blur-3xl">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-12">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20"
            >
              <Zap className="text-white w-8 h-8 fill-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Ignite Your <span className="text-blue-400">Klypso</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-lg">
              {step === 1 
                ? "Identity is the foundation of scale. Tell us about your enterprise." 
                : "Specialization drives efficiency. Select the blueprint for your industry."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8 max-w-xl mx-auto"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-slate-300 ml-1">Business Name</Label>
                    <Input 
                      id="companyName"
                      placeholder="e.g. Klypso Industrial Systems"
                      className="h-14 bg-white/5 border-white/10 text-white rounded-xl focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 ml-1">Organization Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {ORGANIZATION_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() => setFormData({ ...formData, businessType: type })}
                          className={`h-12 rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
                            formData.businessType === type 
                              ? "bg-blue-600 text-white ring-2 ring-blue-400/50" 
                              : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={nextStep}
                  className="w-full h-14 rounded-xl text-lg font-bold premium-gradient text-white hover:shadow-blue-500/25 transition-all group"
                >
                  Configure Specialization
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {INDUSTRIES.map((industry) => {
                    const Icon = industry.icon;
                    const isActive = formData.industry === industry.id;
                    return (
                      <button
                        key={industry.id}
                        onClick={() => setFormData({ ...formData, industry: industry.id })}
                        className={`group relative p-6 rounded-2xl flex flex-col items-start text-left transition-all duration-300 border ${
                          isActive 
                            ? "bg-white/10 border-blue-500 ring-1 ring-blue-500 shadow-xl" 
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className={`p-3 rounded-xl mb-4 bg-gradient-to-tr ${industry.color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                          <Icon className="text-white w-6 h-6" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">{industry.title}</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          {industry.description}
                        </p>
                        {isActive && (
                          <div className="absolute top-4 right-4">
                            <CheckCircle2 className="text-blue-400 w-5 h-5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="ghost"
                    onClick={prevStep}
                    className="h-14 flex-1 rounded-xl bg-transparent border border-white/10 text-white hover:bg-white/5"
                  >
                    <ArrowLeft className="mr-2 w-5 h-5" />
                    Back
                  </Button>
                  <Button 
                    disabled={isSubmitting}
                    onClick={handleComplete}
                    className="h-14 flex-[2] rounded-xl text-lg font-bold premium-gradient text-white hover:shadow-blue-500/25 transition-all group border-none"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        Initializing Engine...
                        <div className="ml-3 w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </span>
                    ) : (
                      <>
                        Launch Workspace
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Info */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap justify-center gap-8 opacity-40">
            <div className="flex items-center gap-2 text-white text-xs">
              <ShieldCheck className="w-4 h-4" />
              E2E Encryption
            </div>
            <div className="flex items-center gap-2 text-white text-xs">
              <Globe className="w-4 h-4" />
              Offline Integrity
            </div>
            <div className="flex items-center gap-2 text-white text-xs">
              <Building2 className="w-4 h-4" />
              GST Compliant
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Decorative Elements */}
      <div className="absolute top-1/4 right-10 animate-float opacity-20 pointer-events-none hidden lg:block">
        <div className="w-48 h-48 rounded-full border border-white/10" />
      </div>
      <div className="absolute bottom-1/4 left-10 animate-float opacity-10 pointer-events-none hidden lg:block delay-700">
        <div className="w-32 h-32 rotate-45 border border-white/10" />
      </div>
    </div>
  );
}
