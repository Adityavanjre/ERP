
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Plus, Trash2, Save, Layers, Database, PanelsTopLeft, GitBranch, ShieldCheck, Send } from "lucide-react";
import { toast } from "sonner";

export default function StudioPage() {
    const [appName, setAppName] = useState("custom_app");
    const [modelName, setModelName] = useState("");
    const [modelLabel, setModelLabel] = useState("");
    const [fields, setFields] = useState<any[]>([
        { name: "name", label: "Display Name", type: "Char", required: true }
    ]);

    const addField = () => {
        setFields([...fields, { name: "", label: "", type: "Char", required: false }]);
    };

    const updateField = (index: number, key: string, value: any) => {
        const newFields = [...fields];
        newFields[index][key] = value;
        setFields(newFields);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        try {
            if (!modelName || !modelLabel) {
                toast.error("Model technical name and label are required");
                return;
            }

            const payload = {
                appName,
                name: modelName,
                label: modelLabel,
                fields: fields
            };

            await api.post("kernel/studio/models", payload);
            toast.success(`Object [${modelLabel}] created in system!`);

            // Reset
            setModelName("");
            setModelLabel("");
            setFields([{ name: "name", label: "Display Name", type: "Char", required: true }]);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Creation failed");
        }
    };

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center">
                        <Wand2 className="mr-3 h-8 w-8 text-fuchsia-600" />
                        Klypso Logic Studio
                    </h2>
                    <p className="text-slate-500 mt-1 font-medium">Design custom business objects and automated workflows without code.</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <Button variant="ghost" className="bg-fuchsia-50 text-fuchsia-700 font-bold rounded-lg px-6">
                        <Database className="mr-2 h-4 w-4" /> Object Builder
                    </Button>
                    <Link href="/studio/workflows">
                        <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold rounded-lg px-6">
                            <GitBranch className="mr-2 h-4 w-4" /> Workflows
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl lg:col-span-1 overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="text-slate-900 flex items-center font-black text-lg">
                            <PanelsTopLeft className="mr-2 h-4 w-4 text-fuchsia-600" />
                            App Settings
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Select app and define object details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">App Name</Label>
                            <Input
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                                className="bg-slate-50 border-slate-200 text-slate-900 font-semibold"
                                placeholder="e.g. sales"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">System Name (e.g. vehicle_log)</Label>
                            <Input
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                className="bg-slate-50 border-slate-200 text-slate-900 font-semibold"
                                placeholder="e.g. custom_vehicle"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Display Label</Label>
                            <Input
                                value={modelLabel}
                                onChange={(e) => setModelLabel(e.target.value)}
                                className="bg-slate-50 border-slate-200 text-slate-900 font-semibold"
                                placeholder="e.g. Company Vehicle"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl lg:col-span-2 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b border-slate-100">
                        <div>
                            <CardTitle className="text-slate-900 flex items-center font-black text-lg">
                                <Layers className="mr-2 h-4 w-4 text-fuchsia-600" />
                                Field Definitions
                            </CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Define the fields for this object.</CardDescription>
                        </div>
                        <Button onClick={addField} variant="outline" className="border-fuchsia-200 text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 font-bold rounded-xl">
                            <Plus className="mr-2 h-4 w-4" /> Add Field
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {fields.map((field, index) => (
                            <div key={index} className="flex gap-4 items-end p-4 rounded-xl bg-slate-50/50 border border-slate-100 group relative transition-all hover:bg-white hover:shadow-md">
                                <div className="flex-1 space-y-2">
                                    <Label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">System Name</Label>
                                    <Input
                                        value={field.name}
                                        onChange={(e) => updateField(index, 'name', e.target.value)}
                                        className="bg-white border-slate-200 text-slate-900 h-9 text-sm font-semibold"
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Label</Label>
                                    <Input
                                        value={field.label}
                                        onChange={(e) => updateField(index, 'label', e.target.value)}
                                        className="bg-white border-slate-200 text-slate-900 h-9 text-sm font-semibold"
                                    />
                                </div>
                                <div className="w-[150px] space-y-2">
                                    <Label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Field Type</Label>
                                    <Select
                                        value={field.type}
                                        onValueChange={(val) => updateField(index, 'type', val)}
                                    >
                                        <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-9 text-sm font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200 text-slate-900">
                                            <SelectItem value="Char">Char (Text)</SelectItem>
                                            <SelectItem value="Text">Text (Long)</SelectItem>
                                            <SelectItem value="Integer">Integer</SelectItem>
                                            <SelectItem value="Float">Float / Decimal</SelectItem>
                                            <SelectItem value="Boolean">Boolean</SelectItem>
                                            <SelectItem value="Date">Date</SelectItem>
                                            <SelectItem value="Many2One">Relation (Look-up)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                    onClick={() => removeField(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}

                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                            <Button
                                onClick={handleGenerate}
                                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold px-8 rounded-xl shadow-lg shadow-fuchsia-500/20 py-6"
                            >
                                <Database className="mr-2 h-5 w-5" /> Create Custom Object
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl lg:col-span-1 overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <CardTitle className="text-slate-900 flex items-center font-black text-lg">
                            <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />
                            Permissions
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Grant permissions to system roles.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        {["Admin", "Manager", "Employee", "Viewer"].map(role => (
                            <div key={role} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-xs text-slate-600 font-bold uppercase tracking-wide">{role}</span>
                                <div className="flex gap-1">
                                    <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black border border-emerald-200">R</div>
                                    <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black border border-emerald-200">W</div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
