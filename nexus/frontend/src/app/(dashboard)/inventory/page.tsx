
"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package, Plus, Search, Filter, TrendingDown, Layers, Boxes, AlertCircle, Upload, Edit3, Clock, Tags, Scale, Brain } from "lucide-react";
import { OpeningBalanceDialog } from "@/components/accounting/opening-balance-dialog";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useUX } from "@/components/providers/ux-provider";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

interface Product {
    id: string;
    name: string;
    sku: string;
    stock: number;
    price: number;
    costPrice: number;
    category: string;
    tags: string;
    brand: string;
    manufacturer: string;
    minStockLevel: number;
    hsnCode: string;
    gstRate: number;
    description: string;
    barcode: string;
    isService: boolean;
    updatedAt: string;
    updatedBy?: {
        fullName: string;
    };
}

interface InventoryStats {
    totalProducts: number;
    lowStock: number;
    totalValue: number;
}

interface ForecastRecommendation {
    sku: string;
    name: string;
    recommendation: string;
    velocity: string;
    daysRemaining: number;
    predictedShortage?: string;
}

interface InventoryForecast {
    recommendations: ForecastRecommendation[];
}

interface WakeupError extends Error {
    isWakeup?: boolean;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export default function InventoryPage() {
    const { showConfirm, setUILocked } = useUX();
    const [products, setProducts] = useState<Product[]>([]);
    const [stats, setStats] = useState<InventoryStats>({ totalProducts: 0, lowStock: 0, totalValue: 0 });
    const [forecast, setForecast] = useState<InventoryForecast | null>(null);
    const [, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [obProduct, setObProduct] = useState<Product | null>(null);
    const [mounted, setMounted] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        stock: 0,
        price: 0,
        costPrice: 0,
        category: "",
        tags: "",
        brand: "",
        manufacturer: "",
        minStockLevel: 0,
        hsnCode: "",
        gstRate: 0,
        description: "",
        barcode: "",
        isService: false
    });

    useUnsavedChanges(showForm || formData.name !== "" || formData.sku !== "");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const syncInventory = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            setFetchError(null);
            const [prodRes, statsRes, aiRes] = await Promise.all([
                api.get(`/inventory/products?page=${page}&limit=50`),
                api.get("inventory/stats"),
                api.get("system/ai/inventory-forecast")
            ]);

            if (prodRes.data?.data) {
                setProducts(prodRes.data.data);
                setTotalPages(prodRes.data.meta?.totalPages || 1);
            } else {
                setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
            }

            setStats(statsRes.data || { totalProducts: 0, lowStock: 0, totalValue: 0 });
            setForecast(aiRes.data || null);
        } catch (err: unknown) {
            // Suppressed in prod: Inventory sync failed silently
            const error = err as WakeupError;
            const msg = error.isWakeup ? error.message : "Inventory update interrupted";
            setFetchError(msg);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        setMounted(true);
        syncInventory(true);

        // CONTINUOUS BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncInventory(false), 30000);
        return () => clearInterval(interval);
    }, [syncInventory]);

    if (!mounted) return null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            setUILocked(true);
            const finalSku = formData.sku.trim() || `PRD-${Date.now().toString().slice(-6)}`;

            const payload = {
                ...formData,
                sku: finalSku,
                stock: Number(formData.stock),
                price: Number(formData.price),
                costPrice: Number(formData.costPrice),
                gstRate: Number(formData.gstRate),
                minStockLevel: Number(formData.minStockLevel)
            };

            await api.post("inventory/products", payload);

            setShowForm(false);
            setFormData({
                name: "", sku: "", stock: 0, price: 0, costPrice: 0, category: "",
                tags: "", brand: "", manufacturer: "", minStockLevel: 0, hsnCode: "", gstRate: 0,
                description: "", barcode: "", isService: false
            });
            toast.success("Product details updated");
            syncInventory(false);
        } catch (err: unknown) {
            const error = err as ApiError;
            toast.error(error.response?.data?.message || "Creation failed");
        } finally {
            setIsSubmitting(false);
            setUILocked(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        try {
            setIsSubmitting(true);
            setUILocked(true);

            const payload = {
                ...formData,
                stock: Number(formData.stock),
                price: Number(formData.price),
                costPrice: Number(formData.costPrice),
                gstRate: Number(formData.gstRate),
                minStockLevel: Number(formData.minStockLevel)
            };

            await api.patch(`/inventory/products/${editingProduct.id}`, payload);

            setEditingProduct(null);
            setFormData({
                name: "", sku: "", stock: 0, price: 0, costPrice: 0, category: "",
                tags: "", brand: "", manufacturer: "", minStockLevel: 0, hsnCode: "", gstRate: 0,
                description: "", barcode: "", isService: false
            });
            toast.success("Product updated");
            syncInventory(false);
        } catch (err: unknown) {
            const error = err as ApiError;
            toast.error(error.response?.data?.message || "Update failed");
        } finally {
            setIsSubmitting(false);
            setUILocked(false);
        }
    };

    const startEdit = (p: Product) => {
        setEditingProduct(p);
        setFormData({
            name: p.name || "",
            sku: p.sku || "",
            stock: Number(p.stock) || 0,
            price: Number(p.price) || 0,
            costPrice: Number(p.costPrice) || 0,
            category: p.category || "",
            tags: p.tags || "",
            brand: p.brand || "",
            manufacturer: p.manufacturer || "",
            minStockLevel: Number(p.minStockLevel) || 0,
            hsnCode: p.hsnCode || "",
            gstRate: Number(p.gstRate) || 0,
            description: p.description || "",
            barcode: p.barcode || "",
            isService: p.isService || false
        });
        setShowForm(false); // Close add form if open
    };

    const handleDelete = (id: string) => {
        showConfirm({
            title: "Delete Product?",
            description: "This will permanently delete the product. This action cannot be undone.",
            confirmText: "Delete",
            variant: "destructive",
            onConfirm: async () => {
                try {
                    setUILocked(true);
                    await api.delete(`/inventory/products/${id}`);
                    toast.success("Product deleted successfully");
                    syncInventory(false);
                } catch {
                    toast.error("Failed to delete product");
                } finally {
                    setUILocked(false);
                }
            }
        });
    };

    const filteredProducts = (products || []).filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.tags && p.tags.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csv = event.target?.result as string;
            try {
                if (typeof csv !== 'string') return;
                const loadingToast = toast.loading("Processing bulk import...");
                const res = await api.post("inventory/import", { csv });
                toast.dismiss(loadingToast);
                toast.success(`Processed: ${res.data.imported} products imported`);
                if (res.data.failed > 0) {
                    toast.warning(`${res.data.failed} rows failed. Check console.`);
                    // Suppressed in prod: import warnings
                }
                syncInventory(false);
            } catch {
                toast.dismiss();
                toast.error("Import failed");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 w-full max-w-full overflow-hidden">
            {fetchError && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 font-bold text-sm mb-4">
                    <AlertCircle className="w-5 h-5" />
                    {fetchError}
                    <Button variant="ghost" className="ml-auto text-rose-600 hover:bg-rose-100 rounded-xl" onClick={() => syncInventory(true)}>Retry</Button>
                </div>
            )}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Boxes className="mr-4 h-9 w-9 text-blue-600 shadow-sm shrink-0" />
                        <span className="truncate">Products & Inventory</span>
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium truncate">Manage your products, stock levels, and warehouse items.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                    <div className="relative flex-1 sm:flex-none">
                        <Input type="file" accept=".csv" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        <Button className="w-full justify-center rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm font-bold h-11 px-5 whitespace-nowrap">
                            <Upload className="mr-2 h-4 w-4" /> Import CSV
                        </Button>
                    </div>
                    <Button className="flex-1 sm:flex-none justify-center rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-lg shadow-blue-500/20 text-white h-11 whitespace-nowrap" onClick={() => setShowForm(!showForm)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Products</CardTitle>
                        <Layers className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalProducts} Items</div>
                        <p className="text-xs text-slate-500 mt-2 flex items-center font-bold">
                            <TrendingDown className="h-3 w-3 mr-1 text-emerald-500" />
                            Stable supply levels
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alerts</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-orange-600 tracking-tighter">{stats.lowStock ?? 0} Items</div>
                        <p className="text-xs text-slate-500 mt-2 font-bold tracking-tight">Requiring immediate replenishment</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Inventory Value</CardTitle>
                        <Package className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">₹{Number(stats.totalValue).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                        <p className="text-xs text-slate-500 mt-2 font-bold tracking-tight">Total stock valuation</p>
                    </CardContent>
                </Card>
            </div>

            {showForm && (
                <Card className="bg-white border-slate-200 shadow-2xl shadow-slate-200/50 rounded-3xl mb-8 animate-in fade-in slide-in-from-top-4 overflow-hidden border-t-4 border-t-blue-500">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                        <CardTitle className="text-slate-900 font-black text-xl">Add Product</CardTitle>
                        <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                            Add a new product to your inventory
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <form onSubmit={handleCreate} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-2 lg:col-span-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Product Name <span className="text-rose-500">*</span></Label>
                                    <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20 font-black" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Product SKU (Unique)</Label>
                                    <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 font-mono" placeholder="AUTO_GEN" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Stock Control <span className="text-rose-500">*</span></Label>
                                    <div className="flex gap-2">
                                        <NumericInput
                                            className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20"
                                            value={formData.stock}
                                            onChange={val => setFormData({ ...formData, stock: val })}
                                        />
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-11">
                                            <input type="checkbox" id="isService" checked={formData.isService} onChange={e => setFormData({ ...formData, isService: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                                            <label htmlFor="isService" className="text-[10px] font-black text-slate-500 uppercase">Service</label>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Brand / Manufacturer</Label>
                                    <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" placeholder="e.g. Klypso" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
                                </div>
                                <div className="space-y-2 text-rose-600 bg-rose-50/30 p-2 rounded-xl border border-rose-100/50">
                                    <Label className="text-rose-500 font-bold uppercase text-[10px] tracking-widest">Low Stock Alert Level</Label>
                                    <NumericInput
                                        className="bg-white/50 border-rose-100 text-rose-900 rounded-xl h-9 text-xs font-black"
                                        value={formData.minStockLevel}
                                        onChange={val => setFormData({ ...formData, minStockLevel: val })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Tags (Comma Separated)</Label>
                                    <div className="relative group">
                                        <Tags className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input className="pl-9 bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" placeholder="Tag 1, Tag 2..." value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Primary Category</Label>
                                    <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Manufacturer</Label>
                                    <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" placeholder="e.g. Acme Corp" value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Selling Price (₹) <span className="text-rose-500">*</span></Label>
                                    <NumericInput
                                        decimal
                                        className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20"
                                        value={formData.price}
                                        onChange={val => setFormData({ ...formData, price: val })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Purchase Price</Label>
                                    <NumericInput
                                        decimal
                                        className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20"
                                        value={formData.costPrice}
                                        onChange={val => setFormData({ ...formData, costPrice: val })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">HSN Classification</Label>
                                    <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 font-mono uppercase" placeholder="e.g. 8517" value={formData.hsnCode} onChange={e => setFormData({ ...formData, hsnCode: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Tax (GST %) Rate</Label>
                                    <NumericInput
                                        decimal
                                        className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11"
                                        placeholder="18"
                                        value={formData.gstRate}
                                        onChange={val => setFormData({ ...formData, gstRate: val })}
                                    />
                                </div>
                                <div className="lg:col-span-4 space-y-2">
                                    <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Description & Attributes</Label>
                                    <textarea
                                        className="w-full bg-slate-50 border-slate-200 text-slate-900 rounded-xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-sm transition-all"
                                        placeholder="Detailed specifications, warranty info, etc."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
                                <Button type="button" variant="ghost" className="text-slate-400 hover:text-slate-600 font-bold rounded-xl" onClick={() => { setShowForm(false); }}>Abort</Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-black h-11 rounded-xl shadow-lg shadow-blue-500/10 px-10">
                                    {isSubmitting ? "Syncing..." : "Register Product"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* EDIT PRODUCT DIALOG */}
            <Dialog open={!!editingProduct} onOpenChange={(open) => { if (!open) { setEditingProduct(null); setFormData({ name: "", sku: "", stock: 0, price: 0, costPrice: 0, category: "", tags: "", brand: "", manufacturer: "", minStockLevel: 0, hsnCode: "", gstRate: 0, description: "", barcode: "", isService: false }); } }}>
                <DialogContent className="sm:max-w-[780px] bg-white border-slate-200 text-slate-900 rounded-[28px] shadow-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4 border-b border-slate-100">
                        <DialogTitle className="text-slate-900 font-black text-xl">Edit Product</DialogTitle>
                        <DialogDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                            {editingProduct ? `Review/Update metadata for SKU ${editingProduct?.sku}` : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-6 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            <div className="space-y-2 lg:col-span-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Product Name <span className="text-rose-500">*</span></Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20 font-black" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Product Code (Unique)</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 font-mono" value={formData.sku} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Stock Control <span className="text-rose-500">*</span></Label>
                                <div className="flex gap-2">
                                    <NumericInput
                                        className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20"
                                        value={formData.stock}
                                        onChange={val => setFormData({ ...formData, stock: val })}
                                    />
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-11">
                                        <input type="checkbox" id="isServiceEdit" checked={formData.isService} onChange={e => setFormData({ ...formData, isService: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                                        <label htmlFor="isServiceEdit" className="text-[10px] font-black text-slate-500 uppercase">Service</label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Brand / Manufacturer</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
                            </div>
                            <div className="space-y-2 text-rose-600 bg-rose-50/30 p-2 rounded-xl border border-rose-100/50">
                                <Label className="text-rose-500 font-bold uppercase text-[10px] tracking-widest">Min Alert Stock Threshold</Label>
                                <NumericInput
                                    className="bg-white/50 border-rose-100 text-rose-900 rounded-xl h-9 text-xs font-black"
                                    value={formData.minStockLevel}
                                    onChange={val => setFormData({ ...formData, minStockLevel: val })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Tags (Comma Separated)</Label>
                                <div className="relative group">
                                    <Tags className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input className="pl-9 bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" placeholder="Tag 1, Tag 2..." value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Primary Category</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Manufacturer</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Selling Price (₹) <span className="text-rose-500">*</span></Label>
                                <NumericInput
                                    decimal
                                    className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20"
                                    value={formData.price}
                                    onChange={val => setFormData({ ...formData, price: val })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Purchase Price</Label>
                                <NumericInput
                                    decimal
                                    className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20"
                                    value={formData.costPrice}
                                    onChange={val => setFormData({ ...formData, costPrice: val })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">HSN Classification</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 font-mono uppercase" value={formData.hsnCode} onChange={e => setFormData({ ...formData, hsnCode: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Tax (GST %) Rate</Label>
                                <NumericInput
                                    decimal
                                    className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11"
                                    value={formData.gstRate}
                                    onChange={val => setFormData({ ...formData, gstRate: val })}
                                />
                            </div>
                            <div className="lg:col-span-4 space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Description & Attributes</Label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-sm transition-all"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <Button type="button" variant="ghost" className="text-slate-400 hover:text-slate-600 font-bold rounded-xl" onClick={() => { setEditingProduct(null); }}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-black h-11 rounded-xl shadow-lg shadow-blue-500/10 px-10">
                                {isSubmitting ? "Syncing..." : "Commit Changes"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none border-t-4 border-t-amber-500">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                    <CardTitle className="text-slate-900 flex items-center gap-3 font-black">
                        <Brain className="h-5 w-5 text-amber-600" />
                        Inventory Forecast
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Predictions and trends for stock levels</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {Array.isArray(forecast?.recommendations) && forecast.recommendations.slice(0, 4).map((rec: ForecastRecommendation, i: number) => (
                            <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4 relative overflow-hidden group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all border-b-2 border-b-transparent hover:border-b-blue-500">
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">SKU-{rec.sku.slice(-4).toUpperCase()}</p>
                                        <h4 className="text-sm font-black text-slate-900 truncate max-w-[140px]">{rec.name}</h4>
                                    </div>
                                    <Badge variant="outline" className={rec.recommendation === 'Urgent Reorder'
                                        ? "border-rose-200 text-rose-600 bg-rose-50 font-black text-[9px] rounded-lg border-none"
                                        : "border-emerald-200 text-emerald-600 bg-emerald-50 font-black text-[9px] rounded-lg border-none"}>
                                        {rec.recommendation === 'Urgent Reorder' ? 'RESTOCK' : 'STABLE'}
                                    </Badge>
                                </div>
                                <div className="space-y-2 relative z-10">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                        <span className="text-slate-400">Velocity</span>
                                        <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">{rec.velocity}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                                        <span className="text-slate-400">Runway</span>
                                        <span className={rec.daysRemaining < 7 ? "text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md" : "text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md"}>
                                            {rec.daysRemaining} Cycles
                                        </span>
                                    </div>
                                </div>
                                {rec.predictedShortage && (
                                    <div className="pt-3 border-t border-slate-100 flex items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest relative z-10">
                                        <Clock className="h-3 w-3 mr-2 text-rose-400" /> Out of stock by: {rec.predictedShortage}
                                    </div>
                                )}
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-all transform group-hover:scale-110 group-hover:rotate-12">
                                    <TrendingDown className="h-24 w-24 text-blue-900" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4">
                        <div>
                            <CardTitle className="text-slate-900 text-xl font-black">Product Inventory</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Complete list of items and current stock levels</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-full md:w-96 group">
                                <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    placeholder="Search by SKU or name..."
                                    className="pl-12 bg-white border-slate-200 text-slate-900 rounded-2xl h-12 shadow-inner font-semibold focus:ring-blue-500/20"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="ghost" size="icon" className="h-12 w-12 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none">
                    <Table className="min-w-[1000px]">
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">ID (SKU)</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Product Name</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Category</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Last Updated</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Inventory Status</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Price</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Total Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(filteredProducts || []).map((p: Product) => (
                                <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                    <TableCell className="pl-8 font-black text-[10px] text-blue-600 tracking-widest bg-slate-50/30 group-hover:bg-blue-50/30 transition-all">#{p.sku.toUpperCase()}</TableCell>
                                    <TableCell className="font-black text-slate-900 tracking-tight">{p.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1.5 min-w-[140px]">
                                            <div className="flex flex-wrap gap-1">
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-600 font-black text-[9px] rounded-md border-none uppercase tracking-tighter shadow-none">
                                                    {p.category || "GENERAL"}
                                                </Badge>
                                                {p.tags?.split(',').map((tag: string, idx: number) => (
                                                    <Badge key={idx} variant="outline" className="bg-slate-50 text-slate-400 font-bold text-[8px] rounded-md border-slate-200 uppercase tracking-tighter">
                                                        {tag.trim()}
                                                    </Badge>
                                                ))}
                                            </div>
                                            {p.hsnCode && <span className="text-[10px] text-slate-400 font-bold tracking-tighter">HSN {p.hsnCode} • {p.gstRate}% TAX</span>}
                                            {p.brand && <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Brand: {p.brand}</span>}
                                            {p.manufacturer && <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Mfr: {p.manufacturer}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-slate-900 font-black uppercase tracking-tighter">
                                                {p.updatedBy?.fullName || "System Admin"}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-bold flex items-center">
                                                <Clock className="h-2.5 w-2.5 mr-1" />
                                                {new Date(p.updatedAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2 min-w-[140px]">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                <span className="text-slate-400">{p.stock} UNITS</span>
                                                <span className={Number(p.stock) <= Number(p.minStockLevel || 10) ? "text-rose-500 animate-pulse" : "text-emerald-600"}>
                                                    {Number(p.stock) <= Number(p.minStockLevel || 10) ? "LOW STOCK" : "OPTIMUM"}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${Number(p.stock) <= Number(p.minStockLevel || 10) ? 'bg-rose-500' : 'bg-blue-600'}`}
                                                    style={{ width: `${Math.min(100, (Number(p.stock) / Math.max(50, Number(p.minStockLevel || 1) * 2)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600 font-bold">₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="font-black text-slate-900 tracking-tighter">
                                                ₹{(Number(p.price) * Number(p.stock)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                onClick={() => setObProduct(p)}
                                                title="Set Opening Balance"
                                            >
                                                <Scale className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                onClick={() => startEdit(p)}
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                onClick={() => handleDelete(p.id)}
                                            >
                                                <Plus className="h-3.5 w-3.5 rotate-45" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 border-none bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100">
                                                <Search className="h-8 w-8 text-slate-300" />
                                            </div>
                                            <div className="text-center space-y-1">
                                                <p className="text-slate-900 font-black tracking-tight text-lg">No Items Found</p>
                                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Adjust your search or filters to see results</p>
                                            </div>
                                            {searchQuery && (
                                                <Button variant="outline" className="mt-2 h-8 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-100" onClick={() => setSearchQuery("")}>
                                                    Clear Search Rules
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <div className="flex justify-between items-center px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-slate-500 hover:bg-white font-bold rounded-xl h-9">Previous</Button>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Page {page} / {totalPages}</span>
                        <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-slate-500 hover:bg-white font-bold rounded-xl h-9">Next</Button>
                    </div>
                </CardContent>
            </Card>
            <OpeningBalanceDialog
                isOpen={!!obProduct}
                onClose={() => setObProduct(null)}
                productId={obProduct?.id}
                targetName={obProduct?.name || ""}
                onSuccess={() => syncInventory(false)}
            />
        </div>
    );
}
