"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    ArrowLeftRight,
    TrendingDown,
    TrendingUp,
    PackageSearch,
    AlertCircle,
    Truck,
    CheckCircle2,
    Calendar,
    X
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";

interface MovementLog {
    id: string;
    type: string;
    quantity: number;
    notes?: string;
    createdAt: string;
    product?: { name: string; sku: string };
    warehouse?: { name: string };
    fromWarehouse?: { name: string };
    toWarehouse?: { name: string };
}

interface MinimalProduct {
    id: string;
    name: string;
    sku: string;
}

interface StockLocation {
    productId: string;
    quantity: number | string;
}

interface MinimalWarehouse {
    id: string;
    name: string;
    stocks?: StockLocation[];
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export default function StockMovementsPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [products, setProducts] = useState<MinimalProduct[]>([]);
    const [warehouses, setWarehouses] = useState<MinimalWarehouse[]>([]);

    // Form State
    const [movementType, setMovementType] = useState<"TRANSFER" | "IN" | "OUT">("TRANSFER");
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [fromWarehouse, setFromWarehouse] = useState("");
    const [toWarehouse, setToWarehouse] = useState("");
    const [notes, setNotes] = useState("");

    // BUG-015 FIX: date filter state for movement log
    const [movements, setMovements] = useState<MovementLog[]>([]);
    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [prodRes, whRes, movRes] = await Promise.all([
                api.get("/inventory/products?limit=1000"),
                api.get("/inventory/warehouses"),
                api.get("/inventory/movements").catch(() => ({ data: [] }))
            ]);
            setProducts(prodRes.data.data || []);
            setWarehouses(whRes.data || []);
            setMovements(Array.isArray(movRes.data) ? movRes.data : (movRes.data?.data || []));
        } catch {
            toast.error("Failed to load inventory data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !quantity || Number(quantity) <= 0) {
            toast.error("Please select a product and enter a valid quantity.");
            return;
        }

        try {
            setSubmitting(true);
            if (movementType === "TRANSFER") {
                if (!fromWarehouse || !toWarehouse || fromWarehouse === toWarehouse) {
                    toast.error("Please select different source and destination warehouses.");
                    return;
                }
                await api.post("/inventory/transfers", {
                    productId,
                    fromWarehouseId: fromWarehouse,
                    toWarehouseId: toWarehouse,
                    quantity: Number(quantity),
                    notes
                });
            } else {
                if (!toWarehouse) {
                    toast.error("Please select a warehouse.");
                    return;
                }
                await api.post("/inventory/movements", {
                    productId,
                    warehouseId: toWarehouse,
                    quantity: Number(quantity),
                    type: movementType,
                    notes
                });
            }

            toast.success("Stock movement recorded successfully");
            // Reset form
            setQuantity("");
            setNotes("");
            loadData(); // Refresh stock caches + movement log
        } catch (err: unknown) {
            const error = err as ApiError;
            toast.error(error.response?.data?.message || "Failed to log movement");
        } finally {
            setSubmitting(false);
        }
    }, [productId, quantity, movementType, fromWarehouse, toWarehouse, notes, loadData]);

    if (loading) return <LoadingSpinner className="h-full" text="Loading inventory data..." />;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 w-full max-w-full overflow-hidden">
            <div>
                <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                    <ArrowLeftRight className="mr-4 h-9 w-9 text-blue-600 shadow-sm" />
                    Stock Movements
                </h2>
                <p className="text-slate-500 mt-2 font-medium">Log manual stock adjustments and inter-warehouse transfers.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Form Column */}
                <Card className="lg:col-span-2 border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-6 md:px-8">
                        <CardTitle className="text-xl font-black text-slate-900">Record Movement</CardTitle>
                        <CardDescription className="font-bold uppercase tracking-widest text-[10px] text-slate-500 mt-1">
                            Select movement type and details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Type Selection */}
                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setMovementType("TRANSFER")}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${movementType === "TRANSFER"
                                        ? "border-blue-600 bg-blue-50/50 text-blue-700 shadow-inner"
                                        : "border-slate-100 hover:border-slate-300 text-slate-500 bg-white"
                                        }`}
                                >
                                    <Truck className="h-6 w-6 mb-2" />
                                    <span className="font-bold text-xs uppercase tracking-wider">Transfer</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementType("IN")}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${movementType === "IN"
                                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-700 shadow-inner"
                                        : "border-slate-100 hover:border-slate-300 text-slate-500 bg-white"
                                        }`}
                                >
                                    <TrendingUp className="h-6 w-6 mb-2" />
                                    <span className="font-bold text-xs uppercase tracking-wider">Stock In</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMovementType("OUT")}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${movementType === "OUT"
                                        ? "border-red-600 bg-red-50/50 text-red-700 shadow-inner"
                                        : "border-slate-100 hover:border-slate-300 text-slate-500 bg-white"
                                        }`}
                                >
                                    <TrendingDown className="h-6 w-6 mb-2" />
                                    <span className="font-bold text-xs uppercase tracking-wider">Stock Out</span>
                                </button>
                            </div>

                            {/* Product Selection */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Product</Label>
                                    <Select value={productId} onValueChange={setProductId}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-inner font-medium text-slate-900 border-2">
                                            <SelectValue placeholder="Select a product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map((p) => (
                                                <SelectItem key={p.id} value={p.id} className="font-medium">
                                                    {p.name} <span className="text-slate-400 font-mono ml-2 text-xs">{p.sku}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    {movementType === "TRANSFER" && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Source Warehouse</Label>
                                            <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-inner font-medium text-slate-900 border-2">
                                                    <SelectValue placeholder="Select source" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {warehouses.map((w) => (
                                                        <SelectItem key={w.id} value={w.id} className="font-medium">
                                                            {w.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                            {movementType === "TRANSFER" ? "Destination Warehouse" : "Warehouse"}
                                        </Label>
                                        <Select value={toWarehouse} onValueChange={setToWarehouse}>
                                            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-inner font-medium text-slate-900 border-2">
                                                <SelectValue placeholder="Select destination" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {warehouses.map((w) => (
                                                    <SelectItem key={w.id} value={w.id} className="font-medium">
                                                        {w.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Quantity</Label>
                                        <Input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-inner font-mono text-lg text-slate-900 border-2"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Notes / Reference</Label>
                                        <Input
                                            placeholder="Optional remarks"
                                            className="h-12 rounded-xl border-slate-200 bg-slate-50 shadow-inner font-medium text-slate-900 border-2"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wide shadow-lg shadow-blue-500/30"
                            >
                                {submitting ? (
                                    <LoadingSpinner text="Processing..." />
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-5 w-5" /> Execute Movement
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Info Column */}
                <div className="space-y-6">
                    <Card className="bg-slate-900 text-white rounded-3xl border-none shadow-xl shadow-slate-900/10 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <PackageSearch className="h-32 w-32" />
                        </div>
                        <CardHeader className="relative z-10 pb-2">
                            <CardTitle className="text-xl font-black text-white">Stock Availability</CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 text-slate-400 font-medium">
                            <p className="text-sm">
                                Select a product to view its current stock availability across all your registered warehouses.
                            </p>
                            {productId && (
                                <div className="mt-6 space-y-4">
                                    {warehouses.map(w => {
                                        // Find stock for selected product in this warehouse
                                        const stockLoc = w.stocks?.find((s: StockLocation) => s.productId === productId);
                                        const qty = stockLoc ? Number(stockLoc.quantity) : 0;
                                        if (qty <= 0) return null;

                                        return (
                                            <div key={w.id} className="bg-slate-800/50 p-4 rounded-2xl flex justify-between items-center border border-slate-700/50">
                                                <span className="font-bold text-slate-100 text-sm">{w.name}</span>
                                                <span className="font-mono text-emerald-400 font-bold">{qty}</span>
                                            </div>
                                        );
                                    })}
                                    {!warehouses.some(w => w.stocks?.find((s: StockLocation) => s.productId === productId && Number(s.quantity) > 0)) && (
                                        <div className="text-xs font-bold text-rose-400 uppercase tracking-widest bg-rose-500/10 p-4 rounded-xl text-center">
                                            No stock available in any warehouse
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="bg-amber-50 rounded-3xl p-6 border-2 border-amber-200 flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-amber-900 text-sm font-medium">
                            <strong className="block text-amber-950 font-black mb-1">Financial Impact</strong>
                            Transfers between warehouses do not affect the general ledger. Manual Stock In/Out adjustments <b>automatically post</b> to the Inventory Adjustment account for audit compliance.
                        </div>
                    </div>
                </div>
            </div>

            {/* BUG-015 FIX: Date-filtered movement history */}
            <Card className="border-none shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-6 md:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900">Movement History</CardTitle>
                            <CardDescription className="font-bold uppercase tracking-widest text-[10px] text-slate-500 mt-1">
                                Filter by date range
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                <Input
                                    type="date"
                                    value={filterFrom}
                                    onChange={(e) => setFilterFrom(e.target.value)}
                                    className="h-9 w-36 rounded-xl border-slate-200 text-sm"
                                />
                                <span className="text-slate-400 text-xs font-bold">to</span>
                                <Input
                                    type="date"
                                    value={filterTo}
                                    onChange={(e) => setFilterTo(e.target.value)}
                                    className="h-9 w-36 rounded-xl border-slate-200 text-sm"
                                />
                            </div>
                            {(filterFrom || filterTo) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setFilterFrom(""); setFilterTo(""); }}
                                    className="h-9 px-3 text-slate-400 hover:text-slate-700 rounded-xl"
                                >
                                    <X className="h-4 w-4 mr-1" /> Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {(() => {
                        const filtered = movements.filter(m => {
                            const d = new Date(m.createdAt);
                            if (filterFrom && d < new Date(filterFrom)) return false;
                            if (filterTo && d > new Date(filterTo + "T23:59:59")) return false;
                            return true;
                        });
                        if (filtered.length === 0) {
                            return (
                                <div className="h-32 flex items-center justify-center text-slate-400 font-bold text-sm">
                                    {movements.length === 0 ? "No movements recorded yet." : "No movements in selected date range."}
                                </div>
                            );
                        }
                        return (
                            <Table className="min-w-[600px]">
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Type</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Product</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Warehouse</TableHead>
                                        <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Qty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((m) => (
                                        <TableRow key={m.id} className="border-slate-50 hover:bg-slate-50/50">
                                            <TableCell className="pl-8 text-slate-500 text-xs font-bold">
                                                {new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`text-[9px] font-black uppercase rounded-lg border-none ${m.type === 'IN' ? 'bg-emerald-50 text-emerald-700' :
                                                        m.type === 'OUT' ? 'bg-rose-50 text-rose-700' :
                                                            'bg-blue-50 text-blue-700'
                                                    }`}>{m.type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900 text-sm">
                                                {m.product?.name || '—'}
                                                {m.product?.sku && <span className="text-slate-400 font-mono text-[10px] ml-2">{m.product.sku}</span>}
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-sm font-medium">
                                                {m.type === 'TRANSFER'
                                                    ? `${m.fromWarehouse?.name || '?'} → ${m.toWarehouse?.name || '?'}`
                                                    : (m.warehouse?.name || '—')}
                                            </TableCell>
                                            <TableCell className="text-right pr-8 font-black text-slate-900 tabular-nums">
                                                {m.quantity}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        );
                    })()}
                </CardContent>
            </Card>
        </div>
    );
}
