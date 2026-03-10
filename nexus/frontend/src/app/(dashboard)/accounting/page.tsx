
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Plus, Wallet, ArrowUpRight, ArrowDownRight, Landmark, Receipt, Printer, Search, RefreshCw, ShoppingCart, MessageCircle, Ban, Activity, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { RecordPaymentModal, type Invoice as PaymentInvoice } from "@/components/accounting/record-payment-modal";
import { CreateInvoiceDialog } from "@/components/accounting/create-invoice-dialog";
import { CreateAccountDialog } from "@/components/accounting/create-account-dialog";
import { CreateJournalEntryDialog } from "@/components/accounting/create-journal-entry-dialog";
import { CollaborationTimeline } from "@/components/system/collaboration-timeline";
import { ForecastingWidget } from "@/components/accounting/forecasting-widget";
import { useUX } from "@/components/providers/ux-provider";
import { FixedAssetTab } from "@/components/accounting/fixed-asset-tab";
import { AuditorDashboard } from "@/components/accounting/auditor-dashboard";
import { EmptyState } from "@/components/ui/empty-state";

interface Account {
    id: string;
    code: string;
    name: string;
    type: string;
    balance: number;
}

interface Transaction {
    id: string;
    date: string;
    account: { name: string };
    type: 'Credit' | 'Debit';
    amount: number;
    description: string;
}

interface AccountingInvoice extends PaymentInvoice {
    customer: { firstName: string; lastName: string; phone?: string };
    issueDate: string;
    totalAmount: number;
    amountPaid: number;
    status: string;
}

interface AccountingStats {
    receivable: number;
    netProfit: number;
    income: number;
    expenses: number;
    overdueAmount: number;
    gstLiability?: number;
    topDebtors: Array<{ name: string; amount: number; aging?: number }>;
}

interface HealthScore {
    status: 'RED' | 'YELLOW' | 'BLUE';
    riskScore: number;
    metrics: {
        avgEntryLag: number;
        taggingRatio: string;
    };
    signals: string[];
}

interface LeaderboardUser {
    name: string;
    invoices: number;
    avgLag: number;
}

interface RecoveryMemory {
    opportunities: Array<{
        name: string;
        phone?: string;
        daysSilent: number;
    }>;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

interface AccountingDraft {
    items: Array<{
        productId: string;
    }>;
}

export default function AccountingPage() {
    const { user } = useAuth();
    const { setUILocked, showConfirm } = useUX();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [invoices, setInvoices] = useState<AccountingInvoice[]>([]);
    const [stats, setStats] = useState<AccountingStats>({ receivable: 0, netProfit: 0, income: 0, expenses: 0, overdueAmount: 0, topDebtors: [] });
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<AccountingInvoice | null>(null);
    const [showCreateInvoice, setShowCreateInvoice] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [invoicePage, setInvoicePage] = useState(1);
    const [invoiceTotalPages, setInvoiceTotalPages] = useState(1);
    const [pendingDraft, setPendingDraft] = useState<AccountingDraft | null>(null);
    const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [recoveryMemory, setRecoveryMemory] = useState<RecoveryMemory | null>(null);
    const [showCreateAccount, setShowCreateAccount] = useState(false);
    const [showCreateJournalEntry, setShowCreateJournalEntry] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

    const syncLedgers = useCallback(async (silent = false) => {
        try {
            if (!silent && !isSyncing) setIsSyncing(true);

            const hasFullAccess = ['Owner', 'Manager', 'Accountant', 'CA'].includes(user?.role || '') || user?.isSuperAdmin;
            const isOwner = user?.role === 'Owner' || user?.isSuperAdmin;

            // CORE DATA: Fetch accounts, transactions, and invoices first to unblock UI
            const [accRes, txRes, invRes] = await Promise.all([
                api.get("accounting/accounts").catch(() => ({ data: [] })),
                api.get("accounting/transactions").catch(() => ({ data: { data: [] } })),
                api.get(`/accounting/invoices?page=${invoicePage}&limit=50`).catch(() => ({ data: { data: [] } }))
            ]);

            setAccounts(accRes.data || []);
            setTransactions(txRes.data?.data || txRes.data || []);

            if (invRes.data?.data) {
                setInvoices(invRes.data.data);
                setInvoiceTotalPages(invRes.data.meta?.totalPages || 1);
            } else {
                setInvoices(invRes.data || []);
            }

            // Unblock UI immediately after core data is ready
            setLoading(false);

            // ANALYTICAL DATA: Fetch background analytical stats without blocking the UI
            Promise.all([
                hasFullAccess ? api.get("accounting/stats").catch(() => ({ data: null })) : Promise.resolve({ data: null }),
                hasFullAccess ? api.get("inventory/stats").catch(() => ({ data: null })) : Promise.resolve({ data: null }),
                isOwner ? api.get("accounting/health-score").catch(() => ({ data: null })) : Promise.resolve({ data: null }),
                hasFullAccess ? api.get("accounting/leaderboard").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
                hasFullAccess ? api.get("accounting/recovery-memory").catch(() => ({ data: null })) : Promise.resolve({ data: null })
            ]).then(([statsRes, , healthRes, leaderRes, recoveryRes]) => {
                setStats(statsRes.data || { receivable: 0, netProfit: 0, income: 0, expenses: 0, overdueAmount: 0, topDebtors: [] });
                setHealthScore(healthRes.data);
                setLeaderboard(leaderRes.data || []);
                setRecoveryMemory(recoveryRes.data);
                setLastSyncTime(Date.now());
            });

        } catch (err) {
            // Suppressed in prod: Ledger sync failed silently
            if (!silent) toast.error("Failed to load accounting data. Please refresh.");
        } finally {
            setIsSyncing(false);
        }
    }, [invoicePage, user?.role, user?.isSuperAdmin]);

    useEffect(() => {
        const draft = localStorage.getItem("invoice_draft");
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                if (parsed.items?.length > 0 && parsed.items[0].productId) {
                    setPendingDraft(parsed);
                }
            } catch {
                // Silently ignore malformed drafts
            }
        }
    }, [showCreateInvoice]);

    const proceedWithCancellation = useCallback((id: string) => {
        showConfirm({
            title: "Cancel Invoice?",
            description: "Are you sure you want to cancel this invoice? This will reverse all ledger entries and stock movements. This action cannot be undone.",
            confirmText: "Yes, Cancel Invoice",
            variant: "destructive",
            onConfirm: async () => {
                try {
                    setUILocked(true);
                    await api.post(`/accounting/invoices/${id}/cancel`, { reason: "User cancelled from dashboard" });
                    toast.success("Invoice cancelled successfully");
                    syncLedgers();
                } catch (err: unknown) {
                    const error = err as ApiError;
                    toast.error(error.response?.data?.message || "Cancellation failed");
                } finally {
                    setUILocked(false);
                }
            }
        });
    }, [showConfirm, setUILocked, syncLedgers]);

    const handleCancelInvoice = useCallback((id: string) => {
        if (Date.now() - lastSyncTime > 60000) {
            toast.warning("Accounting data might be stale. Syncing before action...", { icon: <RefreshCw className="h-4 w-4 animate-spin" /> });
            syncLedgers().then(() => proceedWithCancellation(id));
            return;
        }
        proceedWithCancellation(id);
    }, [lastSyncTime, syncLedgers, proceedWithCancellation]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            const customerName = [inv.customer?.firstName, inv.customer?.lastName].filter(Boolean).join(" ").toLowerCase();
            return inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customerName.includes(searchQuery.toLowerCase());
        });
    }, [invoices, searchQuery]);

    useEffect(() => {
        syncLedgers();
        const interval = setInterval(() => syncLedgers(true), 30000);
        return () => clearInterval(interval);
    }, [syncLedgers]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><RefreshCw className="h-8 w-8 animate-spin text-amber-500" /></div>;

    return (
        <div className="flex-1 space-y-6 md:space-y-8 pt-2 md:pt-6 px-4 md:px-8 w-full max-w-full overflow-hidden">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-0">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center">
                        <Landmark className="mr-4 h-9 w-9 text-amber-500 shadow-sm" />
                        Accounting
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">Manage invoices, accounts, transactions, and financial reports.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {pendingDraft && !showCreateInvoice && (
                        <Button
                            variant="outline"
                            className="bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 text-xs h-11 px-5 rounded-2xl animate-pulse font-black uppercase tracking-widest w-full sm:w-auto"
                            onClick={() => setShowCreateInvoice(true)}
                        >
                            <ShoppingCart className="mr-2 h-4 w-4" /> Resume Transaction
                        </Button>
                    )}
                    {isSyncing && (
                        <div className="flex items-center text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl animate-pulse uppercase tracking-widest w-full sm:w-auto">
                            <RefreshCw className="h-3 w-3 mr-2 animate-spin text-blue-500" /> System Sync
                        </div>
                    )}
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-xl px-4 py-2 font-bold transition-all h-9 flex-1 sm:flex-none"
                            onClick={() => setShowCreateAccount(true)}
                        >
                            <RefreshCw className="mr-2 h-4 w-4 text-blue-500" /> All Accounts
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-xl px-4 py-2 font-bold transition-all h-9 flex-1 sm:flex-none"
                            onClick={() => setShowCreateJournalEntry(true)}
                        >
                            <Plus className="mr-2 h-4 w-4 text-emerald-500" /> Record Tx
                        </Button>
                    </div>
                    <Button className="rounded-2xl bg-amber-500 hover:bg-amber-600 font-bold px-8 shadow-lg shadow-amber-500/20 text-white h-11 w-full sm:w-auto" onClick={() => setShowCreateInvoice(true)}>
                        <Plus className="mr-2 h-4 w-4" /> New Invoice
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all rounded-3xl overflow-hidden border-b-4 border-b-emerald-500 border-none group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Total Income</CardTitle>
                        <div className="p-2.5 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">₹{Number(stats.income || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                        <p className="text-[10px] text-emerald-600 mt-2 font-black uppercase tracking-widest bg-emerald-50 w-fit px-2 py-0.5 rounded-lg">Accelerating</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all rounded-3xl overflow-hidden border-b-4 border-b-amber-500 border-none group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Total Receivables</CardTitle>
                        <div className="p-2.5 bg-amber-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <Wallet className="h-4 w-4 text-amber-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-600 tracking-tighter">₹{Number(stats.receivable || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                        <p className="text-[10px] text-slate-600 mt-2 font-black uppercase tracking-widest">Pending Collection</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-xl hover:shadow-rose-500/5 transition-all rounded-3xl overflow-hidden border-b-4 border-b-rose-500 border-none group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Overdue Amount</CardTitle>
                        <div className="p-2.5 bg-rose-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <ArrowDownRight className="h-4 w-4 text-rose-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-rose-600 tracking-tighter">₹{Number(stats.overdueAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                        <p className="text-[10px] text-rose-500 mt-2 font-black uppercase tracking-widest bg-rose-50 w-fit px-2 py-0.5 rounded-lg">Critical Alert</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all rounded-3xl overflow-hidden border-b-4 border-b-blue-500 border-none group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Indirect Tax</CardTitle>
                        <div className="p-2.5 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform">
                            <Receipt className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-blue-600 tracking-tighter">₹{Number(stats.gstLiability || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</div>
                        <p className="text-[10px] text-slate-600 mt-2 font-black uppercase tracking-widest">GST Obligation</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <ForecastingWidget />
                </div>
                <div className="lg:col-span-1">
                    <CollaborationTimeline resourceType="Accounting" resourceId="Global" />
                </div>
            </div>

            {stats.topDebtors && stats.topDebtors.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden border-none group">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8">
                            <CardTitle className="text-slate-900 text-xl font-black tracking-tight">Top Overdue Customers</CardTitle>
                            <CardDescription className="text-slate-500 font-medium mt-1">Customers with outstanding payments requiring follow-up.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="space-y-6">
                                {stats.topDebtors.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-5 last:border-0 hover:translate-x-1 transition-transform">
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-slate-900/10">
                                                {String(i + 1).padStart(2, '0')}
                                            </div>
                                            <div>
                                                <span className="text-slate-900 font-black tracking-tight text-lg leading-tight block">{d.name}</span>
                                                <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Active Debtor</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-rose-600 font-black text-xl italic tracking-tighter block">₹{d.amount.toLocaleString('en-IN')}</span>
                                            <Badge variant="secondary" className="bg-rose-50 text-rose-500 font-black text-[9px] border-none uppercase tracking-widest px-2 py-0.5 mt-1">Aging: {d.aging || 30}+ Days</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs defaultValue="invoices" className="space-y-6">
                <TabsList className="bg-slate-100 border-slate-200 overflow-x-auto flex justify-start w-full scrollbar-hide h-auto p-1.5 rounded-2xl snap-x">
                    <TabsTrigger value="invoices" className="snap-start data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 font-bold transition-all whitespace-nowrap">Invoices</TabsTrigger>
                    <TabsTrigger value="accounts" className="snap-start data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 font-bold transition-all whitespace-nowrap">Accounts</TabsTrigger>
                    <TabsTrigger value="transactions" className="snap-start data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 font-bold transition-all whitespace-nowrap">Transactions</TabsTrigger>
                    <TabsTrigger value="assets" className="snap-start data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 font-bold transition-all whitespace-nowrap">Fixed Assets</TabsTrigger>
                    <TabsTrigger value="auditor" className="snap-start data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 font-bold transition-all whitespace-nowrap">Auditor</TabsTrigger>
                    <TabsTrigger value="health" className="snap-start data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm rounded-xl px-6 py-2.5 font-bold transition-all whitespace-nowrap">Store Health</TabsTrigger>
                </TabsList>

                <TabsContent value="invoices" className="space-y-4">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div>
                                    <CardTitle className="text-slate-900 text-xl font-black">Sales Invoices</CardTitle>
                                    <CardDescription className="text-slate-500 font-medium">Track and manage customer invoices and payments.</CardDescription>
                                </div>
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-600" />
                                    <input
                                        placeholder="Search by invoice number or customer name..."
                                        className="w-full pl-12 h-11 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-inner"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/20">
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest pl-6">Invoice #</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Customer</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Date</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Amount</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Status</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInvoices.map((inv) => (
                                        <TableRow key={inv.id} className="border-slate-100 hover:bg-slate-50 transition-all group">
                                            <TableCell className="font-mono text-slate-600 text-xs pl-6 font-bold">#{inv.invoiceNumber}</TableCell>
                                            <TableCell className="font-black text-slate-800 tracking-tight">{[inv.customer?.firstName, inv.customer?.lastName].filter(Boolean).join(" ")}</TableCell>
                                            <TableCell className="text-slate-500 text-sm font-semibold">{new Date(inv.issueDate).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-black text-slate-900">₹{Number(inv.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                            <TableCell>
                                                <Badge variant={inv.status === 'Paid' ? 'default' : 'outline'} className={inv.status === 'Paid' ? "bg-emerald-100 text-emerald-700 border-none font-bold shadow-sm" : "border-slate-200 text-slate-500 font-bold"}>
                                                    {inv.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                                                        onClick={() => window.open(`/invoice/${inv.id}`, '_blank')}
                                                        title="Print Invoice"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all"
                                                        onClick={() => {
                                                            const phone = inv.customer?.phone?.replace(/[^0-9]/g, '') || "";
                                                            const text = `Invoice #${inv.invoiceNumber} for ₹${Number(inv.totalAmount).toLocaleString('en-IN')}. View here: ${window.location.origin}/invoice/${inv.id}`;
                                                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                                                        }}
                                                        title="Share on WhatsApp"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </Button>
                                                    {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => setSelectedInvoice(inv)}
                                                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl h-8 px-4 shadow-md shadow-amber-600/20"
                                                        >
                                                            Tag Payment
                                                        </Button>
                                                    )}
                                                    {inv.status !== 'Cancelled' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                                                            onClick={() => handleCancelInvoice(inv.id)}
                                                            title="Cancel Invoice"
                                                        >
                                                            <Ban className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredInvoices.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-12 px-6">
                                                <EmptyState
                                                    icon={Receipt}
                                                    title="No Invoices Found"
                                                    description="You haven't issued any tax invoices yet. Start by creating your first compliant invoice."
                                                    actionText="Issue New Invoice"
                                                    onAction={() => setShowCreateInvoice(true)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50/50">
                                <Button variant="outline" size="sm" onClick={() => setInvoicePage(p => Math.max(1, p - 1))} disabled={invoicePage === 1} className="text-slate-500 border-slate-200 hover:bg-white">Previous</Button>
                                <span className="text-xs text-slate-500 font-medium tracking-tight">Page {invoicePage} of {invoiceTotalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setInvoicePage(p => Math.min(invoiceTotalPages, p + 1))} disabled={invoicePage === invoiceTotalPages} className="text-slate-500 border-slate-200 hover:bg-white">Next</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="accounts" className="space-y-4">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-8 px-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-slate-900 text-xl font-black">Chart of Accounts</CardTitle>
                                    <CardDescription className="text-slate-500 font-medium">All company accounts and current balances.</CardDescription>
                                </div>
                                <Button onClick={() => setShowCreateAccount(true)} className="bg-amber-500 hover:bg-amber-600 font-bold shadow-lg shadow-amber-500/20 text-white">
                                    <Plus className="mr-2 h-4 w-4" /> Add Account
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none">
                            <Table className="min-w-[700px]">
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest pl-8">Code</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Account Name</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Type</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accounts.map((acc) => (
                                        <TableRow key={acc.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                            <TableCell className="pl-8 font-mono text-sm text-slate-600 font-semibold">{acc.code}</TableCell>
                                            <TableCell className="font-semibold text-slate-900">{acc.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-semibold text-xs rounded-lg border-none">{acc.type}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-8 font-black text-slate-900 text-lg">
                                                ₹{Number(acc.balance).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {accounts.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-20 text-slate-400 font-medium italic">No accounts found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-8 px-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-slate-900 text-xl font-black">Transaction Journal</CardTitle>
                                    <CardDescription className="text-slate-500 font-medium">Complete record of all financial transactions.</CardDescription>
                                </div>
                                <Button onClick={() => setShowCreateJournalEntry(true)} className="bg-amber-500 hover:bg-amber-600 font-bold shadow-lg shadow-amber-500/20 text-white">
                                    <Plus className="mr-2 h-4 w-4" /> New Journal Entry
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto max-w-[100vw] sm:max-w-none">
                            <Table className="min-w-[600px]">
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest pl-8">Date</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Account / Party</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Type</TableHead>
                                        <TableHead className="text-slate-600 font-bold uppercase text-[10px] tracking-widest text-right pr-8">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx) => (
                                        <TableRow key={tx.id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                            <TableCell className="pl-8 font-black text-[10px] text-slate-600 tracking-widest">{new Date(tx.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-black text-slate-900 tracking-tight">{tx.account?.name}</TableCell>
                                            <TableCell className="text-slate-500 font-bold text-xs italic">&quot;{tx.description}&quot;</TableCell>
                                            <TableCell className={`text-right pr-8 font-black text-lg ${tx.type === 'Credit' ? "text-emerald-600" : "text-rose-600"}`}>
                                                {tx.type === 'Credit' ? '▲' : '▼'} ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {transactions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-20 text-slate-400 font-medium italic">No transactions recorded yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assets">
                    <FixedAssetTab />
                </TabsContent>
                <TabsContent value="auditor">
                    <AuditorDashboard />
                </TabsContent>
                <TabsContent value="health" className="space-y-4">
                    <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden border-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-8 px-8">
                            <CardTitle className="text-slate-900 text-xl font-black">Store Health Profile</CardTitle>
                            <CardDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Financial health and payment discipline overview</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            {healthScore && (
                                <div className="space-y-12">
                                    <div className="grid gap-6 md:grid-cols-3">
                                        <div className="p-8 rounded-[32px] bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
                                            <p className="text-[10px] text-slate-600 mb-4 uppercase font-black tracking-[0.2em] relative z-10">Accuracy Rating</p>
                                            <div className="relative z-10">
                                                <span className={`text-6xl font-black tracking-tighter ${healthScore.status === 'RED' ? 'text-rose-500' : healthScore.status === 'YELLOW' ? 'text-amber-500' : 'text-blue-500'}`}>
                                                    {100 - healthScore.riskScore}%
                                                </span>
                                            </div>
                                            <Badge className={`mt-6 rounded-xl font-black text-[10px] uppercase tracking-widest px-4 py-1.5 border-none relative z-10 ${healthScore.status === 'RED' ? 'bg-rose-500/20 text-rose-400' : healthScore.status === 'YELLOW' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {healthScore.status} STATUS
                                            </Badge>
                                        </div>
                                        <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm flex flex-col justify-center">
                                            <p className="text-[10px] text-slate-600 mb-2 uppercase font-black tracking-widest">Entry Delay</p>
                                            <p className="text-4xl font-black text-slate-900 tracking-tighter">{healthScore.metrics?.avgEntryLag || 0} <span className="text-xs font-bold text-slate-400">MINS</span></p>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                                                <div className="h-full bg-blue-600 w-[40%]" />
                                            </div>
                                        </div>
                                        <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm flex flex-col justify-center">
                                            <p className="text-[10px] text-slate-600 mb-2 uppercase font-black tracking-widest">Fulfillment Ratio</p>
                                            <p className="text-4xl font-black text-slate-900 tracking-tighter">{healthScore.metrics?.taggingRatio || "0%"}</p>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-[85%]" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-4">
                                            Health Alerts
                                            <div className="h-px flex-1 bg-slate-100" />
                                        </h4>
                                        {healthScore.signals?.length > 0 ? (
                                            <div className="grid gap-3">
                                                {healthScore.signals.map((s: string, i: number) => (
                                                    <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:border-blue-500/20 transition-all">
                                                        <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                                                        <span className="text-xs text-slate-600 font-bold uppercase tracking-tight">{s}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-16 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                                                <p className="text-blue-600 font-black text-sm uppercase tracking-widest">All Good!</p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">No issues found in the current period</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-8 md:grid-cols-2">
                                        <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden border-none">
                                            <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                                                <CardTitle className="text-slate-900 text-lg font-black tracking-tight flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 rounded-xl">
                                                        <Users className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    Staff Efficiency Index
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-8">
                                                <div className="space-y-6">
                                                    {leaderboard.map((u: LeaderboardUser, i: number) => (
                                                        <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-4 last:border-0 hover:translate-x-1 transition-transform">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs">{(i + 1).toString().padStart(2, '0')}</div>
                                                                <span className="text-slate-900 font-black tracking-tight">{u.name}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm text-slate-900 font-black">{u.invoices} SALES</p>
                                                                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{u.avgLag}M LAG</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden border-none">
                                            <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                                                <CardTitle className="text-slate-900 text-lg font-black tracking-tight flex items-center gap-3">
                                                    <div className="p-2 bg-amber-50 rounded-xl">
                                                        <Activity className="h-5 w-5 text-amber-600" />
                                                    </div>
                                                    Inactive Customers
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-8">
                                                <div className="space-y-6">
                                                    {recoveryMemory?.opportunities?.map((c, i: number) => (
                                                        <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-white hover:shadow-lg hover:shadow-blue-500/5 group">
                                                            <div>
                                                                <p className="text-slate-900 font-black tracking-tight">{c.name}</p>
                                                                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-1">{c.daysSilent} DAYS SINCE LAST ORDER</p>
                                                            </div>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="bg-slate-900 hover:bg-blue-600 text-white font-black text-[9px] h-9 rounded-xl border-none shadow-lg shadow-slate-900/10 px-4 uppercase tracking-[0.2em] transition-all"
                                                                onClick={() => window.open(`https://wa.me/${c.phone?.replace(/[^0-9]/g, '')}?text=Hi ${c.name}, hope you are doing well!`, '_blank')}
                                                            >
                                                                Reconnect
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {(!recoveryMemory || recoveryMemory?.opportunities?.length === 0) && (
                                                        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">All caught up</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <RecordPaymentModal
                invoice={selectedInvoice}
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                onSuccess={syncLedgers}
            />

            <CreateInvoiceDialog
                isOpen={showCreateInvoice}
                onClose={() => setShowCreateInvoice(false)}
                onSuccess={syncLedgers}
            />

            <CreateAccountDialog
                open={showCreateAccount}
                onOpenChange={setShowCreateAccount}
                onSuccess={syncLedgers}
            />

            <CreateJournalEntryDialog
                open={showCreateJournalEntry}
                onOpenChange={setShowCreateJournalEntry}
                onSuccess={syncLedgers}
                accounts={accounts}
            />
        </div>
    );
}

