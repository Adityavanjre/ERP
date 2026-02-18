
"use client";

import { useEffect, useState } from "react";
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
import { Plus, ShoppingCart, TrendingUp, Package, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useUX } from "@/components/providers/ux-provider";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SalesPage() {
    const { setUILocked } = useUX();
    const [orders, setOrders] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ totalRevenue: 0, orderCount: 0, pendingOrders: 0 });
    const [loading, setLoading] = useState(true);

    // New Order State
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [orderData, setOrderData] = useState({ customerId: "", productId: "", quantity: 1 });

    const syncCommerceFlow = async (showLoading = false) => {
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
        } catch (err) {
            console.error("Commerce Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncCommerceFlow(true);
        // CONTINUOUS BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncCommerceFlow(false), 30000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!orderData.customerId || !orderData.productId) {
                toast.error("Please select customer and product");
                return;
            }

            setIsSubmitting(true);
            setUILocked(true);
            const selectedProduct = (products || []).find(p => p.id === orderData.productId);

            await api.post("sales/orders", {
                customerId: orderData.customerId,
                items: [
                    {
                        productId: orderData.productId,
                        quantity: Number(orderData.quantity),
                        price: selectedProduct ? Number(selectedProduct.price) : 0
                    }
                ]
            });
            setShowForm(false);
            setOrderData({ customerId: "", productId: "", quantity: 1 });
            toast.success("Sales order processed successfully");
            syncCommerceFlow();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Order processing failed");
        } finally {
            setIsSubmitting(false);
            setUILocked(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Paid': return <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">Settled</Badge>;
            case 'Shipped': return <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">In Transit</Badge>;
            case 'Pending': return <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">Queued</Badge>;
            case 'Cancelled': return <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">Voided</Badge>;
            default: return <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-tighter rounded-full px-3 py-1">{status}</Badge>;
        }
    };

    if (loading) return <LoadingSpinner className="h-full" text="Loading Sales Data..." />;

    return (
        <div className="flex-1 space-y-10 p-10 pt-8 bg-slate-50/30">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 mr-5">
                            <ShoppingCart className="h-7 w-7 text-white" />
                        </div>
                        Commerce Flow & Treasury
                    </h2>
                    <p className="text-slate-600 mt-2 font-black uppercase text-[10px] tracking-[0.2em] ml-[68px]">Orders, Gross Inflow & Entity Transactions</p>
                </div>
                <div className="flex gap-4">
                    <Button
                        className="rounded-2xl bg-slate-900 hover:bg-blue-600 font-black px-10 shadow-xl shadow-slate-900/10 text-white h-12 transition-all active:scale-95 border-none"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus className="mr-2 h-5 w-5" /> Execute Transaction
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white border-none shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden group hover:-translate-y-1 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Gross Inflow</CardTitle>
                        <div className="p-2.5 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter italic">₹{Number(stats.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                        <div className="text-[10px] text-emerald-600 font-black mt-4 flex items-center bg-emerald-50 w-fit px-2 py-1 rounded-lg">
                            <TrendingUp className="h-3 w-3 mr-1.5" />
                            +12.4% vs Last Month
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-none shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden group hover:-translate-y-1 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Transactions</CardTitle>
                        <div className="p-2.5 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <ShoppingCart className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter italic">{stats.orderCount.toString().padStart(3, '0')}</div>
                        <p className="text-[10px] text-slate-400 font-black mt-4 uppercase tracking-widest">Finalized Transmissions</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-none shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden group hover:-translate-y-1 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Pending Queues</CardTitle>
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
                        <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Mean Transaction Integrity</CardTitle>
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
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-slate-900 text-2xl font-black tracking-tight">Sales Orders</CardTitle>
                            <CardDescription className="text-slate-600 font-black uppercase text-[10px] tracking-[0.2em] mt-2">All customer orders and invoices</CardDescription>
                        </div>
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-500 font-black px-4 py-1.5 rounded-xl uppercase tracking-widest text-[10px]">
                            Live Feed
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
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
                                <TableRow key={order.id} className="border-slate-50 hover:bg-blue-50/30 transition-all group">
                                    <TableCell className="pl-10 font-black text-[10px] text-blue-600 tracking-widest bg-slate-50/30 group-hover:bg-blue-50/30 transition-all">
                                        #{order.id.slice(0, 8).toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 tracking-tight leading-none mb-1 text-base">
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

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="bg-white border-none shadow-2xl rounded-[40px] overflow-hidden p-0 max-w-lg">
                    <div className="bg-slate-900 p-10 pb-16">
                        <DialogTitle className="text-white font-black text-3xl tracking-tight">Create New Order</DialogTitle>
                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mt-3">Add a new customer order or invoice</p>
                    </div>
                    <form onSubmit={handleCreateOrder} className="p-10 -mt-8 bg-white rounded-t-[40px] space-y-8">
                        <div className="space-y-3">
                            <Label className="text-slate-600 font-black uppercase text-[10px] tracking-widest ml-1">Select Customer</Label>
                            <Select value={orderData.customerId} onValueChange={v => setOrderData({ ...orderData, customerId: v })}>
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
                        <div className="space-y-3">
                            <Label className="text-slate-600 font-black uppercase text-[10px] tracking-widest ml-1">Select Product</Label>
                            <Select value={orderData.productId} onValueChange={v => setOrderData({ ...orderData, productId: v })}>
                                <SelectTrigger className="bg-slate-50 border-slate-100 text-slate-900 rounded-2xl h-14 px-5 font-bold focus:ring-blue-500/20 text-base">
                                    <SelectValue placeholder="Choose Product" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2">
                                    {(products || []).map(p => (
                                        <SelectItem key={p.id} value={p.id} className="rounded-xl py-3 font-black text-slate-700">
                                            <div className="flex justify-between items-center w-full min-w-[300px]">
                                                <span>{p.name}</span>
                                                <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg text-[9px] ml-4">₹{p.price}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                    {(!products || products.length === 0) && (
                                        <div className="p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">No Products Found</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-slate-600 font-black uppercase text-[10px] tracking-widest ml-1">Quantity</Label>
                            <Input
                                type="number"
                                min="1"
                                className="bg-slate-50 border-slate-100 text-slate-900 rounded-2xl h-14 px-5 text-2xl font-black focus:ring-blue-500/20 tabular-nums"
                                value={orderData.quantity}
                                onChange={e => setOrderData({ ...orderData, quantity: Math.max(1, Number(e.target.value)) })}
                            />
                        </div>
                        <div className="flex gap-4 pt-6">
                            <Button type="button" variant="ghost" className="flex-1 h-14 text-slate-600 font-black rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl h-14 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]">
                                {isSubmitting ? "Creating Order..." : "Create Order"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
