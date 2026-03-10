
"use client";

import React from 'react';
import { FileText, Search, Plus, Filter, Download, MoreHorizontal, Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const records = [
    { id: 'REC-201', patient: 'John Doe', type: 'Lab Report', date: '2023-12-10', doctor: 'Dr. Sarah Smith', status: 'Final' },
    { id: 'REC-202', patient: 'Jane Smith', type: 'Prescription', date: '2023-12-12', doctor: 'Dr. Mike Johnson', status: 'Draft' },
    { id: 'REC-203', patient: 'Robert Johnson', type: 'X-Ray', date: '2023-12-08', doctor: 'Dr. Sarah Smith', status: 'Final' },
];

export default function MedicalRecordsPage() {
    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-900 rounded-3xl shadow-xl shadow-slate-500/10">
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase tracking-widest">Medical Records</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Encrypted and secure clinical documentation.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="rounded-2xl border-slate-200">
                        <Download className="h-4 w-4 mr-2" />
                        Export All
                    </Button>
                    <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-500/20 px-8 py-6 h-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Record
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-[2rem] border-slate-100 bg-emerald-50/30 border-none shadow-none p-6">
                    <Lock className="h-5 w-5 text-emerald-600 mb-4" />
                    <h3 className="text-lg font-black text-emerald-900">End-to-End Encrypted</h3>
                    <p className="text-sm text-emerald-700/70 mt-1 font-medium leading-relaxed">All medical documentation is encrypted using AES-256 before being stored in the cloud.</p>
                </Card>
                <Card className="rounded-[2rem] border-slate-100 bg-blue-50/30 border-none shadow-none p-6">
                    <Shield className="h-5 w-5 text-blue-600 mb-4" />
                    <h3 className="text-lg font-black text-blue-900">Audit Trail Enabled</h3>
                    <p className="text-sm text-blue-700/70 mt-1 font-medium leading-relaxed">Every access to medical records is logged with TIMESTAMP and USER ID for compliance.</p>
                </Card>
                <Card className="rounded-[2rem] border-slate-100 bg-slate-50/50 border-none shadow-none p-6">
                    <FileText className="h-5 w-5 text-slate-600 mb-4" />
                    <h3 className="text-lg font-black text-slate-900">HIPAA Compliant</h3>
                    <p className="text-sm text-slate-700/70 mt-1 font-medium leading-relaxed">Our infrastructure meets global healthcare standards for data protection and privacy.</p>
                </Card>
            </div>

            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden border-none bg-white">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <h2 className="font-black text-sm uppercase tracking-widest text-slate-400">Recent Records</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter records..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-2xl text-xs focus:ring-2 focus:ring-slate-500 transition-all font-bold"
                        />
                    </div>
                </div>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/30 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <th className="px-8 py-4">Record ID</th>
                                    <th className="px-8 py-4">Patient</th>
                                    <th className="px-8 py-4">Type</th>
                                    <th className="px-8 py-4">Date</th>
                                    <th className="px-8 py-4">Doctor</th>
                                    <th className="px-8 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {records.map((r) => (
                                    <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/20 transition-all group">
                                        <td className="px-8 py-6 font-mono font-bold text-slate-500 text-xs">{r.id}</td>
                                        <td className="px-8 py-6 font-black text-slate-800">{r.patient}</td>
                                        <td className="px-8 py-6">
                                            <Badge variant="outline" className="rounded-lg border-slate-200 text-slate-600 font-bold px-3 py-1 bg-white">
                                                {r.type}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-6 text-slate-500 font-medium uppercase text-[10px] tracking-wider">{r.date}</td>
                                        <td className="px-8 py-6 text-slate-700 font-bold">{r.doctor}</td>
                                        <td className="px-8 py-6 text-right">
                                            <Button variant="ghost" size="icon" className="rounded-xl">
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
