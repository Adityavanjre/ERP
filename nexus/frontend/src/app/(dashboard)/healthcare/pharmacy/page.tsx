
"use client";

import React from 'react';
import { Package, Search, Plus, Filter, ShoppingBag, MoreHorizontal, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stock = [
    { id: 'MED-301', name: 'Paracetamol 500mg', category: 'Analgesic', stock: 1250, unit: 'Tabs', price: 2.50, status: 'In Stock' },
    { id: 'MED-302', name: 'Amoxicillin 250mg', category: 'Antibiotic', stock: 85, unit: 'Caps', price: 12.00, status: 'Low Stock' },
    { id: 'MED-303', name: 'Insulin Glargine', category: 'Insulin', stock: 12, unit: 'Vials', price: 450.00, status: 'Critical' },
    { id: 'MED-304', name: 'Vitamin C 1000mg', category: 'Supplements', stock: 450, unit: 'Tabs', price: 8.00, status: 'In Stock' },
];

export default function PharmacyPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-600 rounded-3xl shadow-xl shadow-emerald-500/20">
                        <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase tracking-widest">Pharmacy Inventory</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Real-time stock management and drug classification.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-2xl border-slate-200">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Inventory Stats
                    </Button>
                    <Button className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 px-8 py-6 h-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Medicine
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-3xl border-slate-100 bg-emerald-50/20 border-emerald-100 shadow-sm p-6 text-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Total SKU</h4>
                    <h3 className="text-3xl font-black text-emerald-900">1,248</h3>
                </Card>
                <Card className="rounded-3xl border-slate-100 bg-amber-50/20 border-amber-100 shadow-sm p-6 text-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Low Stock Items</h4>
                    <h3 className="text-3xl font-black text-amber-900">42</h3>
                </Card>
                <Card className="rounded-3xl border-slate-100 bg-rose-50/20 border-rose-100 shadow-sm p-6 text-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2">Expired Items</h4>
                    <h3 className="text-3xl font-black text-rose-900">0</h3>
                </Card>
                <Card className="rounded-3xl border-slate-100 bg-blue-50/20 border-blue-100 shadow-sm p-6 text-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Monthly Sales</h4>
                    <h3 className="text-3xl font-black text-blue-900">₹2.4L</h3>
                </Card>
            </div>

            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden border-none bg-white">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="font-black text-sm uppercase tracking-widest text-slate-400 shrink-0">Warehouse Inventory</h2>
                    <div className="flex items-center gap-4 w-full md:justify-end">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search medicines by name or salt..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-2xl text-xs focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-xl shrink-0"><Filter className="h-4 w-4" /></Button>
                    </div>
                </div>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <th className="px-8 py-4">Drug Code</th>
                                    <th className="px-8 py-4">Name & Category</th>
                                    <th className="px-8 py-4">Current Stock</th>
                                    <th className="px-8 py-4">Status</th>
                                    <th className="px-8 py-4">Price / Unit</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {stock.map((s) => (
                                    <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/30 transition-all group">
                                        <td className="px-8 py-6 font-mono font-bold text-slate-400 text-xs">{s.id}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800 text-sm tracking-tight">{s.name}</span>
                                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{s.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-slate-700">{s.stock}</span>
                                            <span className="text-xs text-slate-400 font-bold ml-1 uppercase">{s.unit}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <Badge className={cn(
                                                "rounded-lg px-2 py-0.5 border-none font-bold text-[10px] uppercase tracking-wider",
                                                s.status === 'In Stock' ? "bg-emerald-50 text-emerald-700" :
                                                    s.status === 'Critical' ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                                            )}>
                                                {s.status === 'Critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                                {s.status}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-slate-900">₹{s.price.toFixed(2)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2.5rem] flex items-center gap-6">
                <div className="p-4 bg-white rounded-3xl shadow-sm">
                    <Info className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                    <h4 className="text-amber-900 font-black uppercase text-xs tracking-widest mb-1">Stock Warning System</h4>
                    <p className="text-amber-800/70 text-sm font-medium leading-relaxed">Auto-sync with the central procurement department will trigger for all Low Stock and Critical items at 11:00 PM IST.</p>
                </div>
            </div>
        </div>
    );
}
