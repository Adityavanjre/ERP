
"use client";

import React from 'react';
import { Users, Search, Plus, Filter, MoreHorizontal, FileText, Calendar, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const patients = [
    { id: 'PAT-001', name: 'John Doe', age: 45, gender: 'Male', contact: '+91 98765 43210', lastVisit: '2023-12-05', status: 'Stable' },
    { id: 'PAT-002', name: 'Jane Smith', age: 32, gender: 'Female', contact: '+91 87654 32109', lastVisit: '2023-12-10', status: 'Follow-up' },
    { id: 'PAT-003', name: 'Robert Johnson', age: 58, gender: 'Male', contact: '+91 76543 21098', lastVisit: '2023-11-28', status: 'Critical' },
    { id: 'PAT-004', name: 'Sarah Williams', age: 29, gender: 'Female', contact: '+91 65432 10987', lastVisit: '2023-12-12', status: 'Stable' },
];

export default function PatientsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <Users className="h-8 w-8 text-blue-600" />
                        Patient Registry
                    </h1>
                    <p className="text-slate-500 mt-1">Manage all patient records and medical history.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-2xl border-slate-200">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                    </Button>
                    <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 px-6">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Patient
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="p-3 bg-blue-50 rounded-2xl">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-none">+12%</Badge>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-slate-500 font-medium">Total Patients</p>
                            <h3 className="text-2xl font-black mt-1">2,482</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="p-3 bg-amber-50 rounded-2xl">
                                <Activity className="h-6 w-6 text-amber-600" />
                            </div>
                            <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-none">Active</Badge>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-slate-500 font-medium">Under Treatment</p>
                            <h3 className="text-2xl font-black mt-1">156</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="p-3 bg-emerald-50 rounded-2xl">
                                <Calendar className="h-6 w-6 text-emerald-600" />
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none">Today</Badge>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-slate-500 font-medium">Daily OPD</p>
                            <h3 className="text-2xl font-black mt-1">42</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="p-3 bg-rose-50 rounded-2xl">
                                <FileText className="h-6 w-6 text-rose-600" />
                            </div>
                            <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-none">Pending</Badge>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-slate-500 font-medium">Medical Reports</p>
                            <h3 className="text-2xl font-black mt-1">18</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden border-none bg-slate-50/30">
                <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, ID or contact..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>
                <CardContent className="p-0 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Stats</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {patients.map((p) => (
                                    <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50/40 transition-all group">
                                        <td className="px-6 py-4 font-mono font-bold text-blue-600 text-xs">{p.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800">{p.name}</span>
                                                <span className="text-[10px] text-slate-500">{p.age} Y / {p.gender} / {p.contact}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={cn(
                                                "rounded-lg px-2 py-0.5 border-none font-bold text-[10px] uppercase tracking-wider",
                                                p.status === 'Stable' ? "bg-emerald-50 text-emerald-700" :
                                                    p.status === 'Critical' ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                                            )}>
                                                {p.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-slate-500 font-medium uppercase">Last Visit: {p.lastVisit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-sm">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
