"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Wifi, WifiOff } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { BarcodeSearch } from '@/components/sales/rapid/BarcodeSearch';
import { CartTable } from '@/components/sales/rapid/CartTable';
import { CheckoutSidebar } from '@/components/sales/rapid/CheckoutSidebar';

const generateId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

interface Item {
    productId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    gstRate: number;
}

export default function RapidBillingPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [search, setSearch] = useState('');
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState('Walk-in Customer');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [isOffline, setIsOffline] = useState(false);
    const [pendingSync, setPendingSync] = useState(0);
    const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CREDIT'>('CASH');
    const [lastScanFailed, setLastScanFailed] = useState(false);
    const [customAmountPaid, setCustomAmountPaid] = useState<string>('');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Manual Search State
    const [manualSearch, setManualSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isManualSearching, setIsManualSearching] = useState(false);

    const searchRef = useRef<HTMLInputElement>(null!);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

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
                } catch (e) { }
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
    }, [items, startTime]);

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
        } catch (err) {
            toast.error("Connection issue");
        } finally {
            setIsSearching(false);
            setSearch('');
        }
    };

    // Manual Search Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!manualSearch.trim()) {
                setSearchResults([]);
                return;
            }

            setIsManualSearching(true);
            try {
                // Determine if search is numeric (likely SKU/Barcode) or text (Name)
                const isNumeric = /^\d+$/.test(manualSearch);
                const endpoint = isNumeric
                    ? `/inventory/products/find-by-code?code=${manualSearch}`
                    : `/inventory/products?search=${manualSearch}&limit=5`;

                const res = await api.get(endpoint);

                if (isNumeric && res.data) {
                    setSearchResults([res.data]); // Single result for direct code match
                } else if (!isNumeric && res.data.data) {
                    setSearchResults(res.data.data); // List for text search
                } else {
                    setSearchResults([]);
                }
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsManualSearching(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [manualSearch]);

    const addItem = (product: any, quantity: number = 1) => {
        setItems(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i);
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: parseFloat(product.price),
                quantity: quantity,
                gstRate: product.gstRate || 0
            }];
        });
        searchRef.current?.focus();
    };

    const updateQty = (id: string, delta: number) => {
        setItems(prev => prev.map(i =>
            i.productId === id ? { ...i, quantity: i.quantity + delta } : i
        ).filter(i => i.quantity > 0));
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.productId !== id));
    };

    const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const completeInvoice = async () => {
        if (items.length === 0 || isSubmitting) return;

        setIsSubmitting(true);
        const idempotencyKey = `POS-${Date.now()}-${generateId()}`;
        const invoiceNumber = `INV-${Date.now()}-${generateId().substring(0, 4).toUpperCase()}`;

        const amountPaid = customAmountPaid ? parseFloat(customAmountPaid) : (paymentMode === 'CREDIT' ? 0 : total);

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
        } catch (err) {
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

    const syncQueue = async () => {
        if (isOffline || isSubmitting) return;
        const queue = JSON.parse(localStorage.getItem('billing_queue') || '[]');
        if (queue.length === 0) return;

        setIsSubmitting(true);
        try {
            const res = await api.post('accounting/invoices/bulk', queue);
            const successful = new Set(res.data.results.filter((r: any) => r.status === 'SUCCESS').map((r: any) => r.invoiceNumber));
            const alreadyDone = new Set(res.data.results.filter((r: any) => r.error === 'ALREADY_SYNCED').map((r: any) => r.invoiceNumber));

            const remaining = queue.filter((inv: any) => !successful.has(inv.invoiceNumber) && !alreadyDone.has(inv.invoiceNumber));
            localStorage.setItem('billing_queue', JSON.stringify(remaining));
            setPendingSync(remaining.length);
            if (successful.size > 0 || alreadyDone.size > 0) toast.success("Sync complete");
        } catch (err) {
            toast.error("Sync failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!isOffline && pendingSync > 0) syncQueue();
    }, [isOffline, pendingSync]);

    const reset = () => {
        setItems([]);
        setStartTime(null);
        setElapsed(0);
        setSearch('');
        setCustomAmountPaid('');
        if (timerRef.current) clearInterval(timerRef.current);
    };

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'F1') { e.preventDefault(); completeInvoice(); }
            if (e.key === 'F2') {
                e.preventDefault();
                const modes: any[] = ['CASH', 'UPI', 'CREDIT'];
                const next = modes[(modes.indexOf(paymentMode) + 1) % modes.length];
                setPaymentMode(next);
                toast(`Payment: ${next}`);
            }
            if (e.key === 'Escape') reset();
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [items, isOffline, elapsed, paymentMode]);

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

            <main className="flex-1 flex overflow-hidden">
                <section className="flex-1 flex flex-col border-r border-slate-200 bg-white relative">
                    {/* Manual Search Bar */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Product by Name or SKU..."
                                value={manualSearch}
                                onChange={(e) => setManualSearch(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-sm font-medium"
                            />
                            <div className="absolute left-3 top-2.5 text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </div>
                            {isManualSearching && (
                                <div className="absolute right-3 top-2.5">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && manualSearch && (
                            <div className="absolute top-[70px] left-4 right-4 bg-white rounded-xl shadow-xl border border-slate-100 z-50 max-h-[300px] overflow-y-auto">
                                {searchResults.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => {
                                            addItem(product);
                                            setManualSearch('');
                                            setSearchResults([]);
                                            toast.success(`Added ${product.name}`);
                                        }}
                                        className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors"
                                    >
                                        <div>
                                            <div className="font-bold text-sm text-slate-800">{product.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">SKU: {product.sku}</div>
                                        </div>
                                        <div className="font-bold text-emerald-600">
                                            ₹{parseFloat(product.price).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

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
                    total={total}
                    itemsCount={items.length}
                    isSubmitting={isSubmitting}
                    completeInvoice={completeInvoice}
                    userRole={userRole}
                />
            </main>
        </div>
    );
}
