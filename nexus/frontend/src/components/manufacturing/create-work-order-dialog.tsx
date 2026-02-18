'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface BOM {
    id: string;
    name: string;
    product: {
        name: string;
        sku: string;
    };
}

interface Shortage {
    productName: string;
    required: number;
    available: number;
    missing: number;
}

interface CreateWorkOrderDialogProps {
    refreshData: () => void;
    children: React.ReactNode;
}

export function CreateWorkOrderDialog({ refreshData, children }: CreateWorkOrderDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);

    const [boms, setBoms] = useState<BOM[]>([]);
    const [selectedBomId, setSelectedBomId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [shortages, setShortages] = useState<Shortage[]>([]);

    useEffect(() => {
        if (open) {
            fetchBOMs();
        }
    }, [open]);

    useEffect(() => {
        if (selectedBomId && quantity > 0) {
            checkShortages();
        } else {
            setShortages([]);
        }
    }, [selectedBomId, quantity]);

    const fetchBOMs = async () => {
        try {
            const { data } = await api.get('/manufacturing/boms');
            setBoms(data);
        } catch (err) {
            toast.error("Failed to load BOMs");
        }
    };

    const checkShortages = async () => {
        if (!selectedBomId) return;
        setChecking(true);
        try {
            const { data } = await api.get(`/manufacturing/boms/${selectedBomId}/shortages?quantity=${quantity}`);
            setShortages(data);
        } catch (err) {
            console.error("Failed to check shortages");
        } finally {
            setChecking(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedBomId) {
            toast.error("Please select a BOM");
            return;
        }

        try {
            setLoading(true);
            await api.post('/manufacturing/work-orders', {
                bomId: selectedBomId,
                quantity
            });
            toast.success("Work Order Created Successfully");
            setOpen(false);
            refreshData();
            // Reset
            setSelectedBomId('');
            setQuantity(1);
            setShortages([]);
        } catch (err) {
            console.error(err);
            toast.error("Failed to create Work Order");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Production Order</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Product Recipe (BOM)</Label>
                        <Select value={selectedBomId} onValueChange={setSelectedBomId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Product to Make" />
                            </SelectTrigger>
                            <SelectContent>
                                {boms.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name} ({b.product.name})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Target Quantity</Label>
                        <Input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>

                    {/* Shortage Preview */}
                    <div className={`rounded-lg p-3 text-sm ${shortages.length > 0 ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                        <div className="flex items-center gap-2 font-bold mb-2">
                            {checking ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                            {shortages.length > 0 ? "Missing Materials" : "Materials Available"}
                        </div>
                        {shortages.length > 0 && (
                            <ul className="space-y-1">
                                {shortages.map((s, i) => (
                                    <li key={i} className="flex justify-between text-xs">
                                        <span>{s.productName}</span>
                                        <span className="font-mono">Missing: {s.missing}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <Button onClick={handleSubmit} disabled={loading} className="w-full mt-2">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Initialize Work Order
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
