
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Truck, ShoppingBag, DollarSign, Package, CheckCircle2, XCircle, ShoppingCart, UserPlus, Scale } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CreateSupplierDialog } from "@/components/purchases/create-supplier-dialog";
import { EditSupplierDialog } from "@/components/purchases/edit-supplier-dialog";
import { OpeningBalanceDialog } from "@/components/accounting/opening-balance-dialog";
import { Edit2 } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";

export default function PurchasesPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ totalSpent: 0, pendingPOs: 0 });
    const [loading, setLoading] = useState(true);
    const [showPODialog, setShowPODialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [openingBalanceTarget, setOpeningBalanceTarget] = useState<any>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    // Form state
    const [newPO, setNewPO] = useState({
        supplierId: "",
        productId: "",
        quantity: 1,
        unitPrice: 0,
        orderDate: new Date().toISOString().split('T')[0]
    });

    const syncProcurement = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const [suppRes, prodRes, poRes, statsRes] = await Promise.all([
                api.get("purchases/suppliers"),
                api.get("inventory/products"),
                api.get("purchases/orders"),
                api.get("purchases/stats")
            ]);
            setSuppliers(suppRes.data);
            // Products API returns paginated response { data: [], meta: {} }
            setProducts(prodRes.data.data || []);
            setPurchaseOrders(poRes.data.data || []);
            setStats(statsRes.data);
        } catch (err) {
            console.error("Procurement Sync Failure:", err);
            setSuppliers([]);
            setProducts([]);
            setPurchaseOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncProcurement(true);

        // CONTINUOUS BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncProcurement(false), 30000);
        return () => clearInterval(interval);
    }, []);

    const handleConfirmSubmit = () => {
        if (!newPO.supplierId || !newPO.productId || newPO.quantity <= 0) {
            toast.error("Please fill in all required fields");
            return;
        }

        const orderTotal = newPO.quantity * newPO.unitPrice;
        if (orderTotal > 100000) {
            setShowConfirm(true);
        } else {
            createPO();
        }
    };

    const createPO = async () => {
        try {
            setIsSubmitting(true);
            const items = [{
                productId: newPO.productId,
                quantity: newPO.quantity,
                unitPrice: newPO.unitPrice
            }];

            await api.post("purchases/orders", {
                supplierId: newPO.supplierId,
                orderDate: new Date(newPO.orderDate),
                totalAmount: newPO.quantity * newPO.unitPrice,
                status: 'Ordered',
                items
            });

            toast.success("Purchase order created successfully");
            setShowPODialog(false);
            setNewPO({ ...newPO, productId: "", quantity: 1, unitPrice: 0 });
            syncProcurement(true);
        } catch (err) {
            toast.error("Failed to create purchase order");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/purchases/orders/${id}/status`, { status });
            toast.success(`Purchase order marked as ${status}`);
            syncProcurement(true);
        } catch (err) {
            toast.error("Failed to update purchase order");
        }
    };

    const getPOStatusBadge = (status: string) => {
        switch (status) {
            case 'Received': return <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-lg px-3 py-1">Received</Badge>;
            case 'Ordered': return <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-lg px-3 py-1">Ordered</Badge>;
            case 'Draft': return <Badge className="bg-slate-50 text-slate-500 border-none font-black text-[10px] uppercase tracking-tighter rounded-lg px-3 py-1">Draft</Badge>;
            case 'Cancelled': return <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-lg px-3 py-1">Cancelled</Badge>;
            default: return <Badge variant="outline" className="bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-tighter rounded-lg px-3 py-1">{status}</Badge>;
        }
    };

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 bg-slate-50/30 min-h-screen w-full max-w-full overflow-hidden">
            <CreateSupplierDialog
                open={isAddSupplierOpen}
                onOpenChange={setIsAddSupplierOpen}
                onSuccess={() => syncProcurement(false)}
            />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <ShoppingCart className="h-8 w-8 md:h-10 md:w-10 text-indigo-600" /> Purchases & Suppliers
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage your supply chain and purchase orders.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => setIsAddSupplierOpen(true)}
                        className="flex-1 sm:flex-none justify-center rounded-2xl border-slate-200 bg-white text-slate-600 font-bold h-12 px-6 shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                        <UserPlus className="h-4 w-4" /> Add Supplier
                    </Button>
                    <Button
                        onClick={() => setShowPODialog(true)}
                        className="flex-1 sm:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 md:px-8 h-12 font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all whitespace-nowrap"
                    >
                        New Order
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spent</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">₹{Number(stats?.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Total purchase cost</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Orders</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-600 tracking-tighter">{stats?.pendingPOs || 0}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Awaiting Fulfillment</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suppliers</CardTitle>
                        <Truck className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">{suppliers.length}</div>
                        <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-tighter">Approved Suppliers</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="orders" className="space-y-6 md:space-y-8">
                <TabsList className="bg-slate-100 border-slate-200 p-1.5 rounded-2xl h-auto w-full flex flex-wrap justify-start overflow-x-auto snap-x">
                    <TabsTrigger value="orders" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-4 md:px-8 py-2.5 font-bold transition-all snap-start">Purchase Orders</TabsTrigger>
                    <TabsTrigger value="suppliers" className="flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-4 md:px-8 py-2.5 font-bold transition-all snap-start">Suppliers</TabsTrigger>
                </TabsList>

                <TabsContent value="orders">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none text-slate-900">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-4 md:px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Purchase Register</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">All purchase orders and their status</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none">
                            <Table className="min-w-[900px]">
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">Order ID</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Supplier</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Order Date</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Amount</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchaseOrders.map((po) => (
                                        <TableRow key={po.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                            <TableCell className="pl-8 font-black text-[10px] text-blue-600 tracking-widest bg-slate-50/30 w-32 uppercase tracking-tighter leading-none">
                                                {po.orderNumber.startsWith('PO-') ? po.orderNumber : `PO-${po.orderNumber.toUpperCase()}`}
                                            </TableCell>
                                            <TableCell className="font-black text-slate-900 tracking-tight">{po.supplier.name}</TableCell>
                                            <TableCell className="text-slate-500 font-bold text-xs">{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-black text-slate-900">₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</TableCell>
                                            <TableCell>{getPOStatusBadge(po.status)}</TableCell>
                                            <TableCell className="text-right pr-8">
                                                {po.status === 'Ordered' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleUpdateStatus(po.id, 'Received')}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-8 px-4 text-[11px] shadow-lg shadow-emerald-500/20"
                                                    >
                                                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Received
                                                    </Button>
                                                )}
                                                {po.status === 'Received' && (
                                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-end">
                                                        <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-500" /> Fulfilled
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {purchaseOrders.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-bold italic">
                                                <ShoppingBag className="mx-auto h-16 w-16 mb-4 opacity-10" />
                                                No purchase orders found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="suppliers">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none text-slate-900">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Suppliers</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">List of approved suppliers</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {suppliers.map((s) => (
                                    <Card key={s.id} className="bg-slate-50/50 border-slate-100 hover:border-blue-500/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group rounded-2xl overflow-hidden">
                                        <CardHeader>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-blue-100 transition-all">
                                                    <Truck className="h-6 w-6 text-blue-600 transition-transform group-hover:rotate-12" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEditingSupplier(s)}
                                                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] rounded-md border-none uppercase tracking-tighter self-start">{s.category}</Badge>
                                                </div>
                                            </div>
                                            <CardTitle className="text-lg font-black text-slate-900 tracking-tight">{s.name}</CardTitle>
                                            <CardDescription className="text-slate-500 font-bold text-xs">{s.email}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-col gap-3">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100/50 p-3 rounded-xl italic">
                                                    <Package className="inline mr-1.5 h-3.5 w-3.5" /> {s.address || 'Global Operations'}
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setOpeningBalanceTarget({ id: s.id, name: s.name })}
                                                    className="w-full h-8 rounded-xl border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all gap-2"
                                                >
                                                    <Scale className="h-3.5 w-3.5" /> Set Opening Balance
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {suppliers.length === 0 && (
                                    <div className="col-span-full text-center py-20 text-slate-400 font-bold italic">No suppliers added yet.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <EditSupplierDialog
                open={!!editingSupplier}
                onOpenChange={(open) => !open && setEditingSupplier(null)}
                supplier={editingSupplier}
                onSuccess={() => syncProcurement(false)}
            />

            {/* Purchase Order Creation Dialog */}
            <Dialog open={showPODialog} onOpenChange={setShowPODialog}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900">New Purchase Order</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Start a new order with a verified supplier.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="grid gap-2">
                            <Label htmlFor="supplier" className="text-slate-700 font-black text-[10px] uppercase tracking-widest pl-1">
                                Supplier <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="supplier"
                                value={newPO.supplierId}
                                onChange={(e) => setNewPO({ ...newPO, supplierId: e.target.value })}
                                className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                            >
                                <option value="">Select supplier...</option>
                                {Array.isArray(suppliers) && suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="product" className="text-slate-700 font-black text-[10px] uppercase tracking-widest pl-1">
                                    Product <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="product"
                                    value={newPO.productId}
                                    onChange={(e) => {
                                        const prod = products.find(p => p.id === e.target.value);
                                        setNewPO({ ...newPO, productId: e.target.value, unitPrice: prod?.costPrice || 0 });
                                    }}
                                    className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-all"
                                >
                                    <option value="">Select product...</option>
                                    {Array.isArray(products) && products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="quantity" className="text-slate-700 font-black text-[10px] uppercase tracking-widest pl-1">
                                    Quantity <span className="text-red-500">*</span>
                                </Label>
                                <NumericInput
                                    id="quantity"
                                    value={newPO.quantity}
                                    onChange={(val) => setNewPO({ ...newPO, quantity: val })}
                                    className="h-11 rounded-2xl border-slate-200 font-bold px-4"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="unitPrice" className="text-slate-700 font-black text-[10px] uppercase tracking-widest pl-1">
                                    Unit Cost (₹)
                                </Label>
                                <NumericInput
                                    id="unitPrice"
                                    value={newPO.unitPrice}
                                    onChange={(val) => setNewPO({ ...newPO, unitPrice: val })}
                                    decimal
                                    className="h-11 rounded-2xl border-slate-200 font-bold px-4"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="orderDate" className="text-slate-700 font-black text-[10px] uppercase tracking-widest pl-1">
                                    Order Date
                                </Label>
                                <Input
                                    id="orderDate"
                                    type="date"
                                    value={newPO.orderDate}
                                    onChange={(e) => setNewPO({ ...newPO, orderDate: e.target.value })}
                                    className="h-11 rounded-2xl border-slate-200 font-bold px-4"
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 mt-2">
                            <div className="flex justify-between items-center text-blue-900 font-black tracking-tight">
                                <span className="text-[10px] uppercase">Total Amount</span>
                                <span className="text-xl">₹{(newPO.quantity * newPO.unitPrice).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" className="rounded-2xl h-12" onClick={() => setShowPODialog(false)}>Cancel</Button>
                        <Button className="rounded-2xl h-12 bg-blue-600 font-bold px-8" onClick={handleConfirmSubmit} disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Purchase Order"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={createPO}
                title="Confirm Purchase"
                description={`You are creating a purchase order for ₹${(newPO.quantity * newPO.unitPrice).toLocaleString('en-IN')}. Verify supplier and pricing before proceeding.`}
                confirmLabel="Yes, Create PO"
                cancelLabel="Review"
                variant="warning"
            />
            <OpeningBalanceDialog
                isOpen={!!openingBalanceTarget}
                onClose={() => setOpeningBalanceTarget(null)}
                supplierId={openingBalanceTarget?.id}
                targetName={openingBalanceTarget?.name || ""}
                onSuccess={() => syncProcurement(true)}
            />
        </div>
    );
}
