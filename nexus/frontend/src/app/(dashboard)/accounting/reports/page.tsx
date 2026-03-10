
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialBalanceAccount {
    id: string;
    name: string;
    type: string;
    debit: number;
    credit: number;
}

interface TrialBalanceData {
    balanced: boolean;
    accounts: TrialBalanceAccount[];
    totalDebit: number;
    totalCredit: number;
}

interface ProfitLossAccount {
    id: string;
    name: string;
    balance: number;
}

interface ProfitLossData {
    isProfitable: boolean;
    netProfit: number;
    revenue: ProfitLossAccount[];
    expenses: ProfitLossAccount[];
    totalRevenue: number;
    totalExpense: number;
}

export default function ReportsPage() {
    const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null);
    const [profitLoss, setProfitLoss] = useState<ProfitLossData | null>(null);
    const [loading, setLoading] = useState(true);

    const loadReports = useCallback(async () => {
        try {
            setLoading(true);
            const [tbRes, plRes] = await Promise.all([
                api.get("/accounting/reports/trial-balance"),
                api.get("/accounting/reports/profit-loss"),
            ]);
            setTrialBalance(tbRes.data);
            setProfitLoss(plRes.data);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || "Failed to load financial reports");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const fmtINR = (val: number | string) =>
        Number(val).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

    if (loading) return <LoadingSpinner className="h-full" text="Loading financial reports..." />;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 w-full max-w-full overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <BarChart2 className="mr-4 h-9 w-9 text-violet-600" />
                        Financial Reports
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Core accounting reports for compliance and period-end review.</p>
                </div>
                <Button variant="outline" onClick={loadReports} disabled={loading} className="shrink-0">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Tabs defaultValue="trial-balance" className="space-y-6">
                <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-auto">
                    <TabsTrigger value="trial-balance" className="data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 font-bold">
                        Trial Balance
                    </TabsTrigger>
                    <TabsTrigger value="profit-loss" className="data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 font-bold">
                        Profit & Loss
                    </TabsTrigger>
                </TabsList>

                {/* --- TRIAL BALANCE --- */}
                <TabsContent value="trial-balance">
                    <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/40">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-xl font-black text-slate-900">Trial Balance</CardTitle>
                                    <CardDescription className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mt-1">
                                        All accounts as of today
                                    </CardDescription>
                                </div>
                                {trialBalance && (
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold ${trialBalance.balanced ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                        {trialBalance.balanced ? (
                                            <><CheckCircle2 className="h-4 w-4" /> Balanced</>
                                        ) : (
                                            <><AlertCircle className="h-4 w-4" /> Out of Balance</>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto max-w-[100vw]">
                            <Table className="min-w-[600px]">
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Account Name</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Type</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Debit (Dr)</TableHead>
                                        <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Credit (Cr)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(trialBalance?.accounts || []).map((acct: TrialBalanceAccount) => (
                                        <TableRow key={acct.id} className="border-slate-100 hover:bg-slate-50/50">
                                            <TableCell className="pl-8 font-bold text-slate-900 truncate max-w-[200px]" title={acct.name}>{acct.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-md border-none tracking-tighter">
                                                    {acct.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-slate-700">
                                                {Number(acct.debit) > 0 ? fmtINR(acct.debit) : "-"}
                                            </TableCell>
                                            <TableCell className="text-right pr-8 font-mono text-slate-700">
                                                {Number(acct.credit) > 0 ? fmtINR(acct.credit) : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {/* Totals Row */}
                            {trialBalance && (
                                <div className="border-t-2 border-slate-900 py-4 px-8 flex justify-end gap-16 bg-slate-50">
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Dr</div>
                                        <div className="font-mono font-black text-slate-900 text-lg">{fmtINR(trialBalance.totalDebit)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Cr</div>
                                        <div className="font-mono font-black text-slate-900 text-lg">{fmtINR(trialBalance.totalCredit)}</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- PROFIT & LOSS --- */}
                <TabsContent value="profit-loss">
                    <div className="grid lg:grid-cols-3 gap-6 mb-8">
                        <Card className={`rounded-3xl border-none shadow-xl col-span-1 overflow-hidden ${profitLoss?.isProfitable ? "bg-emerald-600" : "bg-red-600"} text-white`}>
                            <CardContent className="p-8 flex flex-col gap-2 h-full justify-center">
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Net Profit / (Loss)</div>
                                <div className="text-4xl font-black tracking-tighter">
                                    {fmtINR(profitLoss?.netProfit || 0)}
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-white/80 mt-2">
                                    {profitLoss?.isProfitable ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    {profitLoss?.isProfitable ? "Profitable Period" : "Loss Period"}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-none shadow-xl lg:col-span-2 overflow-hidden">
                            <CardContent className="p-0">
                                {/* Revenue Section */}
                                <div className="p-6 border-b border-slate-100">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Income / Revenue</div>
                                    {(profitLoss?.revenue || []).map((a: ProfitLossAccount) => (
                                        <div key={a.id} className="flex justify-between items-center py-2">
                                            <span className="font-medium text-slate-700">{a.name}</span>
                                            <span className="font-mono font-bold text-emerald-700">{fmtINR(a.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-4 mt-2 border-t border-dashed border-slate-200">
                                        <span className="font-black text-slate-900 text-sm uppercase tracking-wider">Total Revenue</span>
                                        <span className="font-mono font-black text-emerald-700 text-lg">{fmtINR(profitLoss?.totalRevenue || 0)}</span>
                                    </div>
                                </div>

                                {/* Expense Section */}
                                <div className="p-6">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Expenses</div>
                                    {(profitLoss?.expenses || []).map((a: ProfitLossAccount) => (
                                        <div key={a.id} className="flex justify-between items-center py-2">
                                            <span className="font-medium text-slate-700">{a.name}</span>
                                            <span className="font-mono font-bold text-red-700">{fmtINR(a.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center pt-4 mt-2 border-t border-dashed border-slate-200">
                                        <span className="font-black text-slate-900 text-sm uppercase tracking-wider">Total Expenses</span>
                                        <span className="font-mono font-black text-red-700 text-lg">{fmtINR(profitLoss?.totalExpense || 0)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
