
"use client";

import { Landmark, ShieldCheck, ArrowRight, Users, Briefcase } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NBFCDashboard() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <Landmark className="w-10 h-10 text-indigo-600" />
                        FinServ Console
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium tracking-tight">Loan portfolio management, collections registry, and KYC compliance.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                            <Briefcase className="text-indigo-600" />
                        </div>
                        <CardTitle className="text-xl font-black">Gross Portfolio</CardTitle>
                        <CardDescription>Total value of active loan accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <p className="text-4xl font-black text-slate-900">₹1.2 Cr</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Active AUM</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                            <Users className="text-emerald-600" />
                        </div>
                        <CardTitle className="text-xl font-black">KCY Fulfilled</CardTitle>
                        <CardDescription>Verified borrower profiles vs total.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <p className="text-4xl font-black text-slate-900">92%</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Compliance Rating</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col justify-between">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Ledger</span>
                        </div>
                        <CardTitle className="text-xl font-black text-white">Daily Collections</CardTitle>
                        <p className="text-slate-400 text-sm mt-2 font-medium">Auto-reconciliation active for banking channels.</p>
                    </div>
                    <div className="p-8 pt-0">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 font-black text-[10px] uppercase tracking-widest gap-2 group">
                            Account Control <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="p-12 border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="text-slate-300 w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Module Core Initialized</h3>
                <p className="max-w-md mx-auto text-slate-500 font-medium">This industry-specific stream is currently syncing operational data. Full KYC automated verification will be activated once the Aadhaar bridge is verified.</p>
            </div>
        </div>
    );
}
