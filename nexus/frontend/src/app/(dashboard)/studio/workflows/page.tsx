
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    GitBranch,
    Plus,
    Save,
    ArrowRight,
    Zap,
    Play,
    CheckCircle2,
    Circle,
    Activity,
    Settings2,
    Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function WorkflowBuilder() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
    const [modelName, setModelName] = useState("sale.order");
    const [workflowName, setWorkflowName] = useState("");

    const [nodes, setNodes] = useState<any[]>([]);
    const [transitions, setTransitions] = useState<any[]>([]);

    const fetchWorkflows = async () => {
        try {
            const res = await api.get(`/kernel/workflows/${modelName}`);
            setWorkflows(res.data);
            if (res.data.length > 0 && !selectedWorkflow) {
                // Pre-select first or active
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, [modelName]);

    const handleCreateWorkflow = async () => {
        try {
            if (!workflowName) return toast.error("Name required");
            const res = await api.post("/kernel/workflows", { name: workflowName, modelName });
            toast.success("Workflow stream initialized");
            setWorkflowName("");
            fetchWorkflows();
            setSelectedWorkflow(res.data);
        } catch (err) {
            toast.error("Initialization failed");
        }
    };

    const addNode = async () => {
        if (!selectedWorkflow) return;
        try {
            const res = await api.post(`/kernel/workflows/${selectedWorkflow.id}/nodes`, {
                name: "New State",
                type: "state",
                config: {}
            });
            setSelectedWorkflow({
                ...selectedWorkflow,
                nodes: [...(selectedWorkflow.nodes || []), res.data]
            });
            toast.success("State node added to graph");
        } catch (err) {
            toast.error("Node creation failed");
        }
    };

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center">
                        <GitBranch className="mr-3 h-8 w-8 text-emerald-600" />
                        Workflow Engine
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Design state machines and automation logic for enterprise objects.</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-4">
                <Card className="bg-white border-slate-200 shadow-sm lg:col-span-1">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-slate-900 text-[10px] font-black uppercase tracking-widest flex items-center">
                            <Activity className="mr-2 h-4 w-4 text-emerald-600" />
                            Active Streams
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Object Class</Label>
                            <Input
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                className="bg-slate-50 border-slate-200 text-slate-900 h-9 font-mono text-xs"
                            />
                        </div>

                        <div className="pt-4 space-y-2">
                            {workflows.map(w => (
                                <div
                                    key={w.id}
                                    onClick={() => setSelectedWorkflow(w)}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedWorkflow?.id === w.id ? 'bg-emerald-50 border-emerald-500 shadow-sm shadow-emerald-500/10' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}
                                >
                                    <p className="text-sm font-bold text-slate-900">{w.name}</p>
                                    <Badge variant="outline" className="mt-2 text-[9px] font-black border-emerald-500/20 text-emerald-600 bg-white">
                                        {w.isActive ? 'RUNNING' : 'DRAFT'}
                                    </Badge>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-2">
                            <Input
                                placeholder="New Workflow Name..."
                                value={workflowName}
                                onChange={(e) => setWorkflowName(e.target.value)}
                                className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-9"
                            />
                            <Button onClick={handleCreateWorkflow} className="w-full bg-slate-900 hover:bg-black text-white h-9 font-bold uppercase tracking-widest text-[10px]">
                                <Plus className="mr-2 h-4 w-4" /> Initialize
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl lg:col-span-3 min-h-[600px] flex flex-col rounded-3xl overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-slate-900 font-black text-xl tracking-tight">
                                    {selectedWorkflow ? selectedWorkflow.name : "Select a lifecycle stream"}
                                </CardTitle>
                                <CardDescription className="text-slate-500 font-medium">Graph-based logic for {modelName}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={addNode} disabled={!selectedWorkflow} variant="outline" className="border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50">
                                    <Plus className="mr-2 h-4 w-4" /> Add State
                                </Button>
                                <Button disabled={!selectedWorkflow} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                    <Save className="mr-2 h-4 w-4" /> Commit Changes
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat bg-slate-50/50">
                        {!selectedWorkflow ? (
                            <div className="h-full flex items-center justify-center text-slate-400 italic flex-col gap-4">
                                <GitBranch className="h-16 w-16 opacity-10 text-slate-900" />
                                <p className="font-bold text-lg opacity-40">Ready to Architecture</p>
                            </div>
                        ) : (
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {selectedWorkflow.nodes?.map((node: any) => (
                                    <Card key={node.id} className="bg-indigo-950 border-none shadow-2xl relative group overflow-hidden rounded-[32px]">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 shadow-[2px_0_10px_rgba(16,185,129,0.3)] transition-all group-hover:w-2" />
                                        <CardHeader className="pb-4 pt-6 px-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <Badge className="bg-white/10 text-emerald-400 border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-md">{node.type}</Badge>
                                                <Settings2 className="h-4 w-4 text-slate-600 cursor-pointer hover:text-white transition-colors" />
                                            </div>
                                            <CardTitle className="text-lg font-black text-white tracking-tight">{node.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-6 pb-6 pt-0">
                                            <div className="space-y-3">
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group-hover:border-emerald-500/30 transition-all">
                                                    <div className="flex items-center gap-2">
                                                        <Zap className="h-3 w-3 text-emerald-400" />
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">On Create</span>
                                                    </div>
                                                    <span className="text-[9px] text-slate-500 font-black uppercase hover:text-white cursor-pointer transition-colors">Script</span>
                                                </div>
                                                <Button variant="ghost" className="w-full justify-start text-[10px] h-9 text-emerald-400 font-black uppercase tracking-widest hover:bg-emerald-500/10 rounded-xl transition-all">
                                                    <Plus className="mr-2 h-4 w-4" /> Add Protocol
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                <div
                                    onClick={addNode}
                                    className="border-4 border-dashed border-slate-200 rounded-[32px] flex items-center justify-center cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-slate-200 hover:text-emerald-500 py-12"
                                >
                                    <Plus className="h-12 w-12" />
                                </div>
                            </div>
                        )}

                        {/* Legend / Stats overlay */}
                        <div className="absolute bottom-6 right-6 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xl">
                            <div className="flex items-center gap-6 text-[10px] font-black tracking-widest uppercase">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-slate-500">States: {selectedWorkflow?.nodes?.length || 0}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                                    <span className="text-slate-500">Triggers: 0</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    <span className="text-slate-500">Complexity: Low</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
