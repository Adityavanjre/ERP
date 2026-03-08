
"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck,
    ShieldAlert,
    Lock,
    Unlock,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    FileSearch,
    ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useUX } from "@/components/providers/ux-provider";

interface RiskFlag {
    type: string;
    severity: 'BLOCKER' | 'WARNING';
    count: number;
}

interface AuditorData {
    isLocked: boolean;
    confidenceScore: number;
    hsnCoverage: number;
    status: string;
    riskFlags: RiskFlag[];
    errors: string[];
}

interface ApiError {
    message?: string;
    response?: {
        data?: {
            message?: string;
        };
    };
}

export function AuditorDashboard() {
    const { setUILocked, showConfirm } = useUX();
    const [data, setData] = useState<AuditorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/accounting/auditor/dashboard?month=${month}&year=${year}`);
            setData(res.data);
        } catch {
            toast.error("Failed to load auditor data");
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const toggleLock = useCallback(() => {
        const action = data?.isLocked ? 'UNLOCK' : 'LOCK';

        showConfirm({
            title: `${action} Period`,
            description: `Are you sure you want to ${action.toLowerCase()} the books for ${month}/${year}? ${action === 'LOCK' ? 'This will prevent further modifications.' : 'This will allow edits but mark the period as reopened.'}`,
            confirmText: action,
            onConfirm: async () => {
                try {
                    setUILocked(true);
                    const endpoint = action === 'LOCK' ? "/accounting/auditor/lock" : "/accounting/auditor/unlock";
                    await api.post(endpoint, {
                        month,
                        year,
                        reason: action === 'UNLOCK' ? 'Administrative Reopening' : undefined
                    });
                    toast.success(`Period ${action.toLowerCase()}ed successfully`);
                    fetchDashboard();
                } catch (err: unknown) {
                    const error = err as ApiError;
                    toast.error(error.response?.data?.message || error.message || `Failed to ${action.toLowerCase()} period`);
                } finally {
                    setUILocked(false);
                }
            }
        });
    }, [data, month, year, showConfirm, setUILocked, fetchDashboard]);

    if (loading) return <div className="p-12 text-center font-bold text-slate-400">Auditing books...</div>;

    return (
        <div className="space-y-6">
            {/* Date Selectors */}
            <div className="flex flex-col md:flex-row gap-4 items-end mb-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="space-y-2 flex-grow">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Period</label>
                    <div className="flex gap-4">
                        <select
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchDashboard}
                    disabled={loading}
                    className="rounded-xl border-slate-200 font-bold gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Audit
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Verification Status */}
                <Card className="lg:col-span-2 bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                    <CardHeader className={`${data?.isLocked ? 'bg-slate-900 text-white' : 'bg-amber-600 text-white'} p-8 transition-colors`}>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-black flex items-center gap-3">
                                    {data?.isLocked ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                                    {data?.isLocked ? 'Books Locked' : 'Books Open'}
                                </CardTitle>
                                <CardDescription className="text-slate-100/70 font-bold">
                                    Period: {month}/{year} • Security Mode: GST Compliant
                                </CardDescription>
                            </div>
                            <Button
                                onClick={toggleLock}
                                className={`${data?.isLocked ? 'bg-white/10 hover:bg-white/20' : 'bg-white text-amber-600 hover:bg-slate-50'} rounded-2xl font-black px-6`}
                            >
                                {data?.isLocked ? 'Unlock Books' : 'Lock & Reconcile'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Tally Readiness', val: `${data?.confidenceScore}%`, color: 'text-emerald-500', icon: ShieldCheck },
                                { label: 'HSN Coverage', val: `${data?.hsnCoverage}%`, color: 'text-blue-500', icon: FileSearch },
                                { label: 'Voucher Status', val: data?.status || 'PENDING', color: data?.status === 'CLEAN' ? 'text-emerald-500' : 'text-amber-500', icon: CheckCircle2 },
                                { label: 'Critical Risks', val: data?.riskFlags?.length || 0, color: (data?.riskFlags?.length ?? 0) > 0 ? 'text-rose-500' : 'text-slate-400', icon: ShieldAlert },
                            ].map((s, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <s.icon className="h-3 w-3" /> {s.label}
                                    </div>
                                    <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Validation Messages
                            </h3>
                            <div className="space-y-3">
                                {data?.errors?.map((err, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold">
                                        <ShieldAlert className="h-5 w-5 mt-0.5" />
                                        {err}
                                    </div>
                                ))}
                                {data?.errors?.length === 0 && (
                                    <div className="flex items-start gap-4 p-6 rounded-3xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold">
                                        <CheckCircle2 className="h-5 w-5 mt-0.5" />
                                        All vouchers are balanced and ready for Tally export. No drift detected.
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Audit Sidecard */}
                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                    <CardHeader className="p-8 border-b border-slate-100">
                        <CardTitle className="text-xl font-black">Risk Parameters</CardTitle>
                        <CardDescription className="font-bold">Automated audit checkpoints</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {data?.riskFlags?.map((flag, i) => (
                            <div key={i} className="flex justify-between items-center group cursor-help">
                                <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${flag.severity === 'BLOCKER' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 transition-colors group-hover:text-slate-900">{flag.type}</span>
                                </div>
                                <Badge variant="outline" className={`${flag.severity === 'BLOCKER' ? 'border-rose-200 text-rose-500 bg-rose-50' : 'border-amber-200 text-amber-500 bg-amber-50'} font-black text-[10px]`}>
                                    {flag.count} {flag.severity}
                                </Badge>
                            </div>
                        ))}
                        {!data?.riskFlags?.length && (
                            <div className="text-center py-12">
                                <ShieldCheck className="mx-auto h-12 w-12 text-emerald-100 mb-4" />
                                <p className="text-sm font-bold text-slate-400">Zero Critical Risks</p>
                            </div>
                        )}

                        <div className="pt-6 border-t border-slate-100">
                            <Button variant="ghost" className="w-full justify-between hover:bg-slate-50 rounded-2xl p-4 font-bold text-slate-600 transition-all group">
                                Download Audit Log
                                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
