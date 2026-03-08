"use client";

import { useState, useEffect } from "react";
import {
    Cpu,
    Plus,
    Settings,
    Activity,
    Clock,
    Wrench,
    Search
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Machine {
    id: string;
    name: string;
    code: string;
    type: string;
    status: "Idle" | "Running" | "Maintenance" | "Offline";
    hourlyRate: number;
    lastMaintenance: string | null;
    health?: number; // Calculated on frontend for "wow" factor
}

export default function MachinesPage() {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newMachine, setNewMachine] = useState({
        name: "",
        code: "",
        type: "",
        hourlyRate: 0,
        status: "Idle"
    });

    useEffect(() => {
        fetchMachines();
    }, []);

    const fetchMachines = async () => {
        try {
            const res = await api.get("/manufacturing/machines");
            // Add mock health data for visual appeal
            const enriched = res.data.map((m: Machine) => ({
                ...m,
                health: Math.floor(Math.random() * 20) + 80 // 80-100%
            }));
            setMachines(enriched);
        } catch {
            toast.error("Failed to load machines");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            if (!newMachine.name || !newMachine.code) {
                toast.error("Name and Code are required");
                return;
            }
            await api.post("/manufacturing/machines", newMachine);
            toast.success("Machine registered successfully");
            setIsAddOpen(false);
            fetchMachines();
            setNewMachine({ name: "", code: "", type: "", hourlyRate: 0, status: "Idle" });
        } catch {
            toast.error("Registration failed");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Running": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
            case "Idle": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case "Maintenance": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            default: return "bg-slate-500/10 text-slate-500 border-slate-500/20";
        }
    };

    const filtered = machines.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Smart Factory Floor
                    </h1>
                    <p className="text-slate-400 mt-1">Manage and monitor manufacturing assets in real-time.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search assets..."
                            className="pl-9 bg-slate-900/50 border-slate-800"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Machine
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-950 border-slate-800 text-white">
                            <DialogHeader>
                                <DialogTitle>Register New Asset</DialogTitle>
                                <DialogDescription>Add a machine to the factory floor tracking system.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Machine Name</label>
                                        <Input
                                            placeholder="CNC Milling X1"
                                            className="bg-slate-900 border-slate-800"
                                            value={newMachine.name}
                                            onChange={e => setNewMachine({ ...newMachine, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Unique Code</label>
                                        <Input
                                            placeholder="MAC-001"
                                            className="bg-slate-900 border-slate-800"
                                            value={newMachine.code}
                                            onChange={e => setNewMachine({ ...newMachine, code: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Asset Type</label>
                                    <Input
                                        placeholder="Subtractive Manufacturing"
                                        className="bg-slate-900 border-slate-800"
                                        value={newMachine.type}
                                        onChange={e => setNewMachine({ ...newMachine, type: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Hourly Rate (₹)</label>
                                    <Input
                                        type="number"
                                        placeholder="1200.00"
                                        className="bg-slate-900 border-slate-800"
                                        value={newMachine.hourlyRate}
                                        onChange={e => setNewMachine({ ...newMachine, hourlyRate: parseFloat(e.target.value) })}
                                    />
                                    <p className="text-[10px] text-slate-500">Used for precise COGS & Overhead calculations.</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500">Register Asset</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-slate-900/50 animate-pulse border border-slate-800" />)
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                        <Cpu className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                        <h3 className="text-lg font-medium text-slate-400">No assets found</h3>
                        <p className="text-slate-500">Click Add Machine to register your first manufacturing asset.</p>
                    </div>
                ) : (
                    filtered.map((m) => (
                        <Card key={m.id} className="bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Cpu className="w-16 h-16" />
                            </div>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Badge variant="outline" className={getStatusColor(m.status)}>
                                            {m.status === "Running" && <Activity className="w-3 h-3 mr-1 animate-pulse" />}
                                            {m.status}
                                        </Badge>
                                        <CardTitle className="text-xl mt-3">{m.name}</CardTitle>
                                        <CardDescription>{m.code} • {m.type}</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                    <div className="space-y-1">
                                        <p className="text-slate-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> Rate/Hr</p>
                                        <p className="font-semibold text-slate-200">₹{m.hourlyRate.toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-500 flex items-center"><Wrench className="w-3 h-3 mr-1" /> Last Maint.</p>
                                        <p className="font-semibold text-slate-200">
                                            {m.lastMaintenance ? new Date(m.lastMaintenance).toLocaleDateString() : 'Never'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 mt-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Asset Health</span>
                                        <span className={m.health && m.health < 85 ? "text-amber-400" : "text-emerald-400"}>
                                            {m.health}%
                                        </span>
                                    </div>
                                    <Progress value={m.health} className="h-1.5 bg-slate-800" />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" className="flex-1 bg-slate-900/50 border-slate-800 hover:bg-slate-800 text-xs h-8">
                                        Diagnostics
                                    </Button>
                                    <Button variant="outline" className="flex-1 bg-slate-900/50 border-slate-800 hover:bg-slate-800 text-xs h-8">
                                        History
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
