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

interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    company?: string;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
}

interface IssueCreditNoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function IssueCreditNoteDialog({
    open,
    onOpenChange,
    onSuccess,
}: IssueCreditNoteDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [reason, setReason] = useState("");
    const [items, setItems] = useState<{ productId: string; quantity: number; price: number; name?: string }[]>([]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [custRes, prodRes] = await Promise.all([
                api.get("/crm/customers"),
                api.get("/inventory/products?limit=1000")
            ]);
            setCustomers(custRes.data?.data || []);
            setProducts(prodRes.data?.data || []);
        } catch {
            toast.error("Failed to load customers and products");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadInvoices = useCallback(async (customerId: string) => {
        if (!customerId) return;
        try {
            const res = await api.get(`/accounting/invoices?customerId=${customerId}`);
            setInvoices(res.data?.data || []);
        } catch {
            // Optional: fail silently
        }
    }, []);

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, loadData]);

    useEffect(() => {
        if (selectedCustomerId) {
            loadInvoices(selectedCustomerId);
        } else {
            setInvoices([]);
        }
    }, [selectedCustomerId, loadInvoices]);

    const addItem = () => {
        setItems([...items, { productId: "", quantity: 1, price: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: string | number) => {
        const newItems = [...items];
        if (field === "productId") {
            const prodId = value as string;
            const product = products.find(p => p.id === prodId);
            newItems[index] = { ...newItems[index], productId: prodId, price: product?.price || 0, name: product?.name };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!selectedCustomerId || items.length === 0) {
            toast.error("Please select a customer and add at least one item.");
            return;
        }

        try {
            setSubmitting(true);
            await api.post("/accounting/credit-notes", {
                customerId: selectedCustomerId,
                invoiceId: selectedInvoiceId || undefined,
                date,
                reason,
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    price: Number(i.price)
                }))
            });

            toast.success("Credit note issued successfully");
            onSuccess();
            onOpenChange(false);
            // Reset
            setSelectedCustomerId("");
            setSelectedInvoiceId("");
            setReason("");
            setItems([]);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to issue credit note");
        } finally {
            setSubmitting(false);
        }
    };

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                <div className="bg-emerald-600 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <FileText className="h-24 w-24" />
                    </div>
                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-3xl font-black tracking-tight">Issue Credit Note</DialogTitle>
                        <DialogDescription className="text-emerald-100 font-bold uppercase text-[10px] tracking-widest mt-1">
                            Record a sales return or customer overpayment
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer *</Label>
                            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-semibold">
                                    <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} {c.company ? `(${c.company})` : ""}</SelectItem>
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
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Ref (Optional)</Label>
                            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 font-semibold">
                                    <SelectValue placeholder="Link to Invoice" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="none">Direct Credit</SelectItem>
                                    {invoices.map(inv => (
                                        <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adjustment Reason</Label>
                            <Input
                                placeholder="e.g. Damascus returned due to defect"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="h-12 rounded-xl border-slate-200 bg-slate-50 font-semibold"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Return Items</h4>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addItem}
                                className="rounded-lg h-8 text-[10px] font-black uppercase bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100"
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
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Credit</div>
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
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 shadow-lg shadow-emerald-200 h-12"
                        >
                            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Issue Note"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
