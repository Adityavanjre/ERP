"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useRef } from "react";
import { Loader2, Plus, Trash2, Calendar, User, ShoppingCart, MessageCircle } from "lucide-react";
import { useUX } from "@/components/providers/ux-provider";

interface CreateInvoiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateInvoiceDialog({ isOpen, onClose, onSuccess }: CreateInvoiceDialogProps) {
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { setUILocked } = useUX();

    // Form State
    const [customerId, setCustomerId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<any[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [productFilter, setProductFilter] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "Escape" && isOpen && !loading) {
                onClose();
            }
            if (e.altKey && e.key === "n") {
                e.preventDefault();
                handleAddItem();
            }
            if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, items, customerId]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchRef.current?.focus(), 150);
        }
    }, [isOpen]);

    // Draft Persistence Engine
    useEffect(() => {
        if (typeof window !== "undefined" && isOpen && isInitialLoad) {
            const draft = localStorage.getItem("invoice_draft");
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    setCustomerId(parsed.customerId || "");
                    setInvoiceDate(parsed.invoiceDate || new Date().toISOString().split('T')[0]);
                    setDueDate(parsed.dueDate || "");
                    setItems(parsed.items || [{ productId: "", quantity: 1, price: 0, gstRate: 0, hsnCode: "", total: 0 }]);
                } catch (e) {
                    setItems([{ productId: "", quantity: 1, price: 0, gstRate: 0, hsnCode: "", total: 0 }]);
                }
            } else {
                setItems([{ productId: "", quantity: 1, price: 0, gstRate: 0, hsnCode: "", total: 0 }]);
            }
            setIsInitialLoad(false);
        }
    }, [isOpen, isInitialLoad]);

    useEffect(() => {
        if (!isInitialLoad && isOpen) {
            localStorage.setItem("invoice_draft", JSON.stringify({ customerId, invoiceDate, dueDate, items }));
        }
    }, [customerId, invoiceDate, dueDate, items, isOpen, isInitialLoad]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        try {
            const [custRes, prodRes] = await Promise.all([
                api.get("crm/customers"),
                api.get("inventory/products")
            ]);

            // Handle potentially paginated responses
            setCustomers(custRes.data.data || custRes.data || []);
            setProducts(prodRes.data.data || prodRes.data || []);
        } catch (err) {
            toast.error("Failed to load resources");
        }
    };

    const handleAddItem = () => {
        setItems([...items, { productId: "", quantity: 1, price: 0, gstRate: 0, hsnCode: "", total: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleProductChange = (index: number, productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            productId,
            price: Number(product.price),
            gstRate: Number(product.gstRate || 0),
            hsnCode: product.hsnCode || "",
            total: Number(product.price) * newItems[index].quantity
        };
        setItems(newItems);
    };

    const handleQuantityChange = (index: number, qty: number) => {
        const newItems = [...items];
        newItems[index].quantity = qty;
        newItems[index].total = newItems[index].price * qty;
        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalTax = items.reduce((sum, item) => sum + ((item.price * item.quantity) * (item.gstRate / 100)), 0);
        return { subtotal, totalTax, grandTotal: subtotal + totalTax };
    };

    const { subtotal, totalTax, grandTotal } = calculateTotals();
    const { showConfirm } = useUX();

    const handleSubmit = async () => {
        if (!customerId || !customerId.trim()) {
            toast.error("Please select a valid customer");
            return;
        }
        if (items.some(i => !i.productId)) {
            toast.error("Please select products for all lines");
            return;
        }

        const customerName = customers.find(c => c.id === customerId)?.company || "Selected Customer";

        showConfirm({
            title: "Confirm Tax Invoice Posting",
            description: `You are about to post a compliant tax invoice for ₹${grandTotal.toLocaleString('en-IN')} to ${customerName}. This action will affect your accounting ledgers and cannot be deleted once saved (only cancelled).`,
            confirmText: "Issue & Post",
            cancelText: "Review",
            onConfirm: async () => {
                await executeSubmit();
            }
        });
    };

    const executeSubmit = async () => {

        setLoading(true);
        setUILocked(true);
        try {
            await api.post("accounting/invoices", {
                customerId,
                issueDate: invoiceDate,
                dueDate: dueDate || invoiceDate,
                items: items.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    price: Number(i.price)
                }))
            }); // Note: Backend handles tax calculation based on product ID, but passing price ensures manual override if supported

            toast.success("Invoice issued successfully");
            localStorage.removeItem("invoice_draft");
            setItems([{ productId: "", quantity: 1, price: 0, gstRate: 0, hsnCode: "", total: 0 }]);
            setCustomerId("");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to issue invoice");
        } finally {
            setLoading(false);
            setUILocked(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-[800px] bg-[#09090b] text-white border-white/10 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Issue New Invoice</DialogTitle>
                    <DialogDescription className="text-zinc-400">Create a compliant tax invoice for your customer.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                    <div className="space-y-2">
                        <Label>Customer</Label>
                        <Select value={customerId} onValueChange={setCustomerId}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Select Customer" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                {customers.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.company})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="link"
                            className="text-[10px] text-amber-500 h-auto p-0 hover:text-amber-400"
                            onClick={() => {
                                const walkIn = customers.find(c => c.email === 'walkin@system.local');
                                if (walkIn) setCustomerId(walkIn.id);
                            }}
                        >
                            Quick Counter Sale (Walk-In)
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Invoice Date</Label>
                            <Input type="date" className="bg-white/5 border-white/10 text-white" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input type="date" className="bg-white/5 border-white/10 text-white" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="border rounded-md border-white/10 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-zinc-400 w-[300px]">
                                    <div className="flex flex-col gap-1">
                                        <span>Item Details</span>
                                        <Input
                                            ref={searchRef}
                                            placeholder="Fuzzy search..."
                                            className="h-6 text-[10px] bg-white/5 border-white/10"
                                            value={productFilter}
                                            onChange={e => setProductFilter(e.target.value)}
                                        />
                                    </div>
                                </TableHead>
                                <TableHead className="text-zinc-400 w-[100px]">Qty</TableHead>
                                <TableHead className="text-zinc-400 text-right">Price</TableHead>
                                <TableHead className="text-zinc-400 text-right">Tax (%)</TableHead>
                                <TableHead className="text-zinc-400 text-right">Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={index} className="border-white/5 hover:bg-white/5">
                                    <TableCell>
                                        <Select value={item.productId} onValueChange={(val) => handleProductChange(index, val)}>
                                            <SelectTrigger className="h-8 bg-transparent border-transparent focus:bg-white/10 text-white">
                                                <SelectValue placeholder="Select Product" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                {products
                                                    .filter(p =>
                                                        p.name.toLowerCase().includes(productFilter.toLowerCase()) ||
                                                        p.sku.toLowerCase().includes(productFilter.toLowerCase()) ||
                                                        (p.category && p.category.toLowerCase().includes(productFilter.toLowerCase()))
                                                    )
                                                    .map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{p.name}</span>
                                                                <span className="text-[10px] opacity-50">{p.sku} | {p.category || 'General'}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        {item.hsnCode && <div className="text-[10px] text-zinc-500 px-3">HSN: {item.hsnCode}</div>}
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="h-8 bg-transparent border-white/10 text-white w-20"
                                            value={item.quantity || ""}
                                            onChange={(e) => {
                                                const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                                handleQuantityChange(index, isNaN(val) ? 0 : val);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right text-white font-mono">
                                        ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right text-zinc-500 font-mono">
                                        {item.gstRate}%
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-white font-mono truncate max-w-[120px]">
                                        ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="h-8 w-8 text-zinc-500 hover:text-rose-500">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="sticky bottom-0 bg-[#09090b] pt-4 pb-2 border-t border-white/10 mt-4 z-20">
                    <div className="flex justify-between items-start">
                        <Button variant="outline" onClick={handleAddItem} className="border-dashed border-white/20 text-zinc-400 hover:text-white hover:bg-white/5">
                            <Plus className="mr-2 h-4 w-4" /> Add Line Item
                        </Button>

                        <div className="w-[200px] space-y-2 text-right">
                            <div className="flex justify-between text-sm text-zinc-400">
                                <span>Subtotal:</span>
                                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm text-zinc-400">
                                <span>Total Tax:</span>
                                <span>₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
                                <span>Total:</span>
                                <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-6">
                    <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">Cancel</Button>
                    <Button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-700 text-white px-8" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Issue Tax Invoice
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
