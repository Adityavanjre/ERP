
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Plus, ShoppingCart, TrendingUp, Package, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useUX } from "@/components/providers/ux-provider";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SalesOrder {
    id: string;
    createdAt: string;
    total: number | string;
    status: string;
    customer?: {
        firstName: string;
        lastName: string;
    };
}

interface SalesStats {
    totalRevenue: number;
    orderCount: number;
    pendingOrders: number;
}

interface SalesProduct {
    id: string;
    name: string;
    sku: string;
    price: number | string;
}

interface SalesCustomer {
    id: string;
    firstName: string;
    lastName: string;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export default function SalesPage() {
    const router = useRouter();
    const { setUILocked } = useUX();
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [stats, setStats] = useState<SalesStats>({ totalRevenue: 0, orderCount: 0, pendingOrders: 0 });
    const [loading, setLoading] = useState(true);

    // BUG-017 FIX: replaced single-item orderData with multi-item orderItems array
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [products, setProducts] = useState<SalesProduct[]>([]);
    const [customers, setCustomers] = useState<SalesCustomer[]>([]);
    const [customerId, setCustomerId] = useState("");
    const [orderItems, setOrderItems] = useState([{ productId: "", quantity: 1 }]);
    const [showConfirm, setShowConfirm] = useState(false);

    const addOrderItem = () => setOrderItems(prev => [...prev, { productId: "", quantity: 1 }]);
    const removeOrderItem = (i: number) => setOrderItems(prev => prev.filter((_, idx) => idx !== i));
    const updateOrderItem = (i: number, field: "productId" | "quantity", value: string | number) =>
        setOrderItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

    const resetForm = () => { setCustomerId(""); setOrderItems([{ productId: "", quantity: 1 }]); };

    const syncSalesData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const [orderRes, statsRes, prodRes, custRes] = await Promise.all([
                api.get("sales/orders"),
                api.get("sales/stats"),
                api.get("inventory/products"),
                api.get("crm/customers")
            ]);
            setOrders(Array.isArray(orderRes.data) ? orderRes.data : (orderRes.data.data || []));
            setStats(statsRes.data);
            setProducts(Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.data || []));
            setCustomers(Array.isArray(custRes.data) ? custRes.data : (custRes.data.data || []));
        } catch {
            // Suppressed in prod: Sales sync failed silently
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        syncSalesData(true);
        // CONTINUOUS BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncSalesData(false), 30000);
        return () => clearInterval(interval);
    }, [syncSalesData]);

    const submitOrder = useCallback(async () => {
        try {
            setIsSubmitting(true);
            setUILocked(true);
            const items = orderItems
                .filter(item => item.productId)
                .map(item => {
                    const p = (products || []).find(p => p.id === item.productId);
                    return { productId: item.productId, quantity: Number(item.quantity), price: p ? Number(p.price) : 0 };
                });
            await api.post("sales/orders", { customerId, items });
            setShowForm(false);
            resetForm();
            toast.success("Sales order processed successfully");
            syncSalesData();
        } catch (err: unknown) {
            const error = err as ApiError;
            toast.error(error.response?.data?.message || "Order processing failed");
        } finally {
            setIsSubmitting(false);
            setUILocked(false);
        }
    }, [orderItems, customerId, products, syncSalesData, setUILocked]);

    const handleConfirmSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const validItems = orderItems.filter(i => i.productId);
        if (!customerId || validItems.length === 0) {
            toast.error("Please select a customer and at least one product");
            return;
        }
        const orderTotal = validItems.reduce((sum, item) => {
            const p = (products || []).find(p => p.id === item.productId);
            return sum + (p ? Number(p.price) : 0) * Number(item.quantity);
        }, 0);
        if (orderTotal > 100000) {
            setShowConfirm(true);
        } else {
            submitOrder();
        }
    }, [orderItems, customerId, products, submitOrder]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Paid': return <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">Paid</Badge>;
            case 'Shipped': return <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">Shipped</Badge>;
            case 'Pending': return <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">Pending</Badge>;
            case 'Cancelled': return <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">Cancelled</Badge>;
            default: return <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">{status}</Badge>;
        }
    };

    if (loading) return <LoadingSpinner className="h-full" text="Loading Sales Data..." />;

    return (
        <div className="flex-1 space-y-6 md:space-y-10 pt-2 md:pt-8 px-4 md:px-8 bg-slate-50/30 w-full max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 flex items-center">
                        <div className="p-2 md:p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 mr-4 md:mr-5 shrink-0">
                            <ShoppingCart className="h-6 w-6 md:h-7 md:w-7 text-white" />
                        </div>
                        <span className="truncate">Sales Orders</span>
                    </h2>
                    <p className="text-slate-600 mt-3 md:mt-2 font-black uppercase text-[10px] tracking-[0.2em] ml-0 md:ml-[68px]">All orders, revenue & customer transactions</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto mt-2 lg:mt-0">
                    <Button
                        className="w-full md:w-auto rounded-2xl bg-slate-900 hover:bg-blue-600 font-black px-10 shadow-xl shadow-slate-900/10 text-white h-12 transition-all active:scale-95 border-none shrink-0"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus className="mr-2 h-5 w-5" /> New Order
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 w-full">
                <Card className="bg-white border-none shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden group hover:-translate-y-1 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Revenue</CardTitle>
                        <div className="p-2.5 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter italic">₹{Number(stats.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-none shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden group hover:-translate-y-1 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Orders</CardTitle>
                        <div className="p-2.5 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <ShoppingCart className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter italic">{stats.orderCount.toString().padStart(3, '0')}</div>
                        <p className="text-[10px] text-slate-400 font-black mt-4 uppercase tracking-widest">Completed Orders</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-none shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden group hover:-translate-y-1 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Pending Orders</CardTitle>
                        <div className="p-2.5 bg-amber-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-amber-600 tracking-tighter italic">{stats.pendingOrders.toString().padStart(2, '0')}</div>
                        <p className="text-[10px] text-amber-600/60 font-black mt-4 uppercase tracking-widest bg-amber-50 w-fit px-2 py-1 rounded-lg animate-pulse">Awaiting Confirmation</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-none shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden group hover:-translate-y-1 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Avg. Order Value</CardTitle>
                        <div className="p-2.5 bg-indigo-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <Package className="h-4 w-4 text-indigo-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter italic">
                            ₹{stats.orderCount > 0 ? (stats.totalRevenue / stats.orderCount).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : "0"}
                        </div>
                        <p className="text-[10px] text-slate-400 font-black mt-4 uppercase tracking-widest">Per Transaction Average</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-white border-none shadow-2xl shadow-slate-200/40 rounded-[40px] overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-10 px-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                        <div>
                            <CardTitle className="text-slate-900 text-2xl font-black tracking-tight">Sales Orders</CardTitle>
                            <CardDescription className="text-slate-600 font-black uppercase text-[10px] tracking-[0.2em] mt-2">All customer orders and invoices</CardDescription>
                        </div>
                        <Badge variant="outline" className="w-fit border-slate-200 bg-white text-slate-500 font-black px-4 py-1.5 rounded-xl uppercase tracking-widest text-[10px]">
                            Live Feed
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none">
                    <Table className="min-w-[900px]">
                        <TableHeader className="bg-slate-50/30">
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="text-slate-600 font-black uppercase text-[10px] tracking-[0.2em] pl-10 h-16">Order ID</TableHead>
                                <TableHead className="text-slate-600 font-black uppercase text-[10px] tracking-[0.2em]">Customer</TableHead>
                                <TableHead className="text-slate-600 font-black uppercase text-[10px] tracking-[0.2em]">Date</TableHead>
                                <TableHead className="text-slate-600 font-black uppercase text-[10px] tracking-[0.2em]">Amount</TableHead>
                                <TableHead className="text-slate-600 font-black uppercase text-[10px] tracking-[0.2em]">Status</TableHead>
                                <TableHead className="text-slate-600 font-black uppercase text-[10px] tracking-[0.2em] text-right pr-10">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow
                                    key={order.id}
                                    className="border-slate-50 hover:bg-blue-50/30 transition-all group cursor-pointer"
                                    onClick={() => router.push(`/invoice/${order.id}`)}
                                >
                                    <TableCell className="pl-10 font-black text-[10px] text-blue-600 tracking-widest bg-slate-50/30 group-hover:bg-blue-50/30 transition-all">
                                        #{order.id.slice(0, 8).toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 tracking-tight leading-none mb-1 text-base truncate max-w-[200px]" title={order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "Direct Transaction"}>
                                                {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "Direct Transaction"}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Customer</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 font-black text-xs italic tracking-tighter">
                                        {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-black text-slate-900 text-lg tabular-nums">
                                            ₹{Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                        </span>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                    <TableCell className="text-right pr-10">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-10 px-6 font-black text-[10px] uppercase tracking-widest border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 rounded-2xl transition-all active:scale-95"
                                            onClick={(e) => { e.stopPropagation(); router.push(`/invoice/${order.id}`); }}
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-32 text-slate-300">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center border-4 border-dashed border-slate-100">
                                                <ShoppingCart className="h-10 w-10 opacity-20" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-slate-400 tracking-tight">No Orders Yet</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest mt-1">Create your first order to get started</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
                <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-xl bg-white border-none shadow-2xl rounded-[40px] overflow-hidden p-0">
                    <div className="bg-slate-900 p-10 pb-16">
                        <DialogTitle className="text-white font-black text-3xl tracking-tight">Create New Order</DialogTitle>
                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mt-3">Add a new customer order or invoice</p>
                    </div>
                    <form onSubmit={handleConfirmSubmit} className="p-10 -mt-8 bg-white rounded-t-[40px] space-y-6">
                        {/* Customer */}
                        <div className="space-y-3">
                            <Label className="text-slate-600 font-black uppercase text-[10px] tracking-widest ml-1">Select Customer</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger className="bg-slate-50 border-slate-100 text-slate-900 rounded-2xl h-14 px-5 font-bold focus:ring-blue-500/20 text-base">
                                    <SelectValue placeholder="Choose Customer" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                                    {(customers || []).map(c => (
                                        <SelectItem key={c.id} value={c.id} className="rounded-xl py-3 font-black text-slate-700">
                                            {c.firstName} {c.lastName}
                                        </SelectItem>
                                    ))}
                                    {(!customers || customers.length === 0) && (
                                        <div className="p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">No Customers Found</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* BUG-017 FIX: Multi-item line rows */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-slate-600 font-black uppercase text-[10px] tracking-widest ml-1">Order Items</Label>
                                <button type="button" onClick={addOrderItem} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                    <Plus className="h-3 w-3" /> Add Line
                                </button>
                            </div>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {orderItems.map((item, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <Select value={item.productId} onValueChange={v => updateOrderItem(i, "productId", v)}>
                                            <SelectTrigger className="flex-1 bg-slate-50 border-slate-100 text-slate-900 rounded-2xl h-12 px-4 font-bold text-sm">
                                                <SelectValue placeholder="Choose Product" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                                                {(products || []).map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="rounded-xl py-2 font-black text-slate-700">
                                                        <div className="flex justify-between items-center w-full min-w-[260px]">
                                                            <span>{p.name}</span>
                                                            <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg text-[9px] ml-4">₹{p.price}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number" min="1"
                                            value={item.quantity}
                                            onChange={e => updateOrderItem(i, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-20 bg-slate-50 border-slate-100 rounded-2xl h-12 text-center font-black text-slate-900 tabular-nums"
                                        />
                                        {orderItems.length > 1 && (
                                            <button type="button" onClick={() => removeOrderItem(i)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-xl">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="button" variant="ghost" className="flex-1 h-14 text-slate-600 font-black rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl h-14 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]">
                                {isSubmitting ? "Creating Order..." : "Create Order"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={submitOrder}
                title="Large Order Alert"
                description="This order exceeds ₹1,00,000. Please verify the customer and quantities before finalizing."
                confirmLabel="Confirm Order"
                cancelLabel="Review Changes"
                variant="warning"
            />
        </div>
    );
}
