
"use client";

import { LayoutGrid, ShieldCheck, ArrowRight, Home, Hammer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConstructionDashboard() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-4">
                        <LayoutGrid className="w-10 h-10 text-amber-600" />
                        Infrastructure Hub
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium tracking-tight">Project site monitoring, material management, and sub-contractor oversight.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                            <Home className="text-amber-600" />
                        </div>
                        <CardTitle className="text-xl font-black">Active Sites</CardTitle>
                        <CardDescription>Major project project sites currently in progress.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <p className="text-4xl font-black text-slate-900">08 / 09</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Ongoing Projects</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                            <Hammer className="text-emerald-600" />
                        </div>
                        <CardTitle className="text-xl font-black">Material at Site</CardTitle>
                        <CardDescription>Physical inventory currently deployed to sites.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0">
                        <p className="text-4xl font-black text-slate-900">421 t</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Inventory Deployed</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-none shadow-2xl rounded-[2rem] overflow-hidden flex flex-col justify-between">
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Health</span>
                        </div>
                        <CardTitle className="text-xl font-black text-white">Daily Labor Pulse</CardTitle>
                        <p className="text-slate-400 text-sm mt-2 font-medium">Auto-sync with site biometric logs active.</p>
                    </div>
                    <div className="p-8 pt-0">
                        <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-12 font-black text-[10px] uppercase tracking-widest gap-2 group">
                            Civil Control <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="p-12 border-2 border-dashed border-slate-200 rounded-[3rem] text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="text-slate-300 w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Module Core Initialized</h3>
                <p className="max-w-md mx-auto text-slate-500 font-medium">This industry-specific stream is currently syncing operational data. Full site telemetry and biometric integrations will be activated once the project registry is synchronized.</p>
            </div>
        </div>
    );
}
