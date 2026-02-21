"use client";

import React, { useState, useEffect } from "react";
import {
    ArrowLeftRight,
    TrendingDown,
    TrendingUp,
    PackageSearch,
    AlertCircle,
    Truck,
    CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function StockMovementsPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    // Form State
    const [movementType, setMovementType] = useState<"TRANSFER" | "IN" | "OUT">("TRANSFER");
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [fromWarehouse, setFromWarehouse] = useState("");
    const [toWarehouse, setToWarehouse] = useState("");
    const [notes, setNotes] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            const [prodRes, whRes] = await Promise.all([
                api.get("/inventory/products?limit=1000"), // Minimal pagination for now
                api.get("/inventory/warehouses"),
            ]);
            setProducts(prodRes.data.data || []);
            setWarehouses(whRes.data || []);
        } catch (err) {
            toast.error("Failed to load inventory data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
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
            loadData(); // Refresh stock caches
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to log movement");
        } finally {
            setSubmitting(false);
        }
    };

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
                                        const stockLoc = w.stocks?.find((s: any) => s.productId === productId);
                                        const qty = stockLoc ? Number(stockLoc.quantity) : 0;
                                        if (qty <= 0) return null;

                                        return (
                                            <div key={w.id} className="bg-slate-800/50 p-4 rounded-2xl flex justify-between items-center border border-slate-700/50">
                                                <span className="font-bold text-slate-100 text-sm">{w.name}</span>
                                                <span className="font-mono text-emerald-400 font-bold">{qty}</span>
                                            </div>
                                        );
                                    })}
                                    {!warehouses.some(w => w.stocks?.find((s: any) => s.productId === productId && Number(s.quantity) > 0)) && (
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
                            Transfers between warehouses do not affect the general ledger. However, manual Stock In/Out adjustments log directly to the global audit trail but do not currently auto-post to Cost of Goods Sold.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
