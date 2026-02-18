
"use client";

import React, { useState, useEffect } from "react";
import {
    TrendingUp,
    Wallet,
    Clock,
    ShieldAlert,
    History,
    Zap,
    Trophy,
    Rocket,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    Timer
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";

export default function RecoveryMemoryDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const syncRecoveryIntelligence = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await api.get("accounting/recovery-memory");
            setData(res);
        } catch (err) {
            console.error("Recovery Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncRecoveryIntelligence(true);
        const interval = setInterval(() => syncRecoveryIntelligence(false), 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-zinc-400">Loading Profit Insights...</div>;
    if (!data) return null;

    return (
        <div className="p-8 space-y-10 bg-slate-50 text-slate-900 min-h-screen pb-32">
            {/* Hero psychological anchor */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 border border-blue-500/20 p-16 shadow-2xl shadow-blue-500/20">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Zap className="w-80 h-80 text-white" />
                </div>

                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-8">
                        <Sparkles className="w-4 h-4" />
                        Insights
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter mb-6 text-white leading-[1.1]">
                        System Protected <span className="text-emerald-300">₹{data.anchors.monthlyProtection.toLocaleString()}</span> This Month.
                    </h1>
                    <p className="text-xl text-blue-50 font-medium leading-relaxed mb-10 opacity-90">
                        Your business is protected. We automatically find missed payments, prevent disputes, and help you collect faster.
                    </p>

                    <div className="flex gap-12">
                        <div>
                            <p className="text-blue-200 text-xs font-black uppercase tracking-[0.2em] mb-2">Lifetime Protection</p>
                            <p className="text-4xl font-black flex items-center gap-3 text-white">
                                ₹{data.anchors.lifetimeRecovery.toLocaleString()}
                                <Trophy className="w-7 h-7 text-amber-300" />
                            </p>
                        </div>
                        <div className="border-l border-white/20 pl-12">
                            <p className="text-blue-200 text-xs font-black uppercase tracking-[0.2em] mb-2">Compliance Streak</p>
                            <p className="text-4xl font-black flex items-center gap-3 text-white">
                                {data.anchors.daysSinceDrift} Days
                                <ShieldAlert className="w-7 h-7 text-white/60" />
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid: Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Money Found Counter */}
                <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] space-y-8 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div className="bg-emerald-50 p-4 rounded-2xl">
                            <Wallet className="w-8 h-8 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full uppercase tracking-widest">+₹{data.moneyFound.total.toLocaleString()} FOUND</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black mb-2 tracking-tight">Revenue Recovered</h2>
                        <p className="text-slate-500 font-medium">Automatic identification of missed billing & leakage.</p>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-slate-50">
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-slate-500">Overdue Reminders</span>
                            <span className="font-black text-slate-900">₹{data.moneyFound.overdueRecovered.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-slate-500">Dispute Verification Logs</span>
                            <span className="font-black text-slate-900">₹{data.moneyFound.disputesPrevented.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-slate-500">Inventory Loss Prevention</span>
                            <span className="font-black text-slate-900">₹{data.moneyFound.shrinkageAvoided.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Collection Efficiency */}
                <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] space-y-8 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div className="bg-blue-50 p-4 rounded-2xl">
                            <TrendingUp className="w-8 h-8 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-widest">{data.efficiency.improvement}% ACCELERATION</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black mb-2 tracking-tight">Flow Efficiency</h2>
                        <p className="text-slate-500 font-medium">Real-time velocity from Invoice to Settlement.</p>
                    </div>
                    <div className="pt-4 space-y-8">
                        <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="absolute left-0 top-0 bg-blue-600 h-full transition-all duration-1000" style={{ width: `${(data.efficiency.avgPaymentLag / data.efficiency.baselineLag) * 100}%` }}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CURRENT</p>
                                <p className="text-2xl font-black text-blue-600">{data.efficiency.avgPaymentLag} DAYS</p>
                            </div>
                            <div className="text-center p-4 rounded-2xl bg-white border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">BASELINE</p>
                                <p className="text-2xl font-black text-slate-400">{data.efficiency.baselineLag} DAYS</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operational Time Saved */}
                <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] space-y-8 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div className="bg-indigo-50 p-4 rounded-2xl">
                            <Clock className="w-8 h-8 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase tracking-widest">ASSET OPTIMIZED</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black mb-2 tracking-tight">Time Saved</h2>
                        <p className="text-slate-500 font-medium">Tasks handled automatically, so you don't have to.</p>
                    </div>
                    <div className="flex items-center gap-8 pt-4">
                        <div className="space-y-1">
                            <p className="text-5xl font-black text-slate-900">{data.timeSaved.hours}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hours Saved</p>
                        </div>
                        <div className="h-16 w-px bg-slate-100"></div>
                        <div className="space-y-1">
                            <p className="text-5xl font-black text-blue-600">₹{data.timeSaved.monetaryValue.toLocaleString()}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Labor Value</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 font-medium italic">Equivalent to {Math.round(data.timeSaved.hours / 8)} full working shifts recovered.</p>
                </div>

            </div>

            {/* Recovery Opportunities Section */}
            <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center lg:items-end mb-12 gap-8">
                    <div className="text-center md:text-left">
                        <h2 className="text-4xl font-black mb-3 tracking-tighter flex items-center justify-center md:justify-start gap-4">
                            <History className="w-10 h-10 text-blue-600" />
                            Recovery Opportunities
                        </h2>
                        <p className="text-slate-500 font-medium text-lg">Customers who haven't purchased recently. Reach out to bring them back.</p>
                    </div>
                    <button className="flex items-center gap-3 bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95">
                        Bulk Export Target Leads
                        <ArrowRight className="w-5 h-5 text-blue-400" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {data.opportunities.map((opp: any) => (
                        <div key={opp.id} className="bg-slate-50/50 border border-slate-100 p-8 rounded-[2rem] hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
                            <div className="flex justify-between mb-6">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-slate-400 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                                    {opp.name.charAt(0)}
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inactive for</p>
                                    <p className="text-sm font-black text-blue-600">{opp.daysSilent} Days</p>
                                </div>
                            </div>
                            <h3 className="font-black text-xl mb-2 text-slate-900 truncate">{opp.name}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Delta: ₹{opp.lastTransaction.toLocaleString()}</p>
                            <button className="w-full py-3 bg-white border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
                                Send Reminder
                            </button>
                        </div>
                    ))}
                    {data.opportunities.length === 0 && (
                        <div className="col-span-full py-24 text-center space-y-6 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                            <p className="text-slate-500 font-black uppercase tracking-widest">Retention Optimized: 100% Activity</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Upsell Banner (Psychological Trigger) */}
            {data.anchors.lifetimeRecovery > 50000 && (
                <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3.5rem] flex flex-col lg:flex-row justify-between items-center gap-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="space-y-4 text-center lg:text-left relative z-10">
                        <h2 className="text-4xl font-black text-white tracking-tighter">Maximize System Protection.</h2>
                        <p className="text-slate-400 text-xl font-medium max-w-2xl leading-relaxed">
                            You've already saved a lot with this plan. Upgrade to <span className="text-white font-bold">Prime Plan</span> to unlock advanced overdue detection and automated follow-ups.
                        </p>
                    </div>
                    <button className="bg-blue-600 text-white px-12 py-6 rounded-[2.5rem] font-black text-xl hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/20 flex items-center gap-4 relative z-10 active:scale-95 group">
                        Annual Plan Upgrade
                        <Rocket className="w-7 h-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </button>
                </div>
            )}

            {/* Footer Info */}
            <div className="flex justify-center items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] pt-12 pb-12">
                <Timer className="w-4 h-4" />
                Auto-updated every 30 seconds
            </div>
        </div>
    );
}

