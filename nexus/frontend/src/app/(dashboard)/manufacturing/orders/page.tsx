"use client";

import React, { useState, useEffect } from "react";
import {
    Factory,
    Plus,
    Search,
    Calendar,
    Clock,
    Boxes,
    BadgeCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateWorkOrderDialog } from "@/components/manufacturing/create-work-order-dialog";
import { CompleteWorkOrderDialog } from "@/components/manufacturing/complete-work-order-dialog";

interface WorkOrder {
    id: string;
    orderNumber: string;
    priority: string;
    quantity: number;
    status: string;
    startDate?: string;
    dueDate?: string;
    bom?: {
        name: string;
        product?: {
            name: string;
        };
    };
    producedQuantity?: number;
    scrapQuantity?: number;
    machineTimeHours?: number;
}

export default function WorkOrdersPage() {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const syncExecutionQueues = React.useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await api.get("manufacturing/work-orders");
            setWorkOrders(res.data);
        } catch {
            // Suppressed in prod: Execution Queue sync failed silently
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        syncExecutionQueues(true);
        const interval = setInterval(() => syncExecutionQueues(false), 30000);
        return () => clearInterval(interval);
    }, [syncExecutionQueues]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Completed':
                return <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-lg">Completed</Badge>;
            case 'InProgress':
                return <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-lg animate-pulse">In Production</Badge>;
            case 'Planned':
                return <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px] uppercase tracking-tighter rounded-lg">Planned</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px] uppercase tracking-tighter rounded-lg">{status}</Badge>;
        }
    };

    const filteredOrders = workOrders.filter(wo =>
        wo.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wo.bom?.product?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <LoadingSpinner className="h-full" text="Loading work orders..." />;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 w-full max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Factory className="mr-4 h-9 w-9 text-emerald-600 shadow-sm" />
                        Work Orders
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Create and track work orders for your production runs.</p>
                </div>
                <CreateWorkOrderDialog refreshData={() => syncExecutionQueues(false)}>
                    <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold px-8 shadow-lg shadow-emerald-500/20 text-white h-11">
                        <Plus className="mr-2 h-4 w-4" /> New Work Order
                    </Button>
                </CreateWorkOrderDialog>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Active Orders</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">
                            {workOrders.filter(wo => wo.status !== 'Completed').length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Completed Today</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">
                            {workOrders.filter(wo => wo.status === 'Completed').length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Avg. Efficiency</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">
                            {(() => {
                                const completedOrders = workOrders.filter(wo => wo.status === 'Completed' && wo.producedQuantity && wo.producedQuantity > 0);
                                if (completedOrders.length === 0) return "100%";
                                let totalProduced = 0;
                                let totalScrap = 0;
                                completedOrders.forEach(wo => {
                                    totalProduced += Number(wo.producedQuantity) || 0;
                                    totalScrap += Number(wo.scrapQuantity) || 0;
                                });
                                const efficiency = totalProduced / (totalProduced + totalScrap) * 100;
                                return `${efficiency.toFixed(1)}%`;
                            })()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 md:py-8 px-4 md:px-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                        <div>
                            <CardTitle className="text-slate-900 text-xl font-black">Work Orders</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">History of all production runs</CardDescription>
                        </div>
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by Order ID or Product..."
                                className="pl-12 bg-white border-slate-200 text-slate-900 rounded-2xl h-12 shadow-inner font-semibold focus:ring-blue-500/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">Order ID</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Finished Product</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Quantity</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Timeline</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.map((wo) => (
                                <TableRow key={wo.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                    <TableCell className="pl-8">
                                        <div className="font-black text-blue-600 tracking-widest text-[11px]">WO-{wo.orderNumber}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">PRIORITY: {wo.priority.toUpperCase()}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Boxes className="h-4 w-4" />
                                            </div>
                                            <div className="font-bold text-slate-900 text-sm">{wo.bom?.product?.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-black text-slate-900">x{wo.quantity}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase">Planned Units</div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(wo.status)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-[10px] text-slate-500 font-bold">
                                            <Calendar className="h-3 w-3 mr-2" />
                                            {wo.startDate ? new Date(wo.startDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                        <div className="flex items-center text-[9px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">
                                            <Clock className="h-3 w-3 mr-1" /> {wo.machineTimeHours ? `${wo.machineTimeHours}h Logged` : 'Pending Time'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        {wo.status !== 'Completed' ? (
                                            <CompleteWorkOrderDialog workOrder={wo} refreshData={() => syncExecutionQueues(true)}>
                                                <Button
                                                    className="bg-slate-900 hover:bg-emerald-600 text-white font-bold h-9 rounded-xl px-5 text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/10"
                                                >
                                                    Mark Complete
                                                </Button>
                                            </CompleteWorkOrderDialog>
                                        ) : (
                                            <div className="flex items-center justify-end text-emerald-600">
                                                <BadgeCheck className="h-5 w-5" />
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredOrders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold italic bg-slate-50/10 uppercase tracking-widest text-[10px]">
                                        No Production Orders found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
