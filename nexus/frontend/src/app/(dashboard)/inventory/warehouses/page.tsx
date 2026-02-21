
"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
    LayoutGrid,
    Plus,
    MapPin,
    User,
    Package,
    ArrowRightLeft,
    ChevronRight,
    Search,
    Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'react-hot-toast';
import { CreateWarehouseDialog } from '@/components/inventory/create-warehouse-dialog';
import { EditWarehouseDialog } from '@/components/inventory/edit-warehouse-dialog';
import { TransferStockDialog } from '@/components/inventory/transfer-stock-dialog';
import { WarehouseDetailsDialog } from '@/components/inventory/warehouse-details-dialog';
import { Edit2 } from 'lucide-react';

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
    const [transferringWarehouse, setTransferringWarehouse] = useState<any>(null);
    const [detailsWarehouse, setDetailsWarehouse] = useState<any>(null);

    const syncWarehouses = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await api.get('inventory/warehouses');
            setWarehouses(res.data);
        } catch (err) {
            console.error("Warehouse Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncWarehouses(true);

        // BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncWarehouses(false), 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 min-h-screen">
            <CreateWarehouseDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSuccess={() => syncWarehouses(false)}
            />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <LayoutGrid className="h-10 w-10 text-blue-600" />
                        Warehouse List
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2 ml-1">
                        Stock Storage & Distribution
                    </p>
                </div>
                <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 h-12 font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 gap-2"
                >
                    <Plus className="h-5 w-5" /> Add Warehouse
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    </div>
                ) : warehouses.length === 0 ? (
                    <Card className="col-span-full border-dashed border-2 border-slate-200 bg-white/50 py-12 text-center rounded-3xl">
                        <CardContent className="space-y-4">
                            <div className="bg-blue-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <LayoutGrid className="h-8 w-8 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">No warehouses added</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                Start by adding your first warehouse storage.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setIsAddDialogOpen(true)}
                                className="rounded-xl font-bold border-slate-200 hover:bg-white active:scale-95"
                            >
                                Add First Warehouse
                            </Button>
                        </CardContent>
                    </Card>
                ) : warehouses.map((w) => (
                    <Card key={w.id} className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden hover:scale-[1.02] transition-all group cursor-pointer border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="text-slate-900 font-black text-xl">{w.name}</CardTitle>
                                    <div className="flex items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider gap-1.5">
                                        <MapPin className="h-3 w-3" /> {w.location || 'No address set'}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingWarehouse(w);
                                        }}
                                        className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm border border-slate-100 transition-all"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <div className="bg-white p-2.5 rounded-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors border border-slate-100">
                                        <ChevronRight className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manager</div>
                                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                                        <User className="h-4 w-4 text-blue-500" />
                                        {w.manager || 'Unassigned'}
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stored Items</div>
                                    <div className="flex items-center justify-end gap-2 text-slate-900 font-black text-lg">
                                        <Package className="h-5 w-5 text-orange-500" />
                                        {w.stocks?.length || 0}
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100" />

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTransferringWarehouse(w);
                                    }}
                                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 font-bold text-xs transition-colors"
                                >
                                    <ArrowRightLeft className="h-4 w-4" /> Transfer
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailsWarehouse(w);
                                    }}
                                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-xs transition-colors"
                                >
                                    Details
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <EditWarehouseDialog
                open={!!editingWarehouse}
                onOpenChange={(open) => !open && setEditingWarehouse(null)}
                warehouse={editingWarehouse}
                onSuccess={() => syncWarehouses(false)}
            />
            <TransferStockDialog
                open={!!transferringWarehouse}
                onOpenChange={(open) => !open && setTransferringWarehouse(null)}
                sourceWarehouse={transferringWarehouse}
                onSuccess={() => syncWarehouses(true)}
            />
            <WarehouseDetailsDialog
                open={!!detailsWarehouse}
                onOpenChange={(open) => !open && setDetailsWarehouse(null)}
                warehouse={detailsWarehouse}
            />
        </div>
    );
}
