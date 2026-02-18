
"use client";

import React, { useState, useEffect } from "react";
import {
    Factory,
    Package,
    Settings,
    CheckCircle2,
    AlertCircle,
    Play,
    Plus,
    ArrowRight,
    TrendingUp,
    Boxes
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function ManufacturingDashboard() {
    const [boms, setBoms] = useState<any[]>([]);
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const syncProductionLogic = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const [b, w] = await Promise.all([
                api.get("manufacturing/boms"),
                api.get("manufacturing/work-orders")
            ]);
            setBoms(b.data);
            setWorkOrders(w.data);
        } catch (err) {
            console.error("Production Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncProductionLogic(true);

        // CONTINUOUS BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncProductionLogic(false), 30000);
        return () => clearInterval(interval);
    }, []);

    const completeWO = async (id: string) => {
        try {
            await api.post(`/manufacturing/work-orders/${id}/complete`, {});
            toast.success("Production Completed! Inventory Updated.");
            // Refresh
            const res = await api.get("manufacturing/work-orders");
            setWorkOrders(res.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Production failed. Check raw materials.");
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">Warming up Manufacturing Engine</p>
            </div>
        </div>
    );

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Factory className="mr-4 h-9 w-9 text-emerald-600 shadow-sm" />
                        Nexus Production Overview
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Monitor and manage high-velocity logic execution loops.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.href = '/manufacturing/bom'}
                        className="px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 text-slate-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Settings className="w-4 h-4" />
                        Configure Logic Structs
                    </button>
                    <button
                        onClick={() => window.location.href = '/manufacturing/orders'}
                        className="px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Execute Production Node
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* WIP Work Orders */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Execution Queues
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {workOrders.map((wo: any) => (
                            <div key={wo.id} className="bg-white border border-slate-200 p-8 rounded-[32px] hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/5 transition-all group overflow-hidden relative border-none shadow-xl shadow-slate-200/40">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 opacity-0 group-hover:opacity-100 blur-[80px] transition-all -z-0"></div>

                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex gap-8 items-center">
                                        <div className={cn(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center transition-all",
                                            wo.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                                        )}>
                                            {wo.status === 'Completed' ? <CheckCircle2 className="w-8 h-8" /> : <Boxes className="w-8 h-8" />}
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] block mb-1">WO-{wo.orderNumber}</span>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{wo.bom?.product?.name}</h3>
                                            <div className="flex items-center gap-3 mt-2">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] rounded-lg border-none uppercase">Level 1 Assembly</Badge>
                                                {wo.status !== 'Completed' && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse italic">In Production</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">x{wo.quantity}</span>
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Projected Output</p>
                                    </div>
                                </div>

                                <div className="mt-10 pt-8 border-t border-slate-100 flex justify-between items-center relative z-10">
                                    <div className="flex gap-5 items-center">
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-xl bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-slate-400">RC</div>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">3 Resource Nodes Linked</span>
                                    </div>

                                    {wo.status !== 'Completed' ? (
                                        <button
                                            onClick={() => completeWO(wo.id)}
                                            className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/10 hover:shadow-emerald-500/20 active:scale-95"
                                        >
                                            Finalize Logic Loop
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Production Completed</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOM Registry & Stats */}
                <div className="space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Execution Efficiency</h2>
                        <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 p-8 rounded-[40px] border-none group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                                <TrendingUp className="h-24 w-24 text-blue-900" />
                            </div>
                            <div className="space-y-8 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Mean Execution Latency</p>
                                    <p className="text-4xl font-black text-slate-900 tracking-tighter">14.2<span className="text-sm font-bold ml-1 text-slate-400">MINS</span></p>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Entropy Loss</p>
                                    <p className="text-4xl font-black text-emerald-600 tracking-tighter">0.8<span className="text-sm font-bold ml-1">%</span></p>
                                </div>
                            </div>
                        </Card>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Logic Struct Registry (BOM)</h2>
                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{boms.length} BOMs</span>
                        </div>
                        <div className="space-y-3">
                            {boms.map((bom: any) => (
                                <div key={bom.id} className="bg-white border border-slate-100 p-5 rounded-3xl flex justify-between items-center group hover:bg-slate-50 cursor-pointer transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 shadow-sm">
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
                </div>

            </div>
        </div>
    );
}

