"use client";

import React, { useState, useEffect } from "react";
import {
    Command,
    Plus,
    Search,
    ChevronRight,
    Layers,
    Package,
    Settings,
    ArrowRight,
    Boxes,
    BarChart3
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateBOMDialog } from "@/components/manufacturing/create-bom-dialog";
import { BOMDetailsDialog } from "@/components/manufacturing/bom-details-dialog";

export default function BOMPage() {
    const [boms, setBoms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBomId, setSelectedBomId] = useState<string | null>(null);

    const syncLogicStructs = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await api.get("manufacturing/boms");
            setBoms(res.data);
        } catch (err) {
            console.error("Logic Struct Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncLogicStructs(true);
        const interval = setInterval(() => syncLogicStructs(false), 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredBoms = boms.filter(bom =>
        bom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bom.product?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <LoadingSpinner className="h-full" text="Loading BOM Catalog..." />;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8">
            <BOMDetailsDialog
                open={!!selectedBomId}
                onOpenChange={(open) => !open && setSelectedBomId(null)}
                bomId={selectedBomId}
            />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Command className="mr-4 h-9 w-9 text-blue-600 shadow-sm" />
                        Bill of Materials
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Define assembly structures and material requirements for finished goods.</p>
                </div>
                <CreateBOMDialog refreshData={() => syncLogicStructs(false)}>
                    <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-lg shadow-blue-500/20 text-white h-11">
                        <Plus className="mr-2 h-4 w-4" /> New BOM
                    </Button>
                </CreateBOMDialog>
            </div>

            <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 md:py-8 px-4 md:px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
                        <div>
                            <CardTitle className="text-slate-900 text-xl font-black">BOM Directory</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Master list of assembly recipes</CardDescription>
                        </div>
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by BOM name or product..."
                                className="pl-12 bg-white border-slate-200 text-slate-900 rounded-2xl h-12 shadow-inner font-semibold focus:ring-blue-500/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">BOM Name</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Finished Product</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Component Count</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Overhead Rate</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBoms.map((bom) => (
                                <TableRow key={bom.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => setSelectedBomId(bom.id)}>
                                    <TableCell className="pl-8">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mr-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <Layers className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 tracking-tight">{bom.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">BOM-{bom.id.slice(-6).toUpperCase()}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                            <Package className="h-3 w-3 mr-2 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-600">{bom.product?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[10px] rounded-lg border-none uppercase">
                                            {bom.items?.length || 0} Components
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-black text-slate-900">{bom.overheadRate}%</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{bom.isOverheadFixed ? 'Fixed' : 'Variable'}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase tracking-tighter rounded-lg">Active</Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredBoms.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold italic bg-slate-50/10 uppercase tracking-widest text-[10px]">
                                        No Bill of Materials found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-lg font-black flex items-center gap-3">
                            <Settings className="h-5 w-5 text-slate-400" />
                            Material Breakdown
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Detailed component & sub-assembly list</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                            <Boxes className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-600">Select a BOM to see recursive material requirements including sub-assemblies.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none text-white bg-gradient-to-br from-slate-900 to-black">
                    <CardHeader className="border-b border-white/10">
                        <CardTitle className="text-lg font-black flex items-center gap-3">
                            <BarChart3 className="h-5 w-5 text-blue-400" />
                            Cost Analysis
                        </CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total manufacturing value projection</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-16 w-16 rounded-3xl bg-white/5 flex items-center justify-center text-white/20">
                            <ArrowRight className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400">Select a BOM to calculate total production cost based on current raw material prices.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
