"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, PlayCircle, History } from "lucide-react";

interface DepreciationLog {
    id: string;
    amount: string;
    date: string;
    description: string;
}


interface FixedAsset {
    id: string;
    name: string;
    assetCode: string;
    purchaseDate: string;
    purchaseValue: string;
    salvageValue: string;
    usefulLife: number;
    accumulatedDepreciation: string;
    status: string;
    depreciationLogs?: DepreciationLog[];
}


export default function FixedAssetsPage() {
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        name: "",
        assetCode: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        purchaseValue: "",
        salvageValue: "0",
        usefulLife: "60",
    });

    const fetchAssets = useCallback(async () => {
        try {
            const res = await api.get("/accounting/fixed-assets");
            setAssets(res.data || []);
        } catch {
            toast.error("Failed to load fixed assets");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const handleAdd = async () => {
        if (!form.name || !form.assetCode || !form.purchaseValue) {
            toast.error("Name, asset code, and purchase value are required");
            return;
        }
        try {
            await api.post("/accounting/fixed-assets", {
                ...form,
                purchaseValue: parseFloat(form.purchaseValue),
                salvageValue: parseFloat(form.salvageValue || "0"),
                usefulLife: parseInt(form.usefulLife),
                purchaseDate: new Date(form.purchaseDate).toISOString(),
                idempotencyKey: `FA-${form.assetCode}-${Date.now()}`,
            });

            toast.success("Fixed asset added");
            setDialogOpen(false);
            setForm({ name: "", assetCode: "", purchaseDate: new Date().toISOString().split("T")[0], purchaseValue: "", salvageValue: "0", usefulLife: "60" });
            fetchAssets();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to add asset");
        }
    };

    const handleDepreciate = async (assetId: string, assetName: string) => {
        try {
            const res = await api.post(`/accounting/fixed-assets/${assetId}/depreciate`);
            toast.success(`Depreciation of ₹${res.data.monthlyDepreciation} posted for ${assetName}`);
            fetchAssets();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Depreciation failed");
        }
    };

    const bookValue = (asset: FixedAsset) =>
        (parseFloat(asset.purchaseValue) - parseFloat(asset.accumulatedDepreciation)).toFixed(2);

    const statusColor = (status: string) => {
        if (status === "Active") return "bg-emerald-100 text-emerald-700";
        if (status === "FullyDepreciated") return "bg-slate-100 text-slate-600";
        if (status === "Disposed") return "bg-red-100 text-red-700";
        return "bg-slate-100 text-slate-600";
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Fixed Assets</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage capital assets and run monthly depreciation schedules.
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Asset
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Fixed Asset</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Asset Name</Label>
                                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lathe Machine" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Asset Code</Label>
                                    <Input value={form.assetCode} onChange={e => setForm(f => ({ ...f, assetCode: e.target.value }))} placeholder="e.g. MACH-001" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Purchase Date</Label>
                                <Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Purchase Value (₹)</Label>
                                    <Input type="number" value={form.purchaseValue || ""} onChange={e => {
                                        const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                        setForm(f => ({ ...f, purchaseValue: isNaN(val) ? "0" : val.toString() }));
                                    }} placeholder="500000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Salvage Value (₹)</Label>
                                    <Input type="number" value={form.salvageValue} onChange={e => setForm(f => ({ ...f, salvageValue: e.target.value }))} placeholder="0" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Useful Life (months)</Label>
                                <Input type="number" value={form.usefulLife || ""} onChange={e => {
                                    const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                                    setForm(f => ({ ...f, usefulLife: isNaN(val) ? "0" : val.toString() }));
                                }} placeholder="60" />
                            </div>
                            <Button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                                Add Fixed Asset
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="text-center py-16 text-slate-400">Loading assets...</div>
            ) : assets.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center gap-4">
                    <div className="p-5 bg-slate-100 rounded-3xl">
                        <Building2 className="h-10 w-10 text-slate-400" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-700">No fixed assets yet</p>
                        <p className="text-sm text-slate-400 mt-1">Add machinery, vehicles, or equipment to track depreciation.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="font-black text-xs uppercase tracking-widest text-slate-500">Asset</TableHead>
                                <TableHead className="font-black text-xs uppercase tracking-widest text-slate-500">Code</TableHead>
                                <TableHead className="font-black text-xs uppercase tracking-widest text-slate-500 text-right">Cost</TableHead>
                                <TableHead className="font-black text-xs uppercase tracking-widest text-slate-500 text-right">Acc. Dep.</TableHead>
                                <TableHead className="font-black text-xs uppercase tracking-widest text-slate-500 text-right">Book Value</TableHead>
                                <TableHead className="font-black text-xs uppercase tracking-widest text-slate-500">Life (mo)</TableHead>
                                <TableHead className="font-black text-xs uppercase tracking-widest text-slate-500">Status</TableHead>
                                <TableHead className="font-black text-xs uppercase tracking-widest text-slate-500">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.map((asset) => (
                                <TableRow key={asset.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-bold text-slate-900">{asset.name}</TableCell>
                                    <TableCell className="font-mono text-xs text-slate-500">{asset.assetCode}</TableCell>
                                    <TableCell className="text-right font-medium">₹{parseFloat(asset.purchaseValue).toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right text-slate-500">₹{parseFloat(asset.accumulatedDepreciation).toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-right font-bold text-blue-600">₹{parseFloat(bookValue(asset)).toLocaleString("en-IN")}</TableCell>
                                    <TableCell className="text-slate-600">{asset.usefulLife}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor(asset.status)}`}>
                                            {asset.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        {asset.status === "Active" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDepreciate(asset.id, asset.name)}
                                                className="rounded-xl text-xs font-bold border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                                            >
                                                <PlayCircle className="h-3 w-3 mr-1" />
                                                Depreciate
                                            </Button>
                                        )}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="ghost" className="rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900">
                                                    <History className="h-3 w-3 mr-1" />
                                                    History
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Depreciation History: {asset.name}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 pt-2">
                                                    {!asset.depreciationLogs || asset.depreciationLogs.length === 0 ? (
                                                        <p className="text-center py-8 text-slate-400 text-sm">No depreciation logs found.</p>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {asset.depreciationLogs.map((log) => (
                                                                <div key={log.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                                    <div>
                                                                        <p className="font-bold text-slate-900">₹{parseFloat(log.amount).toLocaleString("en-IN")}</p>
                                                                        <p className="text-[10px] text-slate-500">{new Date(log.date).toLocaleDateString()}</p>
                                                                    </div>
                                                                    <Badge variant="outline" className="text-[10px] font-bold border-slate-200">{log.description}</Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>

                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
