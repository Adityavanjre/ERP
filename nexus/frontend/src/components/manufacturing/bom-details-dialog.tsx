'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Calculator, Layers } from 'lucide-react';

interface BOMItemDetailed {
    id: string;
    productId: string;
    quantity: number;
    product?: {
        name: string;
        sku: string;
        unit: string;
        costPrice?: number;
    };
}

interface BOMDetails {
    id: string;
    name: string;
    quantity: number;
    overheadRate: number;
    isOverheadFixed: boolean;
    product?: {
        name: string;
        sku: string;
        unit: string;
    };
    items?: BOMItemDetailed[];
}

interface CostAnalysis {
    materialCost: number;
    overheadCost: number;
    totalBatchCost: number;
    estimatedUnitCost: number;
}

interface BOMDetailsDialogProps {
    bomId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BOMDetailsDialog({ bomId, open, onOpenChange }: BOMDetailsDialogProps) {
    const [bom, setBom] = useState<BOMDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null);

    const fetchBOMDetails = useCallback(async () => {
        if (!bomId) return;
        try {
            setLoading(true);
            const [bomRes, costRes] = await Promise.all([
                api.get(`/manufacturing/boms/${bomId}`),
                api.get(`/manufacturing/boms/${bomId}/cost`)
            ]);
            setBom(bomRes.data);
            setCostAnalysis(costRes.data);
        } catch (err) {
            console.error("Failed to load BOM details", err);
        } finally {
            setLoading(false);
        }
    }, [bomId]);

    useEffect(() => {
        if (open && bomId) {
            fetchBOMDetails();
        } else {
            setBom(null);
            setCostAnalysis(null);
        }
    }, [open, bomId, fetchBOMDetails]);

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                        <Layers className="h-6 w-6 text-blue-600" />
                        BOM Details: {bom?.name || 'Loading...'}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="py-12">
                        <LoadingSpinner text="Loading BOM Structure..." />
                    </div>
                ) : bom ? (
                    <div className="space-y-6 py-4">
                        {/* Header Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-slate-50 border-slate-200 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finished Product</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-blue-500" />
                                        <span className="font-bold text-slate-700">{bom.product?.name}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 font-mono">{bom.product?.sku}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-50 border-slate-200 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-slate-600">Material Cost</span>
                                        <span className="text-sm font-black text-slate-900">₹{costAnalysis?.materialCost?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-600">Unit Cost</span>
                                        <span className="text-sm font-black text-emerald-600">₹{costAnalysis?.estimatedUnitCost?.toLocaleString()}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-50 border-slate-200 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Production Info</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-slate-600">Batch Size</span>
                                        <span className="text-sm font-black text-slate-900">{bom.quantity} {bom.product?.unit}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-600">Extra Cost</span>
                                        <Badge variant="outline" className="text-xs font-mono">{bom.overheadRate}%</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Components Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <Calculator className="h-4 w-4 text-slate-400" />
                                    Required Materials
                                </h3>
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">{bom.items?.length || 0} Items</Badge>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white hover:bg-white">
                                        <TableHead className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Item Name</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-widest text-slate-400">SKU</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-widest text-slate-400 text-right">Qty / Batch</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-widest text-slate-400 text-right">Unit Cost</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-widest text-slate-400 text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bom.items?.map((item: BOMItemDetailed) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium text-slate-700">{item.product?.name}</TableCell>
                                            <TableCell className="font-mono text-xs text-slate-500">{item.product?.sku}</TableCell>
                                            <TableCell className="text-right font-bold text-slate-700">
                                                {item.quantity} <span className="text-xs font-normal text-slate-400">{item.product?.unit}</span>
                                            </TableCell>
                                            <TableCell className="text-right text-slate-600 text-xs">
                                                ₹{item.product?.costPrice?.toLocaleString() || 0}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-900">
                                                ₹{((item.product?.costPrice || 0) * item.quantity).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center text-slate-400">
                        Failed to load BOM details.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
