
"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LayoutGrid, Download, Trash2, ExternalLink, ShieldCheck, CheckCircle, Package, Zap, Smartphone, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useUX } from "@/components/providers/ux-provider";

interface SystemApp {
    id: string;
    name: string;
    label: string;
    description: string;
    version: string;
    author: string;
    category: string;
    installed: boolean;
}

export default function AppsMarketplace() {
    const { showConfirm } = useUX();
    const [apps, setApps] = useState<SystemApp[]>([]);
    const [loading, setLoading] = useState(true);

    const syncAppData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await api.get("system/apps");
            setApps(res.data);
        } catch (err) {
            // Suppressed in prod: App sync failed silently
            toast.error("Failed to load apps. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        syncAppData(true);
        const interval = setInterval(() => syncAppData(false), 30000);
        return () => clearInterval(interval);
    }, [syncAppData]);

    const handleUninstall = useCallback((name: string) => {
        showConfirm({
            title: "Remove Module?",
            description: `This will remove the [${name}] module from your system. Any data specific to this module might become inaccessible.`,
            confirmText: "Uninstall",
            variant: "destructive",
            onConfirm: async () => {
                try {
                    await api.post(`/system/apps/${name}/uninstall`);
                    toast.success(`Module [${name}] removed successfully`);
                    syncAppData(true);
                    window.dispatchEvent(new CustomEvent('system-apps-updated'));
                } catch {
                    toast.error("Failed to remove module");
                }
            }
        });
    }, [showConfirm, syncAppData]);

    const handleInstall = useCallback(async (name: string) => {
        try {
            await api.post(`/system/apps/${name}/install`);
            toast.success(`Module [${name}] installed successfully`);
            syncAppData(true);
            window.dispatchEvent(new CustomEvent('system-apps-updated'));
        } catch {
            toast.error("Installation failed");
        }
    }, [syncAppData]);

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <LayoutGrid className="mr-4 h-9 w-9 text-blue-600 shadow-sm" />
                        Apps & Modules
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Install and manage add-on modules for your business.</p>
                </div>
                <Button className="rounded-2xl bg-white border border-slate-200 text-slate-600 shadow-sm font-bold h-11 px-5" variant="outline">
                    <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600" /> System Verified
                </Button>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none border-t-4 border-t-emerald-500">
                    <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 py-6">
                        <CardTitle className="text-slate-900 flex items-center gap-3 font-black text-xl">
                            <Smartphone className="h-5 w-5 text-emerald-600" />
                            Nexus Mobile Gateway
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Direct Enterprise Rollout • Build 1.0.0 (Hardened)</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-4">
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Access your ERP from the shop floor with the native Android application.
                                Securely anchored to your enterprise identity.
                            </p>
                            <div className="flex gap-4">
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl h-12 px-6 shadow-lg shadow-emerald-500/20"
                                    onClick={() => {
                                        toast.success("Initializing Secure Download...");
                                        window.open("/nexus-gateway-v1.apk", "_blank");
                                    }}
                                >
                                    <Download className="mr-2 h-5 w-5" /> Download APK
                                </Button>
                            </div>
                        </div>
                        <div className="hidden md:flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <QrCode className="h-24 w-24 text-slate-300 mb-2" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Scan to Install</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none border-t-4 border-t-blue-500">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                        <CardTitle className="text-slate-900 flex items-center gap-3 font-black text-xl">
                            <Zap className="h-5 w-5 text-blue-600" />
                            Business Blueprints
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Install pre-configured business setups in a single click</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4 pt-8">
                        {["Manufacturing", "Retail", "Wholesale", "Services"].map(type => (
                            <Button
                                key={type}
                                className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-500/50 rounded-2xl h-12 px-6 font-bold shadow-sm transition-all"
                                variant="outline"
                                onClick={async () => {
                                    try {
                                        await api.post("system/apps/preset", { type });
                                        toast.success(`${type} blueprint sequence initiated`);
                                        syncAppData(true);
                                        window.dispatchEvent(new CustomEvent('system-apps-updated'));
                                    } catch {
                                        toast.error("Blueprint installation failed");
                                    }
                                }}
                            >
                                {type} Profile
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {apps.map((app) => (
                    <Card key={app.id} className="bg-white border-slate-200 shadow-lg shadow-slate-200/40 rounded-3xl group overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-blue-500/5 transition-all outline outline-0 hover:outline-2 hover:outline-blue-500/20">
                        <div className={`h-2.5 w-full transition-colors ${app.installed ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                        <CardHeader className="flex-1 px-8 pt-8">
                            <div className="flex justify-between items-start mb-6">
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] rounded-lg border-none uppercase tracking-widest">{app.category}</Badge>
                                {app.installed && <div className="bg-emerald-50 p-1.5 rounded-full"><CheckCircle className="h-4 w-4 text-emerald-600" /></div>}
                            </div>
                            <Link href={`/apps/market/${app.name}`}>
                                <CardTitle className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center cursor-pointer tracking-tight">
                                    <Package className="mr-3 h-6 w-6 text-blue-500/50" />
                                    {app.label}
                                </CardTitle>
                            </Link>
                            <CardDescription className="text-slate-500 mt-4 text-sm leading-relaxed font-medium">
                                {app.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 pt-0">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-6 bg-slate-50 p-2 rounded-xl">
                                <span>BUILD_{app.version}</span>
                                <span>CREATED BY {app.author.toUpperCase()}</span>
                            </div>
                            <div className="flex gap-3 w-full">
                                {app.installed ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-black rounded-2xl h-11"
                                        onClick={() => handleUninstall(app.name)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" /> Remove Module
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl h-11 shadow-lg shadow-blue-500/20"
                                        onClick={() => handleInstall(app.name)}
                                    >
                                        <Download className="h-4 w-4 mr-2" /> Install Module
                                    </Button>
                                )}
                                <Link href={`/apps/market/${app.name}`}>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 bg-slate-50 border border-slate-100 text-slate-400 rounded-2xl hover:bg-white hover:border-slate-300">
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {apps.length === 0 && !loading && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <Package className="h-20 w-20 text-slate-200 mb-6" />
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Apps Installed</h3>
                        <p className="text-slate-400 mt-2 font-bold">No apps or modules are currently installed.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
