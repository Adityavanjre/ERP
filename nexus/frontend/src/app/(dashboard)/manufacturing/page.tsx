
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ManufacturingDashboard() {
    const [boms, setBoms] = useState<any[]>([]);
    const [workOrders, setWorkOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [selectedWO, setSelectedWO] = useState<any>(null);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [completionData, setCompletionData] = useState({
        producedQty: 0,
        scrapQty: 0,
        warehouseId: "",
        idempotencyKey: "",
    });

    const syncManufacturingData = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const [b, w, wh] = await Promise.all([
                api.get("manufacturing/boms"),
                api.get("manufacturing/work-orders"),
                api.get("inventory/warehouses"),
            ]);
            setBoms(b.data);
            setWorkOrders(w.data);
            setWarehouses(wh.data || []);
        } catch (err) {
            console.error("Manufacturing Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenComplete = (wo: any) => {
        setSelectedWO(wo);
        setCompletionData({
            producedQty: wo.quantity,
            scrapQty: 0,
            warehouseId: "",
            idempotencyKey: `wo-comp-${wo.id}-${Date.now()}`,
        });
        setShowCompleteModal(true);
    };

    const submitCompletion = async () => {
        if (!completionData.warehouseId) {
            toast.error("Please select a target warehouse");
            return;
        }
        try {
            await api.post(`/manufacturing/work-orders/${selectedWO.id}/complete`, {
                producedQty: Number(completionData.producedQty),
                scrapQty: Number(completionData.scrapQty),
                warehouseId: completionData.warehouseId,
                idempotencyKey: completionData.idempotencyKey,
            });
            toast.success("Production Completed! Inventory Updated.");
            setShowCompleteModal(false);
            syncManufacturingData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Production failed. Check raw materials.");
        }
    };

    useEffect(() => {
        syncManufacturingData(true);

        // CONTINUOUS BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncManufacturingData(false), 30000);
        return () => clearInterval(interval);
    }, []);

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
                        {workOrders.map((wo: any) => (
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
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] rounded-lg border-none uppercase">Level 1 Assembly</Badge>
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
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-xl bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-black text-slate-400">RC</div>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">3 Materials Used</span>
                                    </div>

                                    {wo.status !== 'Completed' ? (
                                        <button
                                            onClick={() => handleOpenComplete(wo)}
                                            className="w-full sm:w-auto justify-center px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/10 hover:shadow-emerald-500/20 active:scale-95"
                                        >
                                            Mark Complete
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <div className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
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
                        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Production Stats</h2>
                        <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 p-8 rounded-[40px] border-none group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                                <TrendingUp className="h-24 w-24 text-blue-900" />
                            </div>
                            <div className="space-y-8 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Avg. Completion Time</p>
                                    <p className="text-4xl font-black text-slate-900 tracking-tighter">14.2<span className="text-sm font-bold ml-1 text-slate-400">MINS</span></p>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Defect Rate</p>
                                    <p className="text-4xl font-black text-emerald-600 tracking-tighter">0.8<span className="text-sm font-bold ml-1">%</span></p>
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

            {/* Completion Modal */}
            <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
                <DialogContent className="max-w-md bg-white border-none rounded-[32px] overflow-hidden p-0 shadow-2xl">
                    <div className="bg-emerald-600 p-8 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tight">Complete Production</DialogTitle>
                            <p className="text-emerald-100 font-bold uppercase text-[9px] tracking-widest mt-1 opacity-80">Finalizing WO-{selectedWO?.orderNumber}</p>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 text-slate-900">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Produced Quantity</Label>
                                    <Input
                                        type="number"
                                        value={completionData.producedQty}
                                        onChange={(e) => setCompletionData({ ...completionData, producedQty: Number(e.target.value) })}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black text-lg focus:ring-emerald-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scrap / Rejects</Label>
                                    <Input
                                        type="number"
                                        value={completionData.scrapQty}
                                        onChange={(e) => setCompletionData({ ...completionData, scrapQty: Number(e.target.value) })}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black text-lg text-rose-600 focus:ring-rose-500/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Warehouse</Label>
                                <Select value={completionData.warehouseId} onValueChange={(val) => setCompletionData({ ...completionData, warehouseId: val })}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold">
                                        <SelectValue placeholder="Select destination" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map((wh: any) => (
                                            <SelectItem key={wh.id} value={wh.id} className="font-bold">{wh.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="bg-emerald-50 p-4 rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                            <p className="text-[10px] font-bold text-emerald-900 leading-relaxed uppercase tracking-tight">
                                Finalizing will consume raw materials and add finished goods to selected warehouse.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-0 flex gap-3">
                        <button
                            onClick={() => setShowCompleteModal(false)}
                            className="flex-1 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all"
                        >
                            Abort
                        </button>
                        <button
                            onClick={submitCompletion}
                            className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Confirm Production
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

