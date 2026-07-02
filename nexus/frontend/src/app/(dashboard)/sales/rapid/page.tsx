"use client";
import { getCurrencySymbol } from "../../../../lib/currency";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Wifi, WifiOff } from "lucide-react";
import { api } from "../../../../lib/api";
import { toast } from "sonner";
import { BarcodeSearch } from "../../../../components/sales/rapid/BarcodeSearch";
import { CartTable } from "../../../../components/sales/rapid/CartTable";
import { CheckoutSidebar } from "../../../../components/sales/rapid/CheckoutSidebar";
import { ConfirmationDialog } from "../../../../components/shared/ConfirmationDialog";
import { InlineCreateProductDialog } from "../../../../components/shared/inline-create-product-dialog";

const generateId = () =>
  Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

interface Item {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
  pricingMode?: string;
  width?: number | null;
  length?: number | null;
  sheets?: number;
  ratePerSqm?: number;
}

interface POSProduct {
  id: string;
  name: string;
  sku: string;
  price: string | number;
  gstRate: number;
  pricingMode?: string;
  width?: number | null;
  length?: number | null;
}

interface SyncBatchResult {
  status: "SUCCESS" | "FAILED" | "ERROR";
  invoiceNumber: string;
  error?: string;
}

const ALLOWED_ROLES = ["owner", "manager", "storekeeper", "admin", "cashier"];

export default function RapidBillingPage() {
  const currencySymbol = getCurrencySymbol();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customers, setCustomers] = useState<any[]>([]);

  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CREDIT">("CASH");
  const [lastScanFailed, setLastScanFailed] = useState(false);
  const [customAmountPaid, setCustomAmountPaid] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProductCreateOpen, setIsProductCreateOpen] = useState(false);
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const isSyncingRef = useRef(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get("crm/customers");
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setCustomers(list);
    } catch {}
  }, []);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await api.get("system/bank-accounts");
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setBankAccounts(list);
      const defaultAccount = list.find((a: any) => a.isDefault);
      if (defaultAccount) setBankAccountId(defaultAccount.id);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchBankAccounts();
  }, [fetchCustomers]);

  const searchRef = useRef<HTMLInputElement>(null!);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const addItem = useCallback((product: POSProduct, quantity: number = 1) => {
    const isArea = product.pricingMode === "area";
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: typeof product.price === "string" ? parseFloat(product.price) : product.price,
          quantity: quantity,
          igstRate: 0,
          cgstRate: 0,
          sgstRate: 0,
          pricingMode: product.pricingMode || "piece",
          width: product.width ?? null,
          length: product.length ?? null,
          sheets: isArea ? 1 : 0,
          ratePerSqm: isArea ? 0 : 0,
        },
      ];
    });
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
    if (typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", () => setIsOffline(false));
      window.addEventListener("offline", () => setIsOffline(true));
    }

    const loadMetadata = () => {
      const queue = JSON.parse(localStorage.getItem("billing_queue") || "[]");
      setPendingSync(queue.length);
      const keysToTry = ["k_user", "user", "auth_user", "nexus_user"];
      for (const key of keysToTry) {
        const userData = localStorage.getItem(key);
        if (userData) {
          try {
            const u = JSON.parse(userData);
            const role = (u.role || u.userRole || "").toLowerCase();
            setUserRole(role);
            break;
          } catch {}
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
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
  }, [items.length, startTime]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search || isSearching) return;

    let multiplier = 1;
    let finalCode = search.trim();

    if (search.includes("*")) {
      const parts = search.split("*");
      if (parts.length === 2 && !isNaN(parseFloat(parts[0]))) {
        multiplier = parseFloat(parts[0]);
        finalCode = parts[1].trim();
      }
    }

    if (!finalCode) return;

    setIsSearching(true);
    try {
      const res = await api.get(`inventory/products/find-by-code?code=${finalCode}`);
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
      setSearch("");
    }
  };

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.productId === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const updateAreaField = (id: string, field: "sheets" | "ratePerSqm", value: number) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === id ? { ...i, [field]: value } : i)),
    );
  };

  const updateIgstRate = (id: string, rate: number) => {
    setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, igstRate: rate } : i)));
  };
  const updateCgstRate = (id: string, rate: number) => {
    setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, cgstRate: rate } : i)));
  };
  const updateSgstRate = (id: string, rate: number) => {
    setItems((prev) => prev.map((i) => (i.productId === id ? { ...i, sgstRate: rate } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== id));
  };

  const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

  const getItemAmount = (item: Item) => {
    if (item.pricingMode === "area" && item.width && item.length && item.sheets && item.ratePerSqm) {
      return item.width * item.length * item.sheets * item.ratePerSqm;
    }
    return item.price * item.quantity;
  };

  const subtotal = items.reduce((sum, i) => sum + getItemAmount(i), 0);
  const igstTotal = items.reduce((sum, i) => {
    const taxable = getItemAmount(i);
    return sum + taxable * ((i.igstRate || 0) / 100);
  }, 0);
  const cgstTotal = items.reduce((sum, i) => {
    const taxable = getItemAmount(i);
    return sum + taxable * ((i.cgstRate || 0) / 100);
  }, 0);
  const sgstTotal = items.reduce((sum, i) => {
    const taxable = getItemAmount(i);
    return sum + taxable * ((i.sgstRate || 0) / 100);
  }, 0);
  const taxTotal = igstTotal + cgstTotal + sgstTotal;
  const total = round2(subtotal + taxTotal);

  const reset = useCallback(() => {
    setItems([]);
    setStartTime(null);
    setElapsed(0);
    setSearch("");
    setCustomAmountPaid(0);
    setCustomerId(null);
    setCustomerName("Walk-in Customer");
    setBillingAddress("");
    setShippingAddress("");
    setSupplierAddress("");
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const completeInvoice = useCallback(async () => {
    if (items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    const idempotencyKey = `POS-${Date.now()}-${generateId()}`;
    const invoiceNumber = `INV-${Date.now()}-${generateId().substring(0, 4).toUpperCase()}`;

    const amountPaid =
      customAmountPaid > 0 ? customAmountPaid : paymentMode === "CREDIT" ? 0 : total;

    const invoiceData = {
      customerId: customerId || undefined,
      items: items.map((i) => {
        const isArea = i.pricingMode === "area";
        const effectivePrice = isArea && i.width && i.length && i.sheets && i.ratePerSqm
          ? i.width * i.length * i.sheets * i.ratePerSqm
          : i.price * i.quantity;
        const totalGstRate = (i.igstRate || 0) + (i.cgstRate || 0) + (i.sgstRate || 0);
        return {
          productId: i.productId,
          quantity: i.quantity,
          price: isArea ? effectivePrice / i.quantity : i.price,
          gstRate: totalGstRate,
          gstType: (i.igstRate || 0) > 0 ? "IGST" : "CGST_SGST",
        };
      }),
      itemSections: items.reduce((acc: any, i) => {
        if (i.pricingMode === "area") {
          acc[i.productId] = {
            pricingMode: "area",
            width: i.width,
            length: i.length,
            sheets: i.sheets,
            ratePerSqm: i.ratePerSqm,
          };
        }
        return acc;
      }, {}),
      billingTimeSeconds: elapsed,
      paymentMode,
      amountPaid,
      idempotencyKey,
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      invoiceNumber,
      billingAddress: billingAddress || undefined,
      shippingAddress: shippingAddress || undefined,
      supplierAddress: supplierAddress || undefined,
      bankAccountId: bankAccountId || undefined,
    };

    if (isOffline) {
      const queue = JSON.parse(localStorage.getItem("billing_queue") || "[]");
      queue.push(invoiceData);
      localStorage.setItem("billing_queue", JSON.stringify(queue));
      setPendingSync(queue.length);
      toast.success("Saved Offline");
      reset();
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post("accounting/invoices", invoiceData);
      toast.success(`Success!`);
      reset();
    } catch {
      toast.error("Sync Error: Saved Locally");
      const queue = JSON.parse(localStorage.getItem("billing_queue") || "[]");
      queue.push(invoiceData);
      localStorage.setItem("billing_queue", JSON.stringify(queue));
      setPendingSync(queue.length);
      reset();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    items, isSubmitting, total, customAmountPaid, paymentMode,
    customerId, elapsed, isOffline, reset, billingAddress, shippingAddress, supplierAddress, bankAccountId,
  ]);

  const handleCompletePress = useCallback(() => {
    if (items.length === 0 || isSubmitting) return;
    if (total > 100000) {
      setShowConfirm(true);
    } else {
      void completeInvoice();
    }
  }, [items.length, isSubmitting, total, completeInvoice]);

  const syncQueue = useCallback(async () => {
    if (isOffline || isSyncingRef.current) return;
    const queue = JSON.parse(localStorage.getItem("billing_queue") || "[]");
    if (queue.length === 0) return;

    isSyncingRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await api.post("accounting/invoices/bulk", queue);
      const results: SyncBatchResult[] = res.data.results;
      const successful = new Set(
        results.filter((r) => r.status === "SUCCESS").map((r) => r.invoiceNumber),
      );
      const alreadyDone = new Set(
        results.filter((r) => r.error === "ALREADY_SYNCED").map((r) => r.invoiceNumber),
      );
      const remaining = queue.filter(
        (inv: { invoiceNumber: string }) =>
          !successful.has(inv.invoiceNumber) && !alreadyDone.has(inv.invoiceNumber),
      );
      localStorage.setItem("billing_queue", JSON.stringify(remaining));
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
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === "F1") { e.preventDefault(); handleCompletePress(); }
      if (e.key === "F2") {
        e.preventDefault();
        const modes = ["CASH", "UPI", "CREDIT"] as const;
        const next = modes[(modes.indexOf(paymentMode) + 1) % modes.length];
        setPaymentMode(next);
        toast(`Payment: ${next}`);
      }
      if (e.key === "Escape") reset();
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [handleCompletePress, paymentMode, reset]);

  // Permissive role check — allow if role is unknown/null or matches any billing role
  const canBill =
    !userRole ||
    ALLOWED_ROLES.some((r) => userRole.includes(r));

  return (
    <div className="h-[calc(100vh-64px)] bg-slate-50 flex flex-col overflow-hidden font-sans antialiased text-slate-900">
      {/* POS Toolbar */}
      <header className="px-3 py-1.5 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black tracking-tighter uppercase">
            Quick <span className="text-blue-600">Sale</span>
          </span>
        </div>

        <div className="flex gap-2 items-center">
          {pendingSync > 0 && !isOffline && (
            <button
              onClick={() => void syncQueue()}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all shadow-sm"
            >
              <Zap className="w-3 h-3" />
              <span>Sync {pendingSync} Records</span>
            </button>
          )}
          <div className="flex gap-1.5 items-center bg-slate-50 px-4 py-1 rounded-full border border-slate-100">
            {isOffline ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isOffline ? "Offline" : "Online"}
            </span>
          </div>
        </div>
      </header>

      {/* Scanner Row — full width, single prominent row */}
      <div className="shrink-0 border-b border-slate-200 bg-white space-y-0.5 p-1">
        <BarcodeSearch
          search={search}
          setSearch={setSearch}
          onSubmit={handleSearch}
          isSearching={isSearching}
          lastScanFailed={lastScanFailed}
          inputRef={searchRef}
          onAddProduct={() => setIsProductCreateOpen(true)}
          onProductSelect={(product) => addItem(product)}
        />
        
        {/* Recently Added Products Quick Access */}
        {items.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-1">
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">
              📦 Items in Cart ({items.length})
            </div>
            <div className="flex gap-1 flex-wrap">
              {items.map((item) => (
                <button
                  key={item.productId}
                  onClick={() => addItem({
                    id: item.productId,
                    name: item.name,
                    sku: item.sku,
                    price: item.price,
                    gstRate: 0,
                    pricingMode: item.pricingMode,
                    width: item.width,
                    length: item.length,
                  })}
                  className="px-4 py-1.5 bg-white border border-blue-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-blue-100 hover:border-blue-300 transition-colors active:scale-95 flex items-center gap-1"
                >
                  <span className="text-sm">+</span>
                  <span className="truncate max-w-[100px]">{item.name}</span>
                  <span className="text-blue-500 font-black">×{item.quantity}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2-column POS body */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT — Cart table only */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <CartTable
              items={items}
              updateQty={updateQty}
              removeItem={removeItem}
              setItems={setItems}
              updateAreaField={updateAreaField}
              updateIgstRate={updateIgstRate}
              updateCgstRate={updateCgstRate}
              updateSgstRate={updateSgstRate}
              currencySymbol={currencySymbol}
              getItemAmount={getItemAmount}
            />
          </div>
        </div>

        {/* RIGHT — Checkout sidebar */}
        <div className="w-[360px] xl:w-[400px] shrink-0 overflow-hidden flex flex-col">
          <CheckoutSidebar
            customerId={customerId}
            setCustomerId={setCustomerId}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customers={customers}
            onAddCustomerSuccess={(newCust) => {
              fetchCustomers();
              setCustomerId(newCust.id);
              setCustomerName(`${newCust.firstName} ${newCust.lastName || ""}`.trim());
            }}
            paymentMode={paymentMode}
            setPaymentMode={setPaymentMode}
            customAmountPaid={customAmountPaid}
            setCustomAmountPaid={setCustomAmountPaid}
            billingAddress={billingAddress}
            setBillingAddress={setBillingAddress}
            shippingAddress={shippingAddress}
            setShippingAddress={setShippingAddress}
            supplierAddress={supplierAddress}
            setSupplierAddress={setSupplierAddress}
            bankAccountId={bankAccountId}
            setBankAccountId={setBankAccountId}
            bankAccounts={bankAccounts}
            subtotal={subtotal}
            taxTotal={taxTotal}
            igstTotal={igstTotal}
            cgstTotal={cgstTotal}
            sgstTotal={sgstTotal}
            total={total}
            itemsCount={items.length}
            isSubmitting={isSubmitting}
            completeInvoice={handleCompletePress}
            userRole={userRole}
            canBill={canBill}
          />
        </div>
      </main>

      <ConfirmationDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={completeInvoice}
        title="High Value Invoice"
        description={`You are about to generate an invoice for ${currencySymbol}${total.toLocaleString("en-IN")}. Are you sure?`}
        confirmLabel="Yes, Generate"
        cancelLabel="Review"
        variant="warning"
      />

      <InlineCreateProductDialog
        open={isProductCreateOpen}
        onOpenChange={setIsProductCreateOpen}
        onSuccess={(newProd) => {
          addItem({
            id: newProd.id,
            name: newProd.name,
            sku: newProd.sku,
            price: newProd.price,
            gstRate: newProd.gstRate || 0,
          });
        }}
      />
    </div>
  );
}
