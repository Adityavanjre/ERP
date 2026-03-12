"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Loader2, IndianRupee } from "lucide-react";

interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
}

interface Supplier {
    id: string;
    name: string;
}

interface PurchaseOrder {
    id: string;
    orderNumber: string;
}

interface IssueDebitNoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function IssueDebitNoteDialog({
    open,
    onOpenChange,
    onSuccess,
}: IssueDebitNoteDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [selectedPOId, setSelectedPOId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [reason, setReason] = useState("");
    const [items, setItems] = useState<{ productId: string; quantity: number; price: number; name?: string }[]>([]);

    const loadSuppliersAndProducts = useCallback(async () => {
        try {
            setLoading(true);
            const [supRes, prodRes] = await Promise.all([
                api.get("/purchases/suppliers"),
                api.get("/inventory/products?limit=1000")
            ]);
            setSuppliers(supRes.data || []);
            setProducts(prodRes.data?.data || []);
        } catch {
            toast.error("Failed to load prerequisite data");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPurchaseOrders = useCallback(async (supplierId: string) => {
        if (!supplierId) return;
        try {
            const res = await api.get(`/purchases/orders?supplierId=${supplierId}`);
            setPurchaseOrders(res.data?.data || []);
        } catch {
            // Optional: fail silently
        }
    }, []);

    useEffect(() => {
        if (open) {
            loadSuppliersAndProducts();
        }
    }, [open, loadSuppliersAndProducts]);

    useEffect(() => {
        if (selectedSupplierId) {
            loadPurchaseOrders(selectedSupplierId);
        } else {
            setPurchaseOrders([]);
        }
    }, [selectedSupplierId, loadPurchaseOrders]);

    const addItem = () => {
        setItems([...items, { productId: "", quantity: 1, price: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: "productId" | "quantity" | "price", value: string | number) => {
        const newItems = [...items];
        if (field === "productId") {
            const product = products.find(p => p.id === (value as string));
            newItems[index] = { ...newItems[index], productId: value as string, price: product?.price || 0, name: product?.name };
        } else {
            newItems[index] = { ...newItems[index], [field]: Number(value) };
        }
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!selectedSupplierId || items.length === 0) {
            toast.error("Please select a supplier and add at least one item.");
            return;
        }

        if (items.some(item => !item.productId || item.quantity <= 0)) {
            toast.error("Please ensure all items have a product and quantity greater than zero.");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/accounting/debit-notes", {
                supplierId: selectedSupplierId,
                purchaseOrderId: selectedPOId || undefined,
                date,
                reason,
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    price: Number(i.price)
                }))
            });

            toast.success("Debit note issued successfully");
            onSuccess();
            onOpenChange(false);
            // Reset
            setSelectedSupplierId("");
            setSelectedPOId("");
            setReason("");
            setItems([]);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to issue debit note");
        } finally {
            setSubmitting(false);
        }
    };

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                <div className="bg-indigo-600 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <FileText className="h-24 w-24" />
                    </div>
                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-3xl font-black tracking-tight">Issue Debit Note</DialogTitle>
                        <DialogDescription className="text-indigo-100 font-bold uppercase text-[10px] tracking-widest mt-1">
                            Record a purchase return or price adjustment
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier *</Label>
                            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-semibold">
                                    <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date *</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="h-12 rounded-xl border-slate-200 bg-slate-50 font-semibold"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Purchase Order Ref (Optional)</Label>
                            <Select value={selectedPOId} onValueChange={setSelectedPOId}>
                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-semibold">
                                    <SelectValue placeholder="Link to PO" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="none">No Link</SelectItem>
                                    {purchaseOrders.map(po => (
                                        <SelectItem key={po.id} value={po.id}>{po.orderNumber}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adjustment Reason</Label>
                            <Input
                                placeholder="e.g. Damascus damaged during shipping"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="h-12 rounded-xl border-slate-200 bg-slate-50 font-semibold"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Adjustment Items</h4>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addItem}
                                className="rounded-lg h-8 text-[10px] font-black uppercase bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100"
                            >
                                <Plus className="h-3 w-3 mr-1" /> Add Item
                            </Button>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No items added yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-end p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-[9px] font-black uppercase text-slate-400">Product</Label>
                                            <Select value={item.productId} onValueChange={(val) => updateItem(index, "productId", val)}>
                                                <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white shadow-sm">
                                                    <SelectValue placeholder="Item" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {products.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-24 space-y-2">
                                            <Label className="text-[9px] font-black uppercase text-slate-400">Qty</Label>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                                className="h-10 rounded-lg border-slate-200 bg-white text-center font-bold"
                                            />
                                        </div>
                                        <div className="w-32 space-y-2">
                                            <Label className="text-[9px] font-black uppercase text-slate-400">Price</Label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-300" />
                                                <Input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => updateItem(index, "price", e.target.value)}
                                                    className="h-10 rounded-lg border-slate-200 bg-white pl-8 font-bold"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(index)}
                                            className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Adjustment</div>
                        <div className="text-2xl font-black text-slate-900 tracking-tighter">₹{totalAmount.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="flex gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl font-bold text-slate-400"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || loading}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 shadow-lg shadow-indigo-200 h-12"
                        >
                            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Issue Note"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
