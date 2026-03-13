
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Factory,
    Package,
    Settings,
    CheckCircle2,
    Plus,
    ArrowRight,
    TrendingUp,
    Boxes,
    Cpu,
    Play,
    AlertTriangle,
    Activity,
    History
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CompleteWorkOrderDialog } from "@/components/manufacturing/complete-work-order-dialog";
import { StartProductionDialog } from "@/components/manufacturing/start-production-dialog";


interface BOMItem {
    id: string;
}

interface BOM {
    id: string;
    name: string;
    items?: BOMItem[];
    product?: {
        name: string;
    };
}

interface WorkOrder {
    id: string;
    orderNumber: string;
    quantity: number;
    status: string;
    bom?: BOM;
}



export default function ManufacturingDashboard() {
    const [boms, setBoms] = useState<BOM[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [machines, setMachines] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [startingWo, setStartingWo] = useState<WorkOrder | null>(null);
    const router = useRouter();

    const syncManufacturingData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const [overview, act] = await Promise.all([
                api.get("manufacturing/overview"),
                api.get("analytics/activity?limit=5")
            ]);
            const { boms, workOrders, machines } = overview.data;
            setBoms(boms);
            setWorkOrders(workOrders);
            setMachines(machines);
            setActivity((act.data || []).filter((a: any) => a.module === 'manufacturing' || a.action.includes('STOCK') || a.action.includes('WO')));
        } catch {
            // Suppressed in prod: Manufacturing sync failed silently
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        syncManufacturingData(true);

        // CONTINUOUS BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncManufacturingData(false), 30000);
        return () => clearInterval(interval);
    }, [syncManufacturingData]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">Loading Manufacturing Data...</p>
            </div>
        </div>
    );

    return (
        <div className="flex-1 space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Factory className="mr-4 h-9 w-9 text-emerald-600 shadow-sm" />
                        Manufacturing
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Monitor and manage your production orders and materials.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                        onClick={() => router.push('/manufacturing/bom')}
                        className="flex-1 md:flex-none justify-center px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 text-slate-600 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
                    >
                        <Settings className="w-4 h-4" />
                        Bill of Materials
                    </button>
                    <button
                        onClick={() => router.push('/manufacturing/machines')}
                        className="flex-1 md:flex-none justify-center px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 text-slate-600 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
                    >
                        <Cpu className="w-4 h-4 shadow-sm" />
                        Machines
                    </button>
                    <button
                        onClick={() => router.push('/manufacturing/orders')}
                        className="flex-1 md:flex-none justify-center px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        New Work Order
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* WIP Work Orders */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Active Work Orders
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {workOrders.map((wo: WorkOrder) => (
                            <div key={wo.id} className="bg-white border border-slate-200 p-8 rounded-[32px] hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all group overflow-hidden relative border-none shadow-xl shadow-slate-200/40">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 opacity-0 group-hover:opacity-100 blur-[80px] transition-all -z-0"></div>

                                <div className="flex flex-col sm:flex-row justify-between items-start relative z-10 gap-4 sm:gap-0">
                                    <div className="flex gap-4 sm:gap-8 items-start sm:items-center">
                                        <div className={cn(
                                            "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all shrink-0",
                                            wo.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                                        )}>
                                            {wo.status === 'Completed' ? <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" /> : <Boxes className="w-6 h-6 sm:w-8 sm:h-8" />}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] block mb-1">WO-{wo.orderNumber}</span>
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{wo.bom?.product?.name}</h3>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] rounded-lg border-none uppercase text-ellipsis overflow-hidden whitespace-nowrap max-w-[150px]">{wo.bom?.name || "Standard Unit"}</Badge>
                                                {wo.status !== 'Completed' && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse italic">In Production</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 ml-[4rem] sm:ml-0">
                                        <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter">x{wo.quantity}</span>
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Projected Output</p>
                                    </div>
                                </div>

                                <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-4 sm:gap-0">
                                    <div className="flex gap-3 sm:gap-5 items-center pl-[4rem] sm:pl-0">
                                        <div className="flex -space-x-3">
                                            {Array.from({ length: Math.min(wo.bom?.items?.length || 0, 3) }).map((_, i) => (
                                                <div key={i} className="w-8 h-8 rounded-xl bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-slate-400">RC</div>
                                            ))}
                                            {(wo.bom?.items?.length || 0) > 3 && (
                                                <div className="w-8 h-8 rounded-xl bg-emerald-50 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-emerald-600">
                                                    +{(wo.bom?.items?.length || 0) - 3}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{wo.bom?.items?.length || 0} Materials Used</span>
                                    </div>

                                    {wo.status === 'InProgress' ? (
                                        <CompleteWorkOrderDialog workOrder={wo} refreshData={() => syncManufacturingData(false)}>
                                            <button
                                                className="w-full sm:w-auto justify-center px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/10 hover:shadow-emerald-500/20 active:scale-95"
                                            >
                                                Mark Complete
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </CompleteWorkOrderDialog>
                                    ) : wo.status === 'Completed' ? (
                                        <div className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Production Completed</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setStartingWo(wo)}
                                            className="w-full sm:w-auto justify-center px-8 py-3 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-600 transition-all flex items-center gap-3 shadow-xl shadow-amber-500/20 active:scale-95"
                                        >
                                            Start Production
                                            <Play className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOM Registry & Stats */}
                <div className="space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Production Stats</h2>
                        <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 p-8 rounded-[40px] border-none group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                                <TrendingUp className="h-24 w-24 text-emerald-900" />
                            </div>
                            <div className="space-y-8 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Pending Production</p>
                                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                        {workOrders.filter(w => w.status !== 'Completed').length}
                                        <span className="text-sm font-bold ml-2 text-slate-400">ORDERS</span>
                                    </p>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Total Output units</p>
                                    <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                                        {workOrders.filter((w: WorkOrder) => w.status === 'Completed').reduce((sum, w) => sum + w.quantity, 0).toLocaleString('en-IN')}
                                        <span className="text-sm font-bold ml-2">UNITS</span>
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Bill of Materials</h2>
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{boms.length} BOMs</span>
                        </div>
                        <div className="space-y-3">
                            {boms.map((bom: BOM) => (
                                <div
                                    key={bom.id}
                                    onClick={() => router.push(`/manufacturing/bom/${bom.id}`)}
                                    className="bg-white border border-slate-100 p-5 rounded-3xl flex justify-between items-center group hover:bg-slate-50 cursor-pointer transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 shadow-sm"
                                >
                                    <div className="flex gap-5 items-center">
                                        <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-white group-hover:shadow-inner group-hover:scale-110 transition-all">
                                            <Package className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 tracking-tight">{bom.name}</p>
                                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{bom.items?.length || 0} Components Required</p>
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                        <ArrowRight className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Machine Load</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {machines.map((m: any) => (
                                <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <div className={cn(
                                            "h-2 w-2 rounded-full",
                                            m.status === 'Running' ? 'bg-emerald-500 animate-pulse' : m.status === 'Idle' ? 'bg-slate-300' : 'bg-rose-500'
                                        )} />
                                        <span className="text-[8px] font-black uppercase text-slate-400">{m.status}</span>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-800 line-clamp-1">{m.name}</p>
                                </div>
                            ))}
                            {machines.length === 0 && <p className="col-span-2 text-[10px] text-slate-400 italic text-center py-4">No machines registered</p>}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Recent Activity</h2>
                        <div className="space-y-2">
                            {activity.map((a: any, i) => (
                                <div key={i} className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded-xl transition-all">
                                    <div className="mt-1 p-1 bg-slate-100 rounded-lg">
                                        <History className="w-3 h-3 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-600 leading-tight">{a.action.replace(/_/g, ' ')}</p>
                                        <p className="text-[8px] text-slate-400 mt-0.5">{new Date(a.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                            {activity.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4">No recent activity</p>}
                        </div>
                    </section>
                </div>

            </div>

            <StartProductionDialog
                open={!!startingWo}
                onOpenChange={(open) => !open && setStartingWo(null)}
                workOrder={startingWo}
                onSuccess={() => syncManufacturingData(false)}
            />
        </div>
    );
}
