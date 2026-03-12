
"use client";

import { ShieldCheck, Box, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";


export default function LogisticsConsignments() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <Box className="w-10 h-10 text-blue-600" />
                        Consignment Registry
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium tracking-tight">Active shipments, delivery manifests, and real-time tracking logs.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                            <MapPin className="text-blue-600" />
                        </div>
                        <CardTitle className="text-xl font-black">In Transit</CardTitle>
                        <CardDescription>Shipments currently on the move.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <p className="text-4xl font-black text-slate-900">32</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Active Manifests</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                            <Box className="text-emerald-600" />
                        </div>
                        <CardTitle className="text-xl font-black">Delivered Today</CardTitle>
                        <CardDescription>Closed manifest logs for the current shift.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <p className="text-4xl font-black text-emerald-600">84</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Deliveries Finalized</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col justify-between">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GPS Command</span>
                        </div>
                        <CardTitle className="text-xl font-black text-white">Live Telemetry</CardTitle>
                        <p className="text-slate-400 text-sm mt-2 font-medium">Auto-ping active for all mobile dispatch units.</p>
                    </div>
                </Card>
            </div>

            <div className="p-12 border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="text-slate-300 w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Distribution Ledger Syncing</h3>
                <p className="max-w-md mx-auto text-slate-500 font-medium">This module is currently processing the daily dispatch registry. GPS coordinates will be mapped once the fleet integration is verified.</p>
            </div>
        </div>
    );
}
