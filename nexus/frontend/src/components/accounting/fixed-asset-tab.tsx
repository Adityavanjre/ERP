
"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Landmark } from "lucide-react";
import { toast } from "sonner";
import { useUX } from "@/components/providers/ux-provider";

interface Asset {
    id: string;
    name: string;
    assetCode: string;
    type: string;
    purchaseValue: string | number;
    accumulatedDepreciation: string | number;
    status: 'Active' | 'Disposed';
}

interface ApiError {
    message?: string;
    response?: {
        data?: {
            message?: string;
        };
    };
}

export function FixedAssetTab() {
    const { setUILocked } = useUX();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAssets = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("accounting/fixed-assets");
            setAssets(res.data);
        } catch {
            toast.error("Failed to fetch assets");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const runDepreciation = useCallback(async (assetId: string) => {
        try {
            setUILocked(true);
            await api.post(`accounting/fixed-assets/${assetId}/depreciate`, {});
            toast.success("Depreciation processed successfully!");
            fetchAssets();
        } catch (err: unknown) {
            const error = err as ApiError;
            toast.error(error.response?.data?.message || error.message || "Depreciation failed");
        } finally {
            setUILocked(false);
        }
    }, [setUILocked, fetchAssets]);

    return (
        <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-6">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-slate-900 text-xl font-black">Fixed Asset Register</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Manage long-term assets and automated depreciation.</CardDescription>
                    </div>
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold gap-2">
                        <Plus className="h-4 w-4" />
                        Add Asset
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="font-bold text-slate-900 px-6 h-14">Asset</TableHead>
                            <TableHead className="font-bold text-slate-900 px-6 h-14">Type</TableHead>
                            <TableHead className="font-bold text-slate-900 px-6 h-14">Purchase Value</TableHead>
                            <TableHead className="font-bold text-slate-900 px-6 h-14">Accumulated Depr.</TableHead>
                            <TableHead className="font-bold text-slate-900 px-6 h-14">Net Value</TableHead>
                            <TableHead className="font-bold text-slate-900 px-6 h-14">Status</TableHead>
                            <TableHead className="text-right px-6 h-14">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assets.map((asset) => (
                            <TableRow key={asset.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                                <TableCell className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">
                                            <Landmark className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900">{asset.name}</div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{asset.assetCode}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-6 py-4 font-bold text-slate-600">{asset.type}</TableCell>
                                <TableCell className="px-6 py-4 font-black text-slate-900">₹{Number(asset.purchaseValue).toLocaleString()}</TableCell>
                                <TableCell className="px-6 py-4 font-bold text-rose-500">-₹{Number(asset.accumulatedDepreciation).toLocaleString()}</TableCell>
                                <TableCell className="px-6 py-4 font-black text-emerald-600">₹{(Number(asset.purchaseValue) - Number(asset.accumulatedDepreciation)).toLocaleString()}</TableCell>
                                <TableCell className="px-6 py-4">
                                    <Badge className={
                                        asset.status === 'Active'
                                            ? "bg-emerald-50 text-emerald-600 border-none px-3 py-1 font-black text-[10px]"
                                            : "bg-amber-50 text-amber-600 border-none px-3 py-1 font-black text-[10px]"
                                    }>
                                        {asset.status.toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell className="px-6 py-4 text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-bold gap-2"
                                        onClick={() => runDepreciation(asset.id)}
                                        disabled={asset.status !== 'Active'}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        Depreciate
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {assets.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-bold">No assets found in register.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
