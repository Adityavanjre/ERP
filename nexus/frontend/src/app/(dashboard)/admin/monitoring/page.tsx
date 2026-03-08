
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    HeartPulse,
    TrendingDown,
    Users,
    DollarSign,
    Zap,
    Search,
    ArrowUpRight,
    ShieldAlert,
    Clock,
    MessageSquare,
    PlayCircle,
    BarChart2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface TopAtRiskTenant {
    tenantId: string;
    tenantName: string;
    healthScore: number;
    status: 'RED' | 'AMBER';
    plan: string;
    mrr: number;
    signals: string[];
    interventions?: {
        action: 'SCHEDULE_SUPPORT_CALL' | 'SEND_TRAINING_VIDEO';
    };
}

interface MonitoringReport {
    tenantName: string;
    status: 'RED' | 'AMBER';
    signals: string[];
}

interface MonitoringData {
    mrrAtRisk: number;
    systemStatus: number;
    totalTenants: number;
    topAtRisk: TopAtRiskTenant[];
    allReports: MonitoringReport[];
}

interface SignalFeedItem extends MonitoringReport {
    signal: string;
}

export default function FounderMonitoring() {
    const [data, setData] = useState<MonitoringData | null>(null);
    const [loading, setLoading] = useState(true);

    const syncDashboardStats = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await api.get("system/founder-dashboard");
            setData(res.data);
        } catch (err) {
            console.error("Dashboard Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        syncDashboardStats(true);
        const interval = setInterval(() => syncDashboardStats(false), 30000);
        return () => clearInterval(interval);
    }, [syncDashboardStats]);

    if (loading) return <div className="p-8 text-slate-400 font-black uppercase tracking-widest italic animate-pulse flex items-center justify-center min-h-screen">Loading System Overview...</div>;
    if (!data) return null;

    return (
        <div className="p-4 md:p-10 space-y-8 md:space-y-12 bg-slate-50/50 text-slate-900 min-h-screen pb-40 md:pb-40">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-0">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-4">
                        <div className="p-3 bg-slate-900 rounded-2xl shadow-xl">
                            <HeartPulse className="h-7 w-7 text-emerald-400" />
                        </div>
                        Klypso Business Overview
                    </h1>
                    <p className="text-slate-500 mt-2 font-black uppercase text-[11px] tracking-[0.3em] ml-[68px]">Critical Business Alerts & Automatic Protection</p>
                </div>
                <div className="flex gap-4">
                    <button className="h-12 px-6 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Search className="w-4 h-4" /> Global Search
                    </button>
                    <div className="h-12 px-6 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-200">
                        <Zap className="w-4 h-4 text-blue-500 animate-pulse" /> Auto-Sync Active
                    </div>
                </div>
            </div>

            {/* High Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <Card className="bg-white border-none shadow-2xl shadow-slate-200/40 p-8 rounded-[32px] relative overflow-hidden group hover:-translate-y-1 transition-all">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <DollarSign className="w-24 h-24 text-slate-900" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-mono">MRR At Risk</p>
                    <p className="text-4xl font-black mt-3 text-red-600 tracking-tighter italic">₹{data.mrrAtRisk.toLocaleString()}</p>
                    <div className="mt-6 flex items-center gap-2 text-[9px] bg-red-50 text-red-600 w-fit px-3 py-1 rounded-lg font-black uppercase tracking-widest">
                        <TrendingDown className="w-3 h-3" />
                        Requires Action
                    </div>
                </Card>

                <Card className="bg-white border-none shadow-2xl shadow-slate-200/40 p-8 rounded-[32px] group hover:-translate-y-1 transition-all">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-mono">System Status</p>
                    <div className="mt-3 flex items-baseline gap-3">
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">{data.systemStatus}<span className="text-lg text-slate-300 ml-1">%</span></p>
                        <Badge className={`text-[10px] font-black border-none px-3 py-1 rounded-lg ${data.systemStatus > 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {data.systemStatus > 80 ? 'EXCELLENT' : 'STABILIZING'}
                        </Badge>
                    </div>
                    <div className="mt-8 w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.3)]" style={{ width: `${data.systemStatus}%` }}></div>
                    </div>
                </Card>

                <Card className="bg-white border-none shadow-2xl shadow-slate-200/40 p-8 rounded-[32px] group hover:-translate-y-1 transition-all">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-mono">Live Tenants</p>
                    <p className="text-4xl font-black mt-3 tracking-tighter text-slate-900">{data.totalTenants.toString().padStart(3, '0')}</p>
                    <p className="text-[10px] text-slate-400 mt-6 font-black uppercase tracking-widest flex items-center gap-2 bg-slate-50 w-fit px-3 py-1 rounded-lg">
                        <Users className="w-3 h-3" />
                        Active Users
                    </p>
                </Card>

                <Card className="bg-slate-900 border-none shadow-2xl shadow-slate-900/10 p-8 rounded-[32px] flex items-center justify-center group overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-center relative z-10">
                        <Zap className="w-10 h-10 text-emerald-400 mx-auto mb-3 animate-pulse" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Save Active</p>
                        <p className="text-[9px] font-bold text-slate-600 mt-1 uppercase">Cloud Backup Active</p>
                    </div>
                </Card>
            </div>

            {/* Issue Tracking Desk */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Top At-Risk Tenants */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end px-2 gap-4 sm:gap-0">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <ShieldAlert className="w-8 h-8 text-red-500" />
                                High-Priority Action Items
                            </h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 ml-11">The following items require immediate attention.</p>
                        </div>
                        <BarChart2 className="w-6 h-6 text-slate-200" />
                    </div>

                    <div className="space-y-6">
                        {data.topAtRisk.map((tenant: TopAtRiskTenant) => (
                            <Card key={tenant.tenantId} className="bg-white border-none shadow-xl shadow-slate-200/40 p-8 rounded-[40px] hover:shadow-2xl transition-all flex flex-col lg:flex-row gap-8 justify-between items-start md:items-center group border-l-8 border-l-transparent hover:border-l-red-500">
                                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start sm:items-center">
                                    <div className={`w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-[28px] flex items-center justify-center font-black text-xl md:text-2xl transition-all ${tenant.status === 'RED' ? 'bg-red-50 text-red-600 shadow-lg shadow-red-500/10' : 'bg-amber-50 text-amber-600'}`}>
                                        {tenant.healthScore}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-2xl text-slate-900 tracking-tight">{tenant.tenantName}</h3>
                                        <div className="flex items-center gap-4 mt-2">
                                            <Badge variant="outline" className="text-[9px] font-black border-slate-100 text-slate-400 uppercase tracking-widest px-3">{tenant.plan} PHASE</Badge>
                                            <span className="text-xl font-black text-slate-900 tracking-tighter italic">₹{tenant.mrr.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 max-w-sm">
                                    {tenant.signals.slice(0, 2).map((s: string, i: number) => (
                                        <div key={i} className="text-[9px] bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-slate-500 font-black uppercase tracking-widest">
                                            {s.split(':')[0]}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-4 w-full md:w-auto">
                                    {tenant.interventions?.action === 'SCHEDULE_SUPPORT_CALL' && (
                                        <Button className="flex-1 md:flex-none h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all">
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Follow Up
                                        </Button>
                                    )}
                                    {tenant.interventions?.action === 'SEND_TRAINING_VIDEO' && (
                                        <Button className="flex-1 md:flex-none h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
                                            <PlayCircle className="w-4 h-4 mr-2" />
                                            Send Nudge
                                        </Button>
                                    )}
                                    <button className="h-14 w-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all text-slate-400">
                                        <ArrowUpRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Global Signals Feed */}
                <div className="space-y-8">
                    <h2 className="text-xl font-black flex items-center gap-3 px-2">
                        <HistoryFeedIcon />
                        Recent Activity
                    </h2>
                    <Card className="bg-slate-900 border-none rounded-[3rem] p-10 h-[700px] overflow-y-auto space-y-10 shadow-2xl shadow-slate-900/20">
                        {data.allReports.flatMap((r: MonitoringReport) => r.signals.map((s: string) => ({ ...r, signal: s }))).map((item: SignalFeedItem, i: number) => (
                            <div key={i} className="relative pl-8 border-l-2 border-slate-800 group">
                                <div className={`absolute left-[-6px] top-1.5 w-3 h-3 rounded-full ${item.status === 'RED' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-amber-500'}`}></div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{item.tenantName}</p>
                                    <p className="text-sm font-bold text-slate-300 leading-relaxed group-hover:text-white transition-colors">{item.signal}</p>
                                    <p className="text-[9px] text-slate-700 font-black flex items-center gap-2 uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        Detected Just Now
                                    </p>
                                </div>
                            </div>
                        ))}
                    </Card>
                </div>

            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-4 md:bottom-10 left-4 md:left-10 right-4 md:right-10 bg-white/90 md:bg-white/80 backdrop-blur-2xl border border-slate-200/50 p-4 md:p-6 rounded-[24px] md:rounded-[40px] flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-0 px-6 md:px-12 z-[100] shadow-2xl shadow-slate-300/40 outline outline-1 outline-white/50">
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-10">
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
                        <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
                        System Monitoring Active
                    </div>
                    <div className="h-8 w-px bg-slate-100"></div>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Last Updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>

                <div className="flex gap-6">
                    <Button variant="ghost" className="h-14 px-10 rounded-2xl text-[11px] font-black tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all uppercase">
                        Remind All (Low Risk)
                    </Button>
                    <Button className="h-14 px-12 bg-slate-900 text-white rounded-2xl text-[11px] font-black tracking-widest hover:bg-red-600 shadow-2xl shadow-slate-900/20 transition-all uppercase border-none">
                        Process All Tasks (High Risk)
                    </Button>
                </div>
            </div>
        </div>
    );
}

function HistoryFeedIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
            <path d="M12 8l-4 4 4 4" />
            <path d="M16 12H8" />
            <circle cx="12" cy="12" r="10" />
        </svg>
    );
}
