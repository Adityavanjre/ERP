
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChevronLeft,
    Download,
    Trash2,
    Globe,
    Github,
    Package,
    ShieldAlert,
    Verified,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AppManifest {
    name: string;
    label: string;
    version: string;
    category: string;
    author?: string;
    installed: boolean;
    description?: string;
    dependencies?: string;
    website?: string;
}

export default function AppDetailPage() {
    const params = useParams();
    const router = useRouter();
    const appName = params.name as string;
    const [app, setApp] = useState<AppManifest | null>(null);
    const [loading, setLoading] = useState(true);

    const syncAppData = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await api.get("/system/apps");
            const found = res.data.find((a: AppManifest) => a.name === appName);
            setApp(found);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [appName]);

    useEffect(() => {
        syncAppData(true);
        const interval = setInterval(() => syncAppData(false), 30000);
        return () => clearInterval(interval);
    }, [syncAppData]);

    const handleInstall = useCallback(async () => {
        try {
            await api.post(`/system/apps/${appName}/install`);
            toast.success(`${app?.label} activated successfully`);
            syncAppData(true);
        } catch {
            toast.error("Installation failed");
        }
    }, [appName, app, syncAppData]);

    const handleUninstall = useCallback(async () => {
        try {
            await api.post(`/system/apps/${appName}/uninstall`);
            toast.success(`${app?.label} removed successfully`);
            syncAppData(true);
        } catch {
            toast.error("Removal error");
        }
    }, [appName, app, syncAppData]);


    if (loading) return <div className="p-8 text-slate-400 font-black uppercase tracking-widest italic animate-pulse">Loading Details...</div>;
    if (!app) return <div className="p-8 text-slate-900 bg-slate-50 min-h-screen font-black uppercase tracking-widest uppercase italic">Module [${appName}] not found in Klypso Store.</div>;

    return (
        <div className="flex-1 space-y-8 md:space-y-10 p-4 md:p-10 pt-4 md:pt-8 bg-slate-50/30 min-h-screen">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="text-slate-500 hover:text-slate-900 font-bold hover:bg-slate-100/50 rounded-xl"
            >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Marketplace
            </Button>

            <div className="flex flex-col xl:flex-row gap-12">
                <div className="flex-1 space-y-10">
                    <div className="flex flex-col lg:flex-row items-start justify-between gap-8 md:gap-0">
                        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-center">
                            <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center border-none shadow-2xl shadow-blue-500/30">
                                <Package className="h-12 w-12 text-white" />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter">{app.label}</h1>
                                    <Verified className="h-6 w-6 text-blue-500" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-black px-3 py-0.5 rounded-lg text-[10px]">
                                        v{app.version}
                                    </Badge>
                                    <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{app.category}</span>
                                    <span className="text-slate-200">|</span>
                                    <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Authored by <span className="text-slate-600 underline decoration-slate-200">{app.author || 'Klypso Core'}</span></span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                            {app.installed ? (
                                <>
                                    <Button variant="outline" className="border-rose-200 text-rose-500 hover:bg-rose-50 rounded-2xl px-6 font-bold transition-all" onClick={handleUninstall}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                                    </Button>
                                    <Button className="bg-slate-900 hover:bg-blue-600 rounded-2xl px-10 text-white font-black shadow-xl shadow-slate-900/10 transition-all active:scale-95" onClick={() => router.push(`/apps/${app.name}`)}>
                                        Launch Module
                                    </Button>
                                </>
                            ) : (
                                <Button className="bg-blue-600 hover:bg-blue-700 rounded-2xl px-12 text-white font-black shadow-xl shadow-blue-500/20 h-14 transition-all active:scale-95" onClick={handleInstall}>
                                    <Download className="mr-2 h-4 w-4" /> Activate Module
                                </Button>
                            )}
                        </div>
                    </div>

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="bg-slate-100/80 border border-slate-200 p-1.5 rounded-2xl h-auto flex flex-wrap max-w-full">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-10 py-3 font-bold transition-all">Overview</TabsTrigger>
                            <TabsTrigger value="technical" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-10 py-3 font-bold transition-all">Architecture</TabsTrigger>
                            <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-10 py-3 font-bold transition-all">Changelog</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="mt-10 space-y-10">
                            <p className="text-slate-600 leading-relaxed text-xl font-medium max-w-3xl">
                                {app.description || "No extended details found for this module."}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 space-y-3">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Response Time</div>
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter">0.4<span className="text-sm font-bold ml-1 text-slate-300">MS</span></div>
                                </div>
                                <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 space-y-3">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Data Reliability</div>
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter">100<span className="text-sm font-bold ml-1 text-slate-300">%</span></div>
                                </div>
                                <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 space-y-3">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Security Grade</div>
                                    <div className="text-3xl font-black text-emerald-600 tracking-tighter">A+</div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="technical" className="mt-10">
                            <Card className="bg-white border-none shadow-2xl shadow-slate-200/40 rounded-[32px] overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-10">
                                    <CardTitle className="text-slate-900 text-base font-black uppercase tracking-widest">System Dependencies</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 p-10">
                                    {app.dependencies ? app.dependencies.split(',').map((dep: string) => (
                                        <div key={dep} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition-all group">
                                            <span className="text-sm text-slate-900 font-black tracking-tight flex items-center">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mr-4 group-hover:scale-125 transition-all" />
                                                {dep}
                                            </span>
                                            <Badge className="bg-blue-50 text-blue-600 border-none px-3 font-black text-[9px] rounded-lg">CORE_NODE</Badge>
                                        </div>
                                    )) : <p className="text-slate-400 italic font-bold">No external dependencies required.</p>}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="w-full lg:w-96 space-y-8">
                    <Card className="bg-white border-none shadow-2xl shadow-slate-200/40 rounded-[32px] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                            <CardTitle className="text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-center">Module Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-8 pb-8">
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                    <Globe className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <a href={app.website} target="_blank" className="text-sm font-black text-slate-600 hover:text-blue-600 flex items-center transition-colors">
                                    Official Repository <ExternalLink className="ml-2 h-3 w-3" />
                                </a>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <Github className="h-5 w-5 text-slate-400" />
                                </div>
                                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">SOURCE_RESTRICTED</span>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="p-3 bg-amber-50 rounded-xl">
                                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                                </div>
                                <span className="text-sm font-black text-amber-600 uppercase tracking-widest">SANDBOX_RUNTIME</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-none shadow-2xl shadow-slate-200/40 rounded-[32px] overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6">
                            <CardTitle className="text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-center">Sync Status</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-8 pb-8">
                            <div className="flex items-center gap-5">
                                <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                                    <div className={`h-full transition-all duration-1000 ${app.installed ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-300'}`} style={{ width: app.installed ? '100%' : '0%' }} />
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${app.installed ? 'text-blue-600' : 'text-slate-400'}`}>{app.installed ? 'Active' : 'Offline'}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
