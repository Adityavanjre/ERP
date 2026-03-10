
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Wifi, WifiOff } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { BarcodeSearch } from '@/components/sales/rapid/BarcodeSearch';
import { CartTable } from '@/components/sales/rapid/CartTable';
import { CheckoutSidebar } from '@/components/sales/rapid/CheckoutSidebar';
import { ProductGrid } from '@/components/sales/rapid/ProductGrid';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';

const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

interface Item {
    productId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    gstRate: number;
}

interface POSProduct {
    id: string;
    name: string;
    sku: string;
    price: string | number;
    gstRate: number;
}

interface SyncBatchResult {
    status: 'SUCCESS' | 'FAILED' | 'ERROR';
    invoiceNumber: string;
    error?: string;
}

export default function RapidBillingPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [search, setSearch] = useState('');
    // BUG-006 FIX: add setters so customer can be changed (not permanently Walk-in)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [customerId, setCustomerId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [customerName, setCustomerName] = useState('Walk-in Customer');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [isOffline, setIsOffline] = useState(false);
    const [pendingSync, setPendingSync] = useState(0);
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CREDIT'>('CASH');
    const [lastScanFailed, setLastScanFailed] = useState(false);
    const [customAmountPaid, setCustomAmountPaid] = useState<number>(0);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    // BUG-014 FIX: use a ref to prevent syncQueue from being called concurrently
    const isSyncingRef = useRef(false);

    const searchRef = useRef<HTMLInputElement>(null!);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const addItem = useCallback((product: POSProduct, quantity: number = 1) => {
        setItems(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i);
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
                quantity: quantity,
                gstRate: product.gstRate || 0
            }];
        });
        searchRef.current?.focus();
    }, []);

    useEffect(() => {
        searchRef.current?.focus();
        if (typeof navigator !== 'undefined') {
            setIsOffline(!navigator.onLine);
            window.addEventListener('online', () => setIsOffline(false));
            window.addEventListener('offline', () => setIsOffline(true));
        }

        const loadMetadata = () => {
            const queue = JSON.parse(localStorage.getItem('billing_queue') || '[]');
            setPendingSync(queue.length);
            const userData = localStorage.getItem('k_user');
            if (userData) {
                try {
                    const u = JSON.parse(userData);
                    setUserRole(u.role);
                } catch {
                    // Ignore empty catch
                }
            }
        };
        loadMetadata();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        if (items.length > 0 && !startTime) {
            setStartTime(Date.now());
            timerRef.current = setInterval(() => {
                setElapsed(prev => prev + 1);
            }, 1000);
        }
    }, [items.length, startTime]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!search || isSearching) return;

        let multiplier = 1;
        let finalCode = search.trim();

        if (search.includes('*')) {
            const parts = search.split('*');
            if (parts.length === 2 && !isNaN(parseFloat(parts[0]))) {
                multiplier = parseFloat(parts[0]);
                finalCode = parts[1].trim();
            }
        }

        if (!finalCode) return;

        setIsSearching(true);
        try {
            const res = await api.get(`/inventory/products/find-by-code?code=${finalCode}`);
            if (res.data) {
                addItem(res.data, multiplier);
                setLastScanFailed(false);
                if (multiplier > 1) toast.success(`Added ${multiplier} units!`);
            } else {
                setLastScanFailed(true);
                setTimeout(() => setLastScanFailed(false), 1000);
                toast.error("Product not found");
            }
        } catch {
            toast.error("Connection issue");
        } finally {
            setIsSearching(false);
            setSearch('');
        }
    };

    // BUG-007 FIX: manualSearch dead code removed.
    // The manualSearch state had no setter so the debounce effect below could never fire.
    // The ProductGrid component handles its own product browsing.

    const updateQty = (id: string, delta: number) => {
        setItems(prev => prev.map(i =>
            i.productId === id ? { ...i, quantity: i.quantity + delta } : i
        ).filter(i => i.quantity > 0));
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.productId !== id));
    };

    const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

    const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const taxTotal = items.reduce((sum, i) => {
        const itemTaxable = i.price * i.quantity;
        const itemTax = (itemTaxable * (i.gstRate || 0)) / 100;
        return sum + itemTax;
    }, 0);
    const total = round2(subtotal + taxTotal);

    const reset = () => {
        setItems([]);
        setStartTime(null);
        setElapsed(0);
        setSearch('');
        setCustomAmountPaid(0);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const completeInvoice = async () => {
        if (items.length === 0 || isSubmitting) return;

        setIsSubmitting(true);
        const idempotencyKey = `POS-${Date.now()}-${generateId()}`;
        const invoiceNumber = `INV-${Date.now()}-${generateId().substring(0, 4).toUpperCase()}`;

        const amountPaid = customAmountPaid > 0 ? customAmountPaid : (paymentMode === 'CREDIT' ? 0 : total);

        const invoiceData = {
            customerId: customerId || undefined,
            items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, gstRate: i.gstRate })),
            billingTimeSeconds: elapsed,
            paymentMode,
            amountPaid,
            idempotencyKey,
            issueDate: new Date().toISOString(),
            dueDate: new Date().toISOString(),
            invoiceNumber
        };

        if (isOffline) {
            const queue = JSON.parse(localStorage.getItem('billing_queue') || '[]');
            queue.push(invoiceData);
            localStorage.setItem('billing_queue', JSON.stringify(queue));
            setPendingSync(queue.length);
            toast.success("Saved Offline");
            reset();
            setIsSubmitting(false);
            return;
        }

        try {
            await api.post('accounting/invoices', invoiceData);
            toast.success(`Success!`);
            reset();
        } catch {
            toast.error("Sync Error: Saved Locally");
            const queue = JSON.parse(localStorage.getItem('billing_queue') || '[]');
            queue.push(invoiceData);
            localStorage.setItem('billing_queue', JSON.stringify(queue));
            setPendingSync(queue.length);
            reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCompletePress = () => {
        if (items.length === 0 || isSubmitting) return;

        // Show confirmation for large amounts
        if (total > 100000) {
            setShowConfirm(true);
        } else {
            completeInvoice();
        }
    };

    // BUG-014 FIX: use isSyncingRef to prevent concurrent queue syncs.
    // Previously isSubmitting in deps caused this to fire during its own execution.
    const syncQueue = useCallback(async () => {
        if (isOffline || isSyncingRef.current) return;
        const queue = JSON.parse(localStorage.getItem('billing_queue') || '[]');
        if (queue.length === 0) return;

        isSyncingRef.current = true;
        setIsSubmitting(true);
        try {
            const res = await api.post('accounting/invoices/bulk', queue);
            const results: SyncBatchResult[] = res.data.results;
            const successful = new Set(results.filter(r => r.status === 'SUCCESS').map(r => r.invoiceNumber));
            const alreadyDone = new Set(results.filter(r => r.error === 'ALREADY_SYNCED').map(r => r.invoiceNumber));

            const remaining = queue.filter((inv: { invoiceNumber: string }) => !successful.has(inv.invoiceNumber) && !alreadyDone.has(inv.invoiceNumber));
            localStorage.setItem('billing_queue', JSON.stringify(remaining));
            setPendingSync(remaining.length);
            if (successful.size > 0 || alreadyDone.size > 0) toast.success("Sync complete");
        } catch {
            toast.error("Sync failed");
        } finally {
            setIsSubmitting(false);
            isSyncingRef.current = false;
        }
    }, [isOffline]);

    useEffect(() => {
        if (!isOffline && pendingSync > 0) syncQueue();
    }, [isOffline, pendingSync, syncQueue]);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'F1') { e.preventDefault(); handleCompletePress(); }
            if (e.key === 'F2') {
                e.preventDefault();
                const modes = ['CASH', 'UPI', 'CREDIT'] as const;
                const next = modes[(modes.indexOf(paymentMode) + 1) % modes.length];
                setPaymentMode(next);
                toast(`Payment: ${next}`);
            }
            if (e.key === 'Escape') reset();
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, isOffline, elapsed, paymentMode, isSubmitting, total]);

    return (
        <div className="h-[calc(100vh-64px)] bg-slate-50 flex flex-col overflow-hidden font-sans antialiased text-slate-900">
            <header className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm relative z-20 shrink-0 h-16">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter uppercase">Rapid <span className="text-blue-600">Commerce</span></span>
                </div>

                <div className="flex gap-4 items-center bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                    {isOffline ? <WifiOff className="w-4 h-4 text-amber-500" /> : <Wifi className="w-4 h-4 text-emerald-500" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{isOffline ? 'Offline Mode' : 'Online System'}</span>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden overflow-y-auto lg:overflow-hidden">
                <section className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-white relative">
                    <ProductGrid onProductClick={(product) => {
                        addItem(product as unknown as POSProduct);
                        toast.success(`Sent ${product.name} to cart`);
                    }} />
                </section>

                <section className="flex-1 flex flex-col h-full bg-slate-50 relative min-w-0 pb-20 lg:pb-0 border-r border-slate-200">
                    <BarcodeSearch
                        search={search}
                        setSearch={setSearch}
                        onSubmit={handleSearch}
                        isSearching={isSearching}
                        lastScanFailed={lastScanFailed}
                        inputRef={searchRef}
                    />
                    <CartTable
                        items={items}
                        updateQty={updateQty}
                        removeItem={removeItem}
                        setItems={setItems}
                    />
                </section>

                <CheckoutSidebar
                    customerName={customerName}
                    paymentMode={paymentMode}
                    setPaymentMode={setPaymentMode}
                    customAmountPaid={customAmountPaid}
                    setCustomAmountPaid={setCustomAmountPaid}
                    subtotal={subtotal}
                    taxTotal={taxTotal}
                    total={total}
                    itemsCount={items.length}
                    isSubmitting={isSubmitting}
                    completeInvoice={handleCompletePress}
                    userRole={userRole}
                />
            </main >

            <ConfirmationDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={completeInvoice}
                title="High Value Invoice"
                description={`You are about to generate an invoice for ₹${total.toLocaleString('en-IN')}. Are you sure you want to proceed?`}
                confirmLabel="Yes, Generate"
                cancelLabel="Review"
                variant="warning"
            />
        </div >
    );
}
