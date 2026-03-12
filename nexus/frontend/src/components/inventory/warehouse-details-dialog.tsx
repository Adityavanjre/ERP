"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Package, MapPin, User, Boxes } from "lucide-react";

interface WarehouseStock {
    id: string;
    quantity: number;
    product: {
        name: string;
        sku: string;
        category?: string;
    };
}

interface WarehouseDetailed {
    id: string;
    name: string;
    location?: string;
    manager?: string;
    stocks?: WarehouseStock[];
}

interface WarehouseDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouse: WarehouseDetailed | null;
}

export function WarehouseDetailsDialog({
    open,
    onOpenChange,
    warehouse,
}: WarehouseDetailsDialogProps) {
    if (!warehouse) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-11/12 sm:min-w-fit sm:max-w-[700px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-slate-900 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <Boxes className="h-32 w-32" />
                    </div>
                    <DialogHeader className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <Package className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-3xl font-black tracking-tight">{warehouse.name}</DialogTitle>
                                <DialogDescription className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mt-1">
                                    Full Inventory Audit
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 mt-6 pt-6 border-t border-white/10">
                            <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-300">{warehouse.location || 'No location set'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-300">Manager: {warehouse.manager || 'Unassigned'}</span>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-8">
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-4">
                            Current Stock List
                            <div className="h-px flex-1 bg-slate-100" />
                        </h4>

                        <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-bold uppercase text-[9px] tracking-widest pl-6">Product</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">SKU</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[9px] tracking-widest text-right pr-6">In-Hand Stock</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {warehouse.stocks?.map((stock: WarehouseStock) => (
                                        <TableRow key={stock.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 font-black text-sm tracking-tight">{stock.product.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stock.product.category}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <code className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold">{stock.product.sku}</code>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <span className="text-lg font-black text-slate-900">{stock.quantity}</span>
                                                <span className="text-[10px] font-bold text-slate-400 ml-2 uppercase">Units</span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!warehouse.stocks || warehouse.stocks.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-20 bg-slate-50/50">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Boxes className="h-10 w-10 text-slate-200" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No stock records found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
