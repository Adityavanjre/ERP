"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Building2, ChevronRight, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    role: string;
    isOnboarded: boolean;
}

export function TenantSelector() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchTenants = async () => {
            try {
                // Ensure we use the identity token for fetching tenants
                const token = localStorage.getItem("k_identity") || localStorage.getItem("k_token");
                const res = await api.get("auth/tenants", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTenants(res.data);

                // If the user has NO tenants, they MUST onboard.
                if (res.data.length === 0) {
                    router.push("/onboarding");
                }
            } catch (err) {
                console.error("Failed to fetch tenants", err);
                toast.error("Session expired. Please log in again.");
                handleLogout();
            } finally {
                setLoading(false);
            }
        };

        fetchTenants();
    }, []);

    const handleSelect = async (tenantId: string) => {
        setSelecting(tenantId);
        try {
            const token = localStorage.getItem("k_identity") || localStorage.getItem("k_token");
            const res = await api.post("auth/select-tenant",
                { tenantId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            localStorage.setItem("k_token", res.data.accessToken);

            // Force a hard reload to reset all states/context with the new scoped token
            window.location.href = "/dashboard";
        } catch (err) {
            toast.error("Failed to select workspace");
            setSelecting(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("k_token");
        localStorage.removeItem("k_user");
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="flex bg-slate-50 h-screen w-screen items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex bg-slate-50 min-h-screen w-screen items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.05),transparent)]" />

            <div className="w-full max-w-lg relative z-10">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/20">
                            K
                        </div>
                        <span className="font-black text-slate-900 tracking-tighter text-xl uppercase italic">Klypso</span>
                    </div>
                    <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-rose-600 font-bold text-xs uppercase tracking-widest gap-2">
                        <LogOut size={14} /> Sign Out
                    </Button>
                </div>

                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
                    <CardHeader className="bg-slate-900 text-white p-10 pb-12">
                        <CardTitle className="text-3xl font-black tracking-tight mb-2 italic">Select Workspace</CardTitle>
                        <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                            Choose a company to access your dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 -mt-6 bg-white rounded-t-[2.5rem]">
                        <div className="space-y-3">
                            {tenants.map((tenant) => (
                                <button
                                    key={tenant.id}
                                    onClick={() => handleSelect(tenant.id)}
                                    disabled={!!selecting}
                                    className="w-full group flex items-center justify-between p-5 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors shadow-sm">
                                            <Building2 className="text-slate-400 group-hover:text-blue-600 transition-colors" size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-lg tracking-tight font-sans">
                                                {tenant.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{tenant.role}</span>
                                                <span className="text-[10px] text-slate-400">•</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                        {selecting === tenant.id ? (
                                            <Loader2 className="animate-spin" size={16} />
                                        ) : (
                                            <ChevronRight size={16} />
                                        )}
                                    </div>
                                </button>
                            ))}

                            <button
                                onClick={() => router.push("/onboarding")}
                                className="w-full flex items-center justify-center gap-3 p-5 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-all font-bold uppercase text-[10px] tracking-widest"
                            >
                                <Plus size={16} /> Create New Workspace
                            </button>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-8">
                    Secure Enterprise Managed Access • Nexus ERP
                </p>
            </div>
        </div>
    );
}
