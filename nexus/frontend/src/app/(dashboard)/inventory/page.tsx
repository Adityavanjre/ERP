
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Plus, Search, Filter, TrendingDown, Layers, Boxes, Sparkles, Brain, Clock, AlertCircle, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
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

export default function InventoryPage() {
    const { showConfirm, setUILocked } = useUX();
    const [products, setProducts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ totalProducts: 0, lowStock: 0, totalValue: 0 });
    const [forecast, setForecast] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        stock: 0,
        price: 0,
        costPrice: 0,
        category: "",
        hsnCode: "",
        gstRate: 0
    });

    useUnsavedChanges(showForm || formData.name !== "" || formData.sku !== "");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes, statsRes, aiRes] = await Promise.all([
                api.get(`/inventory/products?page=${page}&limit=50`),
                api.get("inventory/stats"),
                api.get("kernel/ai/inventory-forecast")
            ]);

            // Handle paginated response
            if (prodRes.data?.data) {
                setProducts(prodRes.data.data);
                setTotalPages(prodRes.data.meta?.totalPages || 1);
            } else {
                setProducts(Array.isArray(prodRes.data) ? prodRes.data : []); // Fallback
            }

            setStats(statsRes.data || { totalProducts: 0, lowStock: 0, totalValue: 0 });
            setForecast(aiRes.data || null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to sync inventory data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            setUILocked(true);
            const finalSku = formData.sku.trim() || `PRD-${Date.now().toString().slice(-6)}`;
            await api.post("inventory/products", {
                ...formData,
                sku: finalSku,
                stock: Number(formData.stock),
                price: Number(formData.price),
                costPrice: Number(formData.costPrice),
                gstRate: Number(formData.gstRate)
            });
            setShowForm(false);
            setFormData({ name: "", sku: "", stock: 0, price: 0, costPrice: 0, category: "", hsnCode: "", gstRate: 0 });
            toast.success("Product saved to database");
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Creation failed");
        } finally {
            setIsSubmitting(false);
            setUILocked(false);
        }
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
                    fetchData();
                } catch (err) {
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
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
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
                toast.success(`Processed: ${res.data.imported} assets imported`);
                if (res.data.failed > 0) {
                    toast.warning(`${res.data.failed} rows failed. Check console.`);
                    console.warn(res.data.errors);
                }
                fetchData();
            } catch (err) {
                toast.dismiss();
                toast.error("Bulk import failed");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Boxes className="mr-4 h-9 w-9 text-blue-600 shadow-sm" />
                        Asset Inventory
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage products, stock levels, and warehouse logistics.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Input type="file" accept=".csv" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        <Button className="rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm font-bold h-11 px-5">
                            <Upload className="mr-2 h-4 w-4" /> Bulk Import
                        </Button>
                    </div>
                    <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-lg shadow-blue-500/20 text-white h-11" onClick={() => setShowForm(!showForm)}>
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
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalProducts}</div>
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
                        <div className="text-3xl font-black text-orange-600 tracking-tighter">{stats.lowStock} Items</div>
                        <p className="text-xs text-slate-500 mt-2 font-bold tracking-tight">Requiring immediate replenishment</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Value</CardTitle>
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
                        <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Add a new product to your inventory</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Product Designation <span className="text-rose-500">*</span></Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Asset SKU (Unique)</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 font-mono" placeholder="AUTO_GEN" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Initial Inventory <span className="text-rose-500">*</span></Label>
                                <Input type="number" min="0" className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Category</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Selling Price (₹) <span className="text-rose-500">*</span></Label>
                                <Input type="number" min="0" step="0.01" className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Procurement Cost</Label>
                                <Input type="number" min="0" step="0.01" className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">HSN Classification</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 font-mono uppercase" placeholder="e.g. 8517" value={formData.hsnCode} onChange={e => setFormData({ ...formData, hsnCode: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Tax (GST %) Rate</Label>
                                <Input type="number" min="0" max="100" step="0.01" className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11" placeholder="18" value={formData.gstRate} onChange={e => setFormData({ ...formData, gstRate: Number(e.target.value) })} />
                            </div>
                            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
                                <Button type="button" variant="ghost" className="text-slate-400 hover:text-slate-600 font-bold rounded-xl" onClick={() => setShowForm(false)}>Abort</Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-blue-500/10 px-10">
                                    {isSubmitting ? "Saving..." : "Add Product"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none border-t-4 border-t-amber-500">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                    <CardTitle className="text-slate-900 flex items-center gap-3 font-black">
                        <Brain className="h-5 w-5 text-amber-600" />
                        Predictive Supply Intelligence
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">AI-driven forecasting and consumption rates</CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {Array.isArray(forecast?.recommendations) && forecast.recommendations.slice(0, 4).map((rec: any, i: number) => (
                            <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4 relative overflow-hidden group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all border-b-2 border-b-transparent hover:border-b-blue-500">
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">SKU-{rec.sku.slice(-4).toUpperCase()}</p>
                                        <h4 className="text-sm font-black text-slate-900 truncate max-w-[140px]">{rec.name}</h4>
                                    </div>
                                    <Badge variant="outline" className={rec.recommendation === 'Urgent Reorder'
                                        ? "border-rose-200 text-rose-600 bg-rose-50 font-black text-[9px] rounded-lg border-none"
                                        : "border-emerald-200 text-emerald-600 bg-emerald-50 font-black text-[9px] rounded-lg border-none"}>
                                        {rec.recommendation.toUpperCase()}
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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
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
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">SKU</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Product Name</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Category</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Stock Level</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Unit Price</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Total Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(filteredProducts || []).map((p) => (
                                <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                    <TableCell className="pl-8 font-black text-[10px] text-blue-600 tracking-widest bg-slate-50/30 group-hover:bg-blue-50/30 transition-all">#{p.sku.toUpperCase()}</TableCell>
                                    <TableCell className="font-black text-slate-900 tracking-tight">{p.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1.5">
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] rounded-md border-none w-fit uppercase tracking-tighter shadow-none">{p.category || "GENERAL"}</Badge>
                                            {p.hsnCode && <span className="text-[10px] text-slate-400 font-bold tracking-tighter">HSN {p.hsnCode} • {p.gstRate}% TAX</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-2 min-w-[140px]">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                <span className="text-slate-400">{p.stock} UNITS</span>
                                                <span className={p.stock <= 10 ? "text-rose-500" : "text-emerald-600"}>
                                                    {p.stock <= 10 ? "CRITICAL" : "HEALTHY"}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${p.stock <= 10 ? 'bg-rose-500' : 'bg-blue-600'}`}
                                                    style={{ width: `${Math.min(100, (p.stock / 50) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600 font-bold">₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex items-center justify-end gap-6">
                                            <div className="font-black text-slate-900 tracking-tighter">
                                                ₹{(Number(p.price) * p.stock).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                onClick={() => handleDelete(p.id)}
                                            >
                                                <Plus className="h-4 w-4 rotate-45" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-black uppercase tracking-widest bg-slate-50/10">
                                        No assets found matching the current search.
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
        </div>
    );
}

function AlertTriangleIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    )
}
