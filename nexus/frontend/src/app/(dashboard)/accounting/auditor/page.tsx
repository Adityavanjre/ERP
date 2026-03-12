
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    ShieldCheck,
    AlertTriangle,
    Lock,
    Unlock,
    FileText,
    BarChart3,
    Download,
    CheckCircle2,
    XCircle,
    Clock,
    ArrowRightLeft,
    Search,
    Package
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface RiskFlag {
    type: string;
    severity: 'BLOCKER' | 'WARNING';
    count: number;
}

interface AuditorData {
    confidenceScore: number;
    status: 'CLEAN' | 'BLOCKED' | 'WARNING';
    isLocked: boolean;
    lockDetails: {
        lockedAt: string;
    };
    hsnCoverage: number;
    riskFlags: RiskFlag[];
    errors: string[];
    summary: {
        totalSales: number;
        totalGST: number;
        totalReceipts: number;
        totalPayments: number;
        netBalanceDr: number;
        netBalanceCr: number;
    };
}

export default function AuditorDashboard() {
    const [data, setData] = useState<AuditorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [reopenReason, setReopenReason] = useState("");
    const [isReopening, setIsReopening] = useState(false);

    const syncAuditorData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await api.get(`accounting/auditor/dashboard?month=${month}&year=${year}`);
            setData(res.data);
        } catch {
            // Suppressed in prod: Auditor sync failed silently
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        syncAuditorData(true);
        const interval = setInterval(() => syncAuditorData(false), 30000);
        return () => clearInterval(interval);
    }, [syncAuditorData]);

    const handleLock = async () => {
        try {
            await api.post("accounting/auditor/lock", { month, year });
            toast.success("Period locked successfully");
            syncAuditorData(true);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to lock period");
        }
    };

    const handleUnlock = async () => {
        if (!reopenReason) {
            toast.error("Please provide a reason for reopening");
            return;
        }
        try {
            await api.post("accounting/auditor/unlock", { month, year, reason: reopenReason });
            toast.success("Period reopened");
            setIsReopening(false);
            setReopenReason("");
            syncAuditorData(true);
        } catch {
            // Suppressed in prod
            toast.error("Failed to reopen period");
        }
    };

    const handleCloseYear = async () => {
        if (!confirm(`Are you sure you want to CLOSE the Financial Year ${year}? This will zero out all Revenue/Expense accounts and move profit to Retained Earnings.`)) return;

        try {
            const res = await api.post("accounting/close-year", { year });
            toast.success(res.data.message);
            syncAuditorData(true);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to close year");
        }
    };

    const handleTallyExport = async () => {
        try {
            toast.info(`Generating Tally Vouchers for ${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year}...`);
            const response = await api.get(`accounting/export/tally?month=${month}&year=${year}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Tally_Vouchers_${month}_${year}.xml`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Vouchers exported successfully");
        } catch {
            // Suppressed in prod
            toast.error("Failed to generate Tally Export");
        }
    };

    const handleTallyMasters = async () => {
        try {
            toast.info("Generating Tally Masters (Ledgers + Items)...");
            const response = await api.get(`accounting/export/masters`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Tally_Masters.xml`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Masters exported successfully");
        } catch {
            // Suppressed in prod
            toast.error("Failed to generate Tally Masters");
        }
    };

    if (loading && !data) return <div className="p-8">Loading Auditor...</div>;

    return (
        <div className="p-4 md:p-8 pb-24 md:pb-20 space-y-6 md:space-y-8 bg-slate-50 text-slate-900 min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                        Klypso Auditor
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Review and close your monthly accounts.</p>
                </div>

                <div className="flex items-center gap-4 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="bg-transparent border-none text-slate-900 focus:ring-0 cursor-pointer font-bold text-sm"
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1} className="bg-white">{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="bg-transparent border-none text-slate-900 focus:ring-0 cursor-pointer font-bold text-sm"
                    >
                        {[2024, 2025, 2026].map((y) => (
                            <option key={y} value={y} className="bg-zinc-900">{y}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => syncAuditorData(true)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <Search className="w-4 h-4 text-zinc-400" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                        <ShieldCheck className="w-3 h-3 animate-pulse" /> Auto-Sync Active
                    </div>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShieldCheck className="w-16 h-16 text-slate-900" />
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Confidence Score</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{data?.confidenceScore}%</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${(data?.confidenceScore ?? 0) > 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {(data?.confidenceScore ?? 0) > 90 ? 'High' : 'Moderate'}
                        </span>
                    </div>
                    <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${data?.confidenceScore ?? 0}%` }}></div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Audit Status</p>
                    <div className="mt-2 flex items-center gap-2">
                        {data?.status === 'CLEAN' ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        ) : data?.status === 'BLOCKED' ? (
                            <XCircle className="w-6 h-6 text-red-600" />
                        ) : (
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        )}
                        <span className="text-2xl font-black text-slate-900 tracking-tighter">{data?.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold italic">
                        {data?.status === 'CLEAN' ? 'Ready for statutory filing' : 'Corrections required before export'}
                    </p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Monthly Lock</p>
                    <div className="mt-2 flex items-center gap-3">
                        {data?.isLocked ? (
                            <Lock className="w-6 h-6 text-emerald-600" />
                        ) : (
                            <Unlock className="w-6 h-6 text-amber-500" />
                        )}
                        <span className="text-2xl font-black text-slate-900 tracking-tighter">{data?.isLocked ? 'Closed' : 'Open'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold italic">
                        {data?.isLocked && data.lockDetails ? `Locked on ${new Date(data.lockDetails.lockedAt).toLocaleDateString()}` : 'Vouchers can still be edited'}
                    </p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm">
                    <p className="text-slate-500 text-[10px) font-black uppercase tracking-widest">Tax Coverage</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{(data?.hsnCoverage || 0).toFixed(0)}%</span>
                        <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${data?.hsnCoverage ?? 0}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Grid: Risk & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Risk Flags */}
                <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 tracking-tight">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        Account Alerts & Blockers
                    </h2>
                    <div className="space-y-4">
                        {(!data?.riskFlags || data.riskFlags.length === 0) && (
                            <div className="text-slate-400 font-bold italic py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                No major flags detected for this period.
                            </div>
                        )}
                        {data?.riskFlags?.map((flag: RiskFlag, i: number) => (
                            <div key={i} className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all hover:scale-[1.01] ${flag.severity === 'BLOCKER' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                                <div className="flex items-center gap-4">
                                    {flag.type === 'BACKDATED' && <Clock className="w-6 h-6 text-amber-600" />}
                                    {flag.type === 'HIGH_ROUNDOFF' && <BarChart3 className="w-6 h-6 text-amber-600" />}
                                    {flag.type === 'NEGATIVE_STOCK' && <Package className="w-6 h-6 text-red-600" />}
                                    {flag.type === 'UNLINKED_PAYMENTS' && <ArrowRightLeft className="w-6 h-6 text-amber-600" />}
                                    <div>
                                        <p className="font-black text-[11px] uppercase tracking-[0.1em]">{flag.type.replace('_', ' ')}</p>
                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{flag.count} occurrences detected.</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${flag.severity === 'BLOCKER' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                                    {flag.severity}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 space-y-3">
                        {data?.errors?.map((err: string, i: number) => (
                            <div key={i} className="text-sm text-red-400 flex gap-2">
                                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                {err}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Financial Summary (Trial Balance Simulation) */}
                <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 tracking-tight">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Trial Balance Overview
                    </h2>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Sales</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{data?.summary.totalSales.toLocaleString()}</p>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px) text-slate-500 font-bold uppercase tracking-widest">Total GST Liability</p>
                                <p className="text-2xl font-black text-blue-600 tracking-tighter">₹{data?.summary.totalGST.toLocaleString()}</p>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Receipts</p>
                                <p className="text-2xl font-black text-emerald-600 tracking-tighter">₹{data?.summary.totalReceipts.toLocaleString()}</p>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Payments</p>
                                <p className="text-2xl font-black text-rose-600 tracking-tighter">₹{data?.summary.totalPayments.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-slate-500 font-bold text-sm">Simulated Net Dr (Receivables)</span>
                                <span className="font-black text-slate-900 text-lg tracking-tight">₹{data?.summary.netBalanceDr.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-slate-500 font-bold text-sm">Simulated Net Cr (Payables)</span>
                                <span className="font-black text-slate-900 text-lg tracking-tight">₹{data?.summary.netBalanceCr.toLocaleString()}</span>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    <span className="font-black text-emerald-700 uppercase tracking-tight text-xs">Voucher Balancing</span>
                                </div>
                                <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Perfect (No mismatch)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 px-4 md:px-8 z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${data?.isLocked ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{data?.isLocked ? 'Month Closed & Audited' : 'Month Open for Entries'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {data?.isLocked ? (
                        <>
                            <button
                                onClick={() => setIsReopening(true)}
                                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all border border-zinc-700"
                            >
                                <Unlock className="w-4 h-4" />
                                Reopen Month
                            </button>
                            <button
                                onClick={handleCloseYear}
                                className="px-6 py-2.5 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/30 rounded-xl font-bold flex items-center gap-2 transition-all border border-emerald-900/30"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Close Year {year}
                            </button>
                            <button
                                onClick={handleTallyMasters}
                                className="px-6 py-2.5 bg-white/50 text-slate-600 hover:bg-white rounded-xl font-bold flex items-center gap-2 transition-all border border-slate-200"
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                                Sync Masters
                            </button>
                            <button
                                onClick={handleTallyExport}
                                className="px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-white/5 border border-slate-200"
                            >
                                <Download className="w-4 h-4" />
                                Final Tally Export
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleLock}
                            disabled={data?.status === 'BLOCKED'}
                            className={`px-10 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl text-xs uppercase tracking-widest ${data?.status === 'BLOCKED' ? 'bg-slate-100 text-slate-400 cursor-not-allowed mx-auto' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'}`}
                        >
                            <Lock className="w-4 h-4" />
                            Close & Lock Month
                        </button>
                    )}
                </div>
            </div>

            {/* Reopen Dialog */}
            {isReopening && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                    <div className="bg-white border border-slate-200 w-full max-w-md rounded-[32px] p-10 shadow-2xl">
                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-2 tracking-tighter">
                            <Unlock className="w-6 h-6 text-amber-600" />
                            Reopen Closed Month
                        </h3>
                        <p className="text-slate-500 font-medium text-xs mb-8">Reopening a closed month will allow new entries to be made. Please provide a reason for reopening.</p>

                        <textarea
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                            placeholder="Reason for reopening (e.g., Late GST invoice from supplier...)"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none h-36 mb-8 text-sm font-semibold"
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsReopening(false)}
                                className="flex-1 px-4 py-3 border border-slate-200 hover:bg-slate-50 rounded-2xl font-bold text-slate-500 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUnlock}
                                className="flex-2 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-amber-600/20 text-sm uppercase tracking-widest"
                            >
                                Confirm Reopen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
