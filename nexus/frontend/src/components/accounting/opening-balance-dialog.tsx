
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import { Scale } from "lucide-react";

interface Warehouse {
    id: string;
    name: string;
}

interface OpeningBalanceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customerId?: string;
    supplierId?: string;
    productId?: string;
    targetName: string;
    onSuccess: () => void;
}

interface OpeningBalancePayload {
    date: string;
    description: string;
    amount?: number;
    quantity?: number;
    warehouseId?: string;
    unitCost?: number;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export function OpeningBalanceDialog({
    isOpen,
    onClose,
    customerId,
    supplierId,
    productId,
    targetName,
    onSuccess
}: OpeningBalanceDialogProps) {
    const [amount, setAmount] = useState<number>(0); // This will be 'quantity' for products
    const [unitCost, setUnitCost] = useState<number>(0);
    const [warehouseId, setWarehouseId] = useState<string>("");
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState<string>('Initial Opening Balance');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchWarehouses = useCallback(async () => {
        try {
            const res = await api.get('/inventory/warehouses');
            const data = res.data;
            setWarehouses(data);
            if (data.length > 0) setWarehouseId(data[0].id);
        } catch (err) {
            console.error("Failed to fetch warehouses", err);
        }
    }, []);

    useEffect(() => {
        if (isOpen && productId) {
            fetchWarehouses();
        }
    }, [isOpen, productId, fetchWarehouses]);

    const handleSubmit = useCallback(async () => {
        if (amount <= 0) {
            toast.error(productId ? "Please enter valid quantity" : "Please enter a valid amount");
            return;
        }

        if (productId && !warehouseId) {
            toast.error("Please select a warehouse");
            return;
        }

        setIsSubmitting(true);
        try {
            let endpoint = "";
            const payload: OpeningBalancePayload = { date, description };

            if (customerId) {
                endpoint = `/accounting/customers/${customerId}/opening-balance`;
                payload.amount = amount;
            } else if (supplierId) {
                endpoint = `/accounting/suppliers/${supplierId}/opening-balance`;
                payload.amount = amount;
            } else if (productId) {
                endpoint = `/inventory/products/${productId}/opening-balance`;
                payload.quantity = amount;
                payload.warehouseId = warehouseId;
                payload.unitCost = unitCost;
            }

            await api.post(endpoint, payload);

            toast.success("Opening balance recorded");
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const error = err as ApiError;
            toast.error(error.response?.data?.message || "Failed to record balance");
        } finally {
            setIsSubmitting(false);
        }
    }, [amount, date, description, customerId, supplierId, productId, warehouseId, unitCost, onSuccess, onClose]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                        <Scale className="w-6 h-6 text-blue-600" />
                    </div>
                    <DialogTitle className="text-xl font-bold">Record Opening Balance</DialogTitle>
                    <DialogDescription>
                        Set the initial financial state for <span className="font-semibold text-slate-900">{targetName}</span>.
                        This will post a journal entry to Opening Balance Equity.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {productId && (
                        <div className="grid gap-2">
                            <Label className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">Select Warehouse</Label>
                            <select
                                className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={warehouseId}
                                onChange={(e) => setWarehouseId(e.target.value)}
                            >
                                <option value="">Select a warehouse...</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="amount" className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">
                            {productId ? "Initial Quantity" : "Balance Amount (₹)"}
                        </Label>
                        <NumericInput
                            value={amount}
                            onChange={setAmount}
                            decimal={!productId}
                            placeholder="0.00"
                            className="text-lg font-bold h-12 bg-slate-50"
                        />
                    </div>

                    {productId && (
                        <div className="grid gap-2">
                            <Label className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">Unit Cost (₹) per Item</Label>
                            <NumericInput
                                value={unitCost}
                                onChange={setUnitCost}
                                decimal
                                placeholder="0.00"
                                className="text-lg font-bold h-12 bg-slate-50"
                            />
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="date" className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">Opening Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="h-11 bg-slate-50"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description" className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">Description / Memo</Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Starting stock"
                            className="h-11 bg-slate-50"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isSubmitting ? "Recording..." : "Save Balance"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
