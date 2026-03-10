
"use client";

import { Landmark, Receipt, ShieldCheck, ArrowRight, DollarSign, Wallet, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NBFCCollections() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <Receipt className="w-10 h-10 text-indigo-600" />
                        Repayment Registry
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium tracking-tight">Active installment tracking, overdue management, and reconciliation.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                            <Calendar className="text-indigo-600" />
                        </div>
                        <CardTitle className="text-xl font-black">Due Today</CardTitle>
                        <CardDescription>Installments scheduled for collection.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <p className="text-4xl font-black text-slate-900">₹4.2 Lakh</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Expected Inflow</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                            <Wallet className="text-rose-600" />
                        </div>
                        <CardTitle className="text-xl font-black">Overdue (30+ DPD)</CardTitle>
                        <CardDescription>Accounts requiring immediate field action.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <p className="text-4xl font-black text-rose-600">12</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">At-Risk Portfolios</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col justify-between">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Sync</span>
                        </div>
                        <CardTitle className="text-xl font-black text-white">Bank Reconciliation</CardTitle>
                        <p className="text-slate-400 text-sm mt-2 font-medium">Automatic matching with banking journals active.</p>
                    </div>
                </Card>
            </div>

            <div className="p-12 border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="text-slate-300 w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Collections Engine Active</h3>
                <p className="max-w-md mx-auto text-slate-500 font-medium">This module is currently processing the daily collection feed. Integrated NACH/ECS status will be visible once the banking provider returns the clearance files.</p>
            </div>
        </div>
    );
}
