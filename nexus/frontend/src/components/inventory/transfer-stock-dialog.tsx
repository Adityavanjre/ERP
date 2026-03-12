"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
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
import { toast } from "react-hot-toast";
import { ArrowRightLeft, Loader2 } from "lucide-react";

interface Product {
    id: string;
    name: string;
}

interface Stock {
    product: Product;
    quantity: number;
}

interface Warehouse {
    id: string;
    name: string;
    stocks?: Stock[];
}

interface TransferStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sourceWarehouse: Warehouse | null;
    onSuccess: () => void;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export function TransferStockDialog({
    open,
    onOpenChange,
    sourceWarehouse,
    onSuccess,
}: TransferStockDialogProps) {
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
    const [quantity, setQuantity] = useState("");

    const fetchWarehouses = useCallback(async () => {
        try {
            const res = await api.get<Warehouse[]>("inventory/warehouses");
            setWarehouses(res.data.filter((w: Warehouse) => w.id !== sourceWarehouse?.id));
        } catch (err) {
            console.error("Failed to fetch warehouses", err);
        }
    }, [sourceWarehouse?.id]);

    useEffect(() => {
        if (open) {
            fetchWarehouses();
        }
    }, [open, fetchWarehouses]);

    const handleTransfer = useCallback(async () => {
        if (!sourceWarehouse) return;

        if (!selectedProduct || !destinationWarehouseId || !quantity) {
            toast.error("Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            await api.post("inventory/transfers", {
                productId: selectedProduct,
                fromWarehouseId: sourceWarehouse.id,
                destinationWarehouseId,
                quantity: Number(quantity),
            });
            toast.success("Stock transferred successfully");
            onSuccess();
            onOpenChange(false);
            // Reset
            setSelectedProduct("");
            setDestinationWarehouseId("");
            setQuantity("");
        } catch (err: unknown) {
            const error = err as ApiError;
            toast.error(error.response?.data?.message || "Transfer failed");
        } finally {
            setLoading(false);
        }
    }, [selectedProduct, destinationWarehouseId, quantity, sourceWarehouse?.id, onSuccess, onOpenChange]);

    if (!sourceWarehouse) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl">
                <DialogHeader>
                    <div className="bg-blue-50 h-12 w-12 rounded-2xl flex items-center justify-center mb-4">
                        <ArrowRightLeft className="h-6 w-6 text-blue-600" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-slate-900">Transfer Stock</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Transfer stock from <span className="text-blue-600 font-bold">{sourceWarehouse?.name}</span> to another location.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Product</Label>
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                            <SelectTrigger className="rounded-xl border-slate-200 h-11 font-semibold text-slate-700">
                                <SelectValue placeholder="Which item?" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                {sourceWarehouse?.stocks?.map((stock) => (
                                    <SelectItem key={stock.product.id} value={stock.product.id} className="rounded-lg font-bold py-3">
                                        <div className="flex flex-col">
                                            <span>{stock.product.name}</span>
                                            <span className="text-[9px] text-slate-400 lowercase">Available: {stock.quantity}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                                {(!sourceWarehouse?.stocks || sourceWarehouse.stocks.length === 0) && (
                                    <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No items in source</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destination Warehouse</Label>
                        <Select value={destinationWarehouseId} onValueChange={setDestinationWarehouseId}>
                            <SelectTrigger className="rounded-xl border-slate-200 h-11 font-semibold text-slate-700">
                                <SelectValue placeholder="Where to?" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                {warehouses.map((w) => (
                                    <SelectItem key={w.id} value={w.id} className="rounded-lg font-bold">
                                        {w.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</Label>
                        <Input
                            type="number"
                            placeholder="How many?"
                            className="rounded-xl border-slate-200 h-11 font-bold shadow-inner"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="pt-4 mt-2 border-t border-slate-50">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest text-[9px]"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleTransfer}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-8 shadow-lg shadow-blue-500/20 active:scale-95 transition-all gap-2"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Initiate Transfer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
