
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Phone, Mail, Building, FileText, Wallet } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [customer, setCustomer] = useState<any>(null);
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const syncRelationDetail = async (showLoading = false) => {
        if (!params.id) return;
        try {
            if (showLoading) setLoading(true);
            const custRes = await api.get("/crm/customers");
            const found = custRes.data.find((c: any) => c.id === params.id);
            setCustomer(found);

            const ledgerRes = await api.get(`/accounting/ledger/${params.id}`);
            setLedger(ledgerRes.data);
        } catch (err) {
            console.error("Relation Sync Failure:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncRelationDetail(true);
        const interval = setInterval(() => syncRelationDetail(false), 30000);
        return () => clearInterval(interval);
    }, [params.id]);

    if (loading) {
        return <div className="flex items-center justify-center h-full bg-slate-50 text-slate-900"><Loader2 className="animate-spin h-8 w-8 mr-2 text-blue-600" /> Initializing Node Pulse...</div>;
    }

    if (!customer) {
        return <div className="text-slate-900 p-8 h-screen bg-slate-50 font-black uppercase tracking-widest flex items-center justify-center">Strategic Relation Not Found.</div>;
    }

    const currentBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 bg-slate-50 min-h-screen w-full max-w-full overflow-hidden">
            <div className="flex flex-col lg:flex-row md:items-center gap-4">
                <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl font-bold md:h-10 px-0 md:px-4 w-fit" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Store
                </Button>
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 tracking-tighter">{customer.firstName} {customer.lastName}</h2>
                    <p className="text-slate-500 font-medium text-sm">{customer.company || "Independent Client"}</p>
                </div>
                <div className="md:ml-auto w-full md:w-auto">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden border-none border-b-4 border-b-amber-500">
                        <CardContent className="p-6 flex items-center space-x-6">
                            <div className="p-3 bg-amber-50 rounded-2xl">
                                <Wallet className="h-8 w-8 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Balance</p>
                                <div className={`text-3xl font-black tracking-tighter ${currentBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                    ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-[32px] md:col-span-1 h-fit border-none">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8">
                        <CardTitle className="text-slate-900 text-lg font-black tracking-tight">Relation Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-5">
                        <div className="flex items-center text-slate-600 font-bold text-sm">
                            <Mail className="h-4 w-4 mr-4 text-blue-500" /> {customer.email || "No email provided"}
                        </div>
                        <div className="flex items-center text-slate-600 font-bold text-sm">
                            <Phone className="h-4 w-4 mr-4 text-slate-400" /> {customer.phone || "No phone number"}
                        </div>
                        <div className="flex items-center text-slate-600 font-bold text-sm">
                            <Building className="h-4 w-4 mr-4 text-slate-400" /> {customer.company || "Retail Consumer"}
                        </div>
                        <div className="pt-6 border-t border-slate-50">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                <Badge variant="outline" className="text-emerald-600 border-emerald-100 bg-emerald-50 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5">{customer.status}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Created On</span>
                                <span className="text-xs text-slate-900 font-black">{new Date(customer.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-[32px] md:col-span-2 border-none overflow-hidden print:col-span-3 print:border-none print:shadow-none print:bg-white print:text-black">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 flex flex-row items-center justify-between print:border-b print:border-black">
                        <div>
                            <CardTitle className="text-slate-900 text-xl font-black tracking-tight print:text-black">Audit Statement</CardTitle>
                            <CardDescription className="text-slate-500 font-medium print:text-zinc-600">Transaction history for: {customer.firstName} {customer.lastName}</CardDescription>
                        </div>
                        <Button variant="outline" className="rounded-2xl border-slate-200 text-slate-600 font-bold h-11 px-6 print:hidden shadow-sm" onClick={() => window.print()}>
                            <FileText className="mr-2 h-4 w-4" /> Export Record
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 print:p-0 print:pt-4 overflow-x-auto max-w-[100vw]">
                        <Table className="min-w-[700px]">
                            <TableHeader className="bg-slate-50/30">
                                <TableRow className="border-slate-100 hover:bg-transparent print:border-black">
                                    <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] pl-8 py-5">Date</TableHead>
                                    <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Particulars</TableHead>
                                    <TableHead className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Reference</TableHead>
                                    <TableHead className="text-right text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Debit (▲)</TableHead>
                                    <TableHead className="text-right text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Credit (▼)</TableHead>
                                    <TableHead className="text-right text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] pr-8">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Opening Balance Simulation */}
                                <TableRow className="border-slate-50 hover:bg-transparent print:border-zinc-200">
                                    <TableCell className="pl-8 text-slate-400 text-[10px] font-black tracking-widest">INIT</TableCell>
                                    <TableCell className="text-slate-400 font-bold italic text-sm">Opening Balance</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right pr-8 font-black text-slate-900">₹0.00</TableCell>
                                </TableRow>

                                {ledger.map((entry: any) => (
                                    <TableRow key={`${entry.type}-${entry.id}`} className="border-slate-50 hover:bg-slate-50/50 print:border-zinc-200 print:text-black group">
                                        <TableCell className="pl-8 text-slate-900 text-xs font-black tracking-tighter print:text-black">{new Date(entry.title || entry.date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${entry.type === 'INVOICE' ? "bg-blue-50 text-blue-600 print:text-black" : "bg-emerald-50 text-emerald-600 print:text-black"}`}>
                                                {entry.type === 'INVOICE' ? 'Sales Invoice' : 'Payment Received'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-[10px] font-black tracking-widest uppercase opacity-60 font-mono">{entry.ref}</TableCell>
                                        <TableCell className="text-right text-rose-600 font-black text-sm">
                                            {Number(entry.debit) > 0 ? `₹${Number(entry.debit).toLocaleString('en-IN')}` : ''}
                                        </TableCell>
                                        <TableCell className="text-right text-emerald-600 font-black text-sm">
                                            {Number(entry.credit) > 0 ? `₹${Number(entry.credit).toLocaleString('en-IN')}` : ''}
                                        </TableCell>
                                        <TableCell className="text-right pr-8 font-black text-slate-900">
                                            ₹{Number(entry.balance).toLocaleString('en-IN')}
                                            <span className="text-[9px] ml-1 text-slate-400 font-normal uppercase tracking-widest">{entry.balance >= 0 ? "Dr" : "Cr"}</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="p-10 border-t border-slate-100 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] print:block hidden">
                            <p>Computer generated statement • No signature required</p>
                            <p className="mt-2 text-slate-500">Generated at: {new Date().toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
