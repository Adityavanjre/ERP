
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, MoreHorizontal, Database, ArrowRightLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DynamicViewProps {
    modelName: string;
    appName: string;
}

export const DynamicView = ({ modelName, appName }: DynamicViewProps) => {
    const [records, setRecords] = useState<any[]>([]);
    const [model, setModel] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const syncNodeData = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const [recordsRes, appsRes] = await Promise.all([
                api.get(`/kernel/studio/records/${modelName}`),
                api.get(`/kernel/apps`)
            ]);

            setRecords(recordsRes.data.data || recordsRes.data || []);

            // Find model definition
            const currentApp = appsRes.data.find((a: any) => a.name === appName);
        } catch (err) {
            console.error("Node Data Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncNodeData(true);
        const interval = setInterval(() => syncNodeData(false), 30000);
        return () => clearInterval(interval);
    }, [modelName]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white flex items-center">
                        <Database className="mr-3 h-8 w-8 text-indigo-400" />
                        {modelName.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                    </h2>
                    <p className="text-zinc-500 mt-1">Direct system access to {modelName} architecture.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="border-white/10 bg-white/5 text-zinc-400">
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Import/Export
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-6">
                        <Plus className="mr-2 h-4 w-4" /> New Record
                    </Button>
                </div>
            </div>

            <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-white/5 border-b border-white/5 flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-4 flex-1 max-w-sm">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                            <input
                                placeholder="Search records..."
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <Button variant="outline" size="icon" className="border-white/5 bg-white/5 text-zinc-500">
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-zinc-500 w-[100px]">ID</TableHead>
                                <TableHead className="text-zinc-500">Display Name</TableHead>
                                <TableHead className="text-zinc-500 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((record) => (
                                <TableRow key={record.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                    <TableCell className="font-mono text-[10px] text-zinc-600">
                                        {record.id.slice(0, 8)}...
                                    </TableCell>
                                    <TableCell className="font-medium text-white">
                                        {record.name || record.label || "Unnamed Record"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {records.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-32 text-zinc-600 italic">
                                        No flux nodes detected in this class.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
