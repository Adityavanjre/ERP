"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserPlus, Search, Filter, Mail, Building, Phone, Sparkles, X, Save, Trash2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useUX } from "@/components/providers/ux-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

export default function CrmPage() {
    const router = useRouter();
    const { showConfirm, setUILocked } = useUX();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ totalCustomers: 0, leads: 0, pipelineValue: 0, openDeals: 0 });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showDealForm, setShowDealForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Edit Mode
    const [editingDeal, setEditingDeal] = useState<any>(null);

    const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "", address: "", state: "", gstin: "" });
    const [dealData, setDealData] = useState({ title: "", value: "", customerId: "", stage: "New" });

    const isDirty = showForm || showDealForm ||
        formData.firstName !== "" ||
        dealData.title !== "";

    useUnsavedChanges(isDirty);

    const [custPage, setCustPage] = useState(1);
    const [custTotalPages, setCustTotalPages] = useState(1);

    const syncRelations = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const [custRes, statsRes, oppRes] = await Promise.all([
                api.get(`/crm/customers?page=${custPage}&limit=50`),
                api.get("crm/stats"),
                api.get("crm/opportunities").catch(() => ({ data: [] }))
            ]);

            if (custRes.data.data) {
                setCustomers(custRes.data.data);
                setCustTotalPages(custRes.data.meta.totalPages);
            } else {
                setCustomers(custRes.data);
            }

            setStats(statsRes.data);
            setOpportunities(oppRes.data || []);
        } catch (err) {
            console.error("Relations Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncRelations(true);
        // CONTINUOUS BACKGROUND SYNC: 30s interval
        const interval = setInterval(() => syncRelations(false), 30000);
        return () => clearInterval(interval);
    }, [custPage]);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csv = event.target?.result as string;
            try {
                if (typeof csv !== 'string') return;
                const loadingToast = toast.loading("Importing customers...");

                const res = await api.post("crm/import", { csv });
                toast.dismiss(loadingToast);

                toast.success(`Imported: ${res.data.imported} customers.`);
                if (res.data.failed > 0) {
                    toast.warning(`${res.data.failed} rows failed. Check console.`);
                    console.warn(res.data.errors);
                }
                fetchData();
            } catch (err) {
                toast.dismiss();
                toast.error("Import failed");
            }
        };
        reader.readAsText(file);
    };

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            setUILocked(true);
            await api.post("crm/customers", formData);
            setShowForm(false);
            setFormData({ firstName: "", lastName: "", email: "", phone: "", company: "", address: "", state: "", gstin: "" });
            toast.success("Customer created successfully");
            fetchData();
        } catch (err) {
            toast.error("Failed to create customer");
        } finally {
            setIsSubmitting(false);
            setUILocked(false);
        }
    };

    const handleDeleteCustomer = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        showConfirm({
            title: "Delete Customer?",
            description: "This will remove the customer and all associated history. This action cannot be undone.",
            confirmText: "Delete",
            variant: "destructive",
            onConfirm: async () => {
                try {
                    setUILocked(true);
                    await api.delete(`/crm/customers/${id}`);
                    toast.success("Customer deleted successfully");
                    fetchData();
                } catch (err: any) {
                    toast.error(err.response?.data?.message || "Delete failed");
                } finally {
                    setUILocked(false);
                }
            }
        });
    };

    const handleCreateDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setUILocked(true);
            await api.post("crm/opportunities", {
                ...dealData,
                value: Number(dealData.value)
            });
            setShowDealForm(false);
            setDealData({ title: "", value: "", customerId: "", stage: "New" });
            toast.success("Deal created successfully");
            fetchData();
        } catch (err) {
            toast.error("Failed to create deal");
        } finally {
            setUILocked(false);
        }
    };

    const handleUpdateDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDeal) return;
        try {
            setUILocked(true);
            // Optimistic update
            setOpportunities(prev => prev.map(o => o.id === editingDeal.id ? { ...editingDeal, value: Number(editingDeal.value) } : o));

            await api.post(`/crm/opportunities/${editingDeal.id}`, {
                title: editingDeal.title,
                value: Number(editingDeal.value),
                stage: editingDeal.stage
            });
            setEditingDeal(null);
            toast.success("Deal parameters updated");
            fetchData();
        } catch (err) {
            toast.error("Update sequence failed");
            fetchData();
        } finally {
            setUILocked(false);
        }
    };

    const moveStage = async (id: string, newStage: string) => {
        try {
            setOpportunities(prev => prev.map(o => o.id === id ? { ...o, stage: newStage } : o));
            await api.post(`/crm/opportunities/${id}`, { stage: newStage });
            toast.success(`Deal moved to ${newStage}`);
            fetchData();
        } catch (err) {
            toast.error("Failed to move deal");
            fetchData();
        }
    };

    const filteredCustomers = customers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.company || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stages = ["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

    if (loading) return <LoadingSpinner className="h-full" text="Loading CRM data..." />;

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Users className="mr-4 h-9 w-9 text-blue-600 shadow-sm" />
                        Strategic Relations
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage entity relationships, value-chain flux, and strategic contact nodes.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Input type="file" accept=".csv" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        <Button className="rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm font-bold h-11 px-5">
                            <Upload className="mr-2 h-4 w-4" /> Nexus Batch-Sync
                        </Button>
                    </div>
                    <Button className="rounded-2xl bg-amber-50 border border-amber-100 hover:bg-amber-100/50 text-amber-700 shadow-sm font-bold h-11 px-5" onClick={() => setShowDealForm(!showDealForm)}>
                        <Sparkles className="mr-2 h-4 w-4" /> Flux Opportunity
                    </Button>
                    <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold px-8 shadow-lg shadow-blue-500/20 text-white h-11" onClick={() => setShowForm(!showForm)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Initialize Entity
                    </Button>
                </div>
            </div>

            {/* Forms Section */}
            {showForm && (
                <Card className="bg-white border-slate-200 shadow-2xl shadow-slate-200/50 rounded-3xl mb-8 animate-in fade-in slide-in-from-top-4 overflow-hidden border-t-4 border-t-blue-500">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-6">
                        <CardTitle className="text-slate-900 font-black text-xl">Add New Customer</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">First Name <span className="text-rose-500">*</span></Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Last Name</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Primary Email</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} type="email" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Mobile/Phone</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Organization</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Street Address</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">State / Province</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20" placeholder="Required for Tax Compliance" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Tax ID (GSTIN)</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 focus:ring-blue-500/20 uppercase" value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value })} />
                            </div>
                            <div className="flex items-end md:col-span-1">
                                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-blue-500/10">
                                    {isSubmitting ? "Saving..." : "Create Customer"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {showDealForm && (
                <Card className="bg-white border-slate-200 shadow-2xl shadow-slate-200/50 rounded-3xl mb-8 animate-in fade-in slide-in-from-top-4 overflow-hidden border-t-4 border-t-amber-500">
                    <CardHeader className="bg-amber-50/50 border-b border-amber-100 py-6">
                        <CardTitle className="text-amber-900 flex items-center gap-3 font-black text-xl">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            Create New Deal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateDeal} className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6">
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Deal/Quote Title</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11" placeholder="e.g. Annual Maintenance Contract" value={dealData.title} onChange={e => setDealData({ ...dealData, title: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Estimated Value (₹)</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11" type="number" value={dealData.value} onChange={e => setDealData({ ...dealData, value: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Associated Client</Label>
                                <Select value={dealData.customerId} onValueChange={v => setDealData({ ...dealData, customerId: v })}>
                                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11">
                                        <SelectValue placeholder="Select customer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.company})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-4 flex justify-end gap-3">
                                <Button type="button" variant="ghost" onClick={() => setShowDealForm(false)}>Cancel</Button>
                                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Launch Deal</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Edit Deal Modal */}
            <Dialog open={!!editingDeal} onOpenChange={(open) => !open && setEditingDeal(null)}>
                <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-[425px] rounded-[32px] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Deal</DialogTitle>
                    </DialogHeader>
                    {editingDeal && (
                        <form onSubmit={handleUpdateDeal} className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Deal Title</Label>
                                <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-2xl h-12" value={editingDeal.title} onChange={e => setEditingDeal({ ...editingDeal, title: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Value (₹)</Label>
                                <Input type="number" className="bg-slate-50 border-slate-200 text-slate-900 rounded-2xl h-12" value={editingDeal.value} onChange={e => setEditingDeal({ ...editingDeal, value: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Status Stage</Label>
                                <Select value={editingDeal.stage} onValueChange={v => setEditingDeal({ ...editingDeal, stage: v })}>
                                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-2xl h-12">
                                        <SelectValue placeholder="Select Stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <Button type="button" variant="ghost" className="font-bold text-slate-500" onClick={() => setEditingDeal(null)}>Cancel</Button>
                                <Button type="submit" className="bg-slate-900 hover:bg-black text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10"><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>


            <Tabs defaultValue="pipeline" className="space-y-8">
                <TabsList className="bg-slate-100 border-slate-200 p-1.5 rounded-2xl h-auto">
                    <TabsTrigger value="pipeline" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-8 py-2.5 font-bold transition-all">Conversion Flow</TabsTrigger>
                    <TabsTrigger value="customers" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-xl px-8 py-2.5 font-bold transition-all">Entity Directory</TabsTrigger>
                </TabsList>

                <TabsContent value="pipeline" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-blue-500">
                            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidity Forecast</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-black text-slate-900 tracking-tighter">₹{stats.pipelineValue?.toLocaleString('en-IN')}</div></CardContent>
                        </Card>
                        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden border-b-4 border-b-amber-500">
                            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Flux Opportunities</CardTitle></CardHeader>
                            <CardContent><div className="text-3xl font-black text-amber-600 tracking-tighter">{stats.openDeals}</div></CardContent>
                        </Card>
                    </div>

                    <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide">
                        {stages.map(stage => {
                            const stageOpps = opportunities.filter(o => o.stage === stage);
                            const total = stageOpps.reduce((sum, o) => sum + Number(o.value), 0);

                            return (
                                <div key={stage} className="min-w-[340px] w-full bg-slate-100/50 border border-slate-200 rounded-3xl flex flex-col h-[65vh] shadow-inner">
                                    <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md rounded-t-3xl z-10 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs font-black text-slate-900 uppercase tracking-[0.15em]">{stage}</div>
                                            <Badge variant="secondary" className="bg-slate-200 text-slate-600 font-black text-[10px] rounded-lg border-none shadow-none">{stageOpps.length}</Badge>
                                        </div>
                                        <div className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">₹{(total / 1000).toFixed(1)}K</div>
                                    </div>
                                    <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                                        {stageOpps.map(opp => (
                                            <div onClick={() => setEditingDeal(opp)} key={opp.id} className="p-5 cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-2xl group transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5 active:scale-[0.98]">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="text-sm font-black text-slate-900 leading-tight truncate max-w-[180px]" title={opp.title}>{opp.title}</h4>
                                                    <div className="text-[11px] font-black text-emerald-600">₹{Number(opp.value).toLocaleString('en-IN')}</div>
                                                </div>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-black shadow-sm">
                                                        {opp.customer?.firstName?.[0]}
                                                    </div>
                                                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-tight truncate max-w-[160px]">{opp.customer?.firstName} {opp.customer?.lastName}</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-slate-100">
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        const idx = stages.indexOf(stage);
                                                        if (idx > 0) moveStage(opp.id, stages[idx - 1]);
                                                    }} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-30 text-slate-400 hover:text-blue-600 transition-all" disabled={stages.indexOf(stage) === 0}>
                                                        ←
                                                    </button>
                                                    <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest px-4">Move</span>
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        const idx = stages.indexOf(stage);
                                                        if (idx < stages.length - 1) moveStage(opp.id, stages[idx + 1]);
                                                    }} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-30 text-slate-400 hover:text-blue-600 transition-all" disabled={stages.indexOf(stage) === stages.length - 1}>
                                                        →
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {stageOpps.length === 0 && (
                                            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-300 gap-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest">Empty Stage</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="customers">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-slate-900 text-xl font-black">Customer Directory</CardTitle>
                                    <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Complete list of all customers</CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-96">
                                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search by name, organization or domain..."
                                            className="pl-12 bg-white border-slate-200 text-slate-900 rounded-2xl h-12 shadow-inner font-semibold focus:ring-blue-500/20"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-8">Customer</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Contact Info</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Company</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Balance Due</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Created</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCustomers.map((c) => (
                                        <TableRow
                                            key={c.id}
                                            className="border-slate-100 hover:bg-slate-50/50 transition-all cursor-pointer group"
                                            onClick={() => router.push(`/crm/${c.id}`)}
                                        >
                                            <TableCell className="pl-8">
                                                <div className="flex items-center">
                                                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-xs mr-4 shadow-lg shadow-blue-500/20">
                                                        {c.firstName?.[0]}{c.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-900 tracking-tight">{c.firstName} {c.lastName}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">#{c.id.slice(-6).toUpperCase()}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center text-xs text-slate-600 font-bold">
                                                        <Mail className="h-3 w-3 mr-2 text-blue-500" />
                                                        {c.email || "No email"}
                                                    </div>
                                                    <div className="flex items-center text-[11px] text-slate-400 font-medium">
                                                        <Phone className="h-3 w-3 mr-2" />
                                                        {c.phone || "No phone"}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-slate-500 text-xs">
                                                    <div className="flex items-center font-bold">
                                                        <Building className="h-3.5 w-3.5 mr-2 text-slate-300" />
                                                        {c.company || "Retail Client"}
                                                    </div>
                                                    {c.state && <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{c.state}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className={`text-sm font-black ${c.receivable > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                    ₹{Number(c.receivable || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-400 text-[11px] font-bold uppercase tracking-tighter">
                                                {new Date(c.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    onClick={(e) => handleDeleteCustomer(e, c.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredCustomers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold italic bg-slate-50/10">
                                                No customers found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            <div className="flex justify-between items-center px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                                <Button variant="ghost" size="sm" onClick={() => setCustPage(p => Math.max(1, p - 1))} disabled={custPage === 1} className="text-slate-500 hover:bg-white font-bold rounded-xl h-9">Previous</Button>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Page {custPage} / {custTotalPages}</span>
                                <Button variant="ghost" size="sm" onClick={() => setCustPage(p => Math.min(custTotalPages, p + 1))} disabled={custPage === custTotalPages} className="text-slate-500 hover:bg-white font-bold rounded-xl h-9">Next</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
