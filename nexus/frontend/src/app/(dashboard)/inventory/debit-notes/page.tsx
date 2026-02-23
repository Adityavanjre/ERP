"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Plus, Search, Filter, RefreshCw, FileText, BadgeCheck } from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function DebitNotesPage() {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await api.get("/accounting/debit-notes");
            setNotes(res.data);
        } catch (err) {
            console.error("Failed to fetch debit notes", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const filteredNotes = notes.filter(n =>
        n.noteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Truck className="w-8 h-8 text-indigo-600" />
                        Debit Notes
                    </h1>
                    <p className="text-slate-500 font-medium">Manage purchase returns and supplier debits</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchNotes} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200">
                        <Plus className="w-4 h-4 mr-2" />
                        Issue Debit Note
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by number or supplier..."
                                className="pl-10 bg-slate-50 border-slate-200 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                <Filter className="w-3 h-3 mr-2" />
                                Filter
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest pl-6">Note #</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Supplier</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Date</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">PO Ref</TableHead>
                                <TableHead className="font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right pr-6">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">Loading debit notes...</TableCell>
                                </TableRow>
                            ) : filteredNotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-4 bg-slate-100 rounded-full">
                                                <FileText className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-slate-400 font-bold">No debit notes found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredNotes.map((note) => (
                                <TableRow key={note.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer">
                                    <TableCell className="pl-6 py-4">
                                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {note.noteNumber}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-700">{note.supplier?.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">{note.supplier?.category || "General"}</div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 font-medium">
                                        {format(new Date(note.date), "dd MMM yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="rounded-lg font-mono text-[10px]">
                                            {note.purchaseOrder?.orderNumber || "Direct Debit"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 font-black text-blue-600 tabular-nums">
                                        ₹{Number(note.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
