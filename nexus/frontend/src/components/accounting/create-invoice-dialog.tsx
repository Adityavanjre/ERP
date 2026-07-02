"use client";

import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useUX } from "../../components/providers/ux-provider";
import { useSidebar } from "../../components/providers/sidebar-provider";
import { InlineCreateCustomerDialog } from "../shared/inline-create-customer-dialog";
import { InlineCreateProductDialog } from "../shared/inline-create-product-dialog";

interface CreateInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restoreDraft?: boolean;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string | number;
  gstRate?: number;
  hsnCode?: string;
  category?: string;
  pricingMode?: string;
  width?: number;
  length?: number;
}

interface InvoiceItem {
  type: "standard" | "dimensional";
  productId: string;
  description: string;
  hsnCode: string;
  quantity: number;
  price: number;
  width: number;
  length: number;
  sheets: number;
  ratePerSqm: number;
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
  total: number;
}

interface ProductGroup {
  id: string;
  name: string;
  itemIndices: number[];
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const emptyItem = (): InvoiceItem => ({
  type: "standard",
  productId: "",
  description: "",
  hsnCode: "",
  quantity: 1,
  price: 0,
  width: 0,
  length: 0,
  sheets: 0,
  ratePerSqm: 0,
  igstRate: 0,
  cgstRate: 0,
  sgstRate: 0,
  total: 0,
});

const emptyDimItem = (): InvoiceItem => ({
  type: "dimensional",
  productId: "",
  description: "",
  hsnCode: "",
  quantity: 1,
  price: 0,
  width: 0,
  length: 0,
  sheets: 0,
  ratePerSqm: 0,
  igstRate: 0,
  cgstRate: 0,
  sgstRate: 0,
  total: 0,
});

function getItemAmount(item: InvoiceItem): number {
  if (item.type === "dimensional" && item.width > 0 && item.length > 0 && item.sheets > 0 && item.ratePerSqm > 0) {
    return item.width * item.length * item.sheets * item.ratePerSqm;
  }
  return item.price * item.quantity;
}

export function CreateInvoiceDialog({
  isOpen,
  onClose,
  onSuccess,
  restoreDraft = false,
}: CreateInvoiceDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { setUILocked, showConfirm } = useUX();
  const { collapsed: sidebarCollapsed, collapse, expand } = useSidebar();
  const didAutoCollapseRef = useRef(false);
  const [isCustomerCreateOpen, setIsCustomerCreateOpen] = useState(false);
  const [isProductCreateOpen, setIsProductCreateOpen] = useState(false);

  // Core Form State
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [billingPrefix, setBillingPrefix] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Card" | "Bank" | "Cheque">("Cash");
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // Header fields
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [lrRrNumber, setLrRrNumber] = useState("");
  const [salesPerson, setSalesPerson] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [termsOfDelivery, setTermsOfDelivery] = useState("");

  // Transport details (collapsible)
  const [transportOpen, setTransportOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [buyersOrderNo, setBuyersOrderNo] = useState("");
  const [eWayBillNo, setEWayBillNo] = useState("");
  const [otherReferences, setOtherReferences] = useState("");

  // Invoice-level tax
  const [igstRate, setIgstRate] = useState(0);
  const [cgstRate, setCgstRate] = useState(0);
  const [sgstRate, setSgstRate] = useState(0);

  // Charges
  const [discount, setDiscount] = useState(0);
  const [freight, setFreight] = useState(0);
  const [packingCharges, setPackingCharges] = useState(0);
  const [loadingCharges, setLoadingCharges] = useState(0);
  const [insurance, setInsurance] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [cessRate, setCessRate] = useState(0);

  // Notes & Declaration
  const [notes, setNotes] = useState("");
  const [declaration, setDeclaration] = useState("");

  // Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");

  // Product Groups
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [enableGroups, setEnableGroups] = useState(false);

  // Auto-collapse sidebar when dialog opens, restore on close
  useEffect(() => {
    if (isOpen && !sidebarCollapsed) {
      didAutoCollapseRef.current = true;
      collapse();
    }
    return () => {
      if (didAutoCollapseRef.current) {
        expand();
        didAutoCollapseRef.current = false;
      }
    };
  }, [isOpen]);

  // Fetch bank accounts when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    api.get("system/bank-accounts").then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setBankAccounts(list);
      if (!bankAccountId) {
        const def = list.find((a: any) => a.isDefault);
        if (def) setBankAccountId(def.id);
        else if (list.length > 0) setBankAccountId(list[0].id);
      }
    }).catch(() => {});
  }, [isOpen]);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const addDimItem = useCallback(() => {
    setItems((prev) => [...prev, emptyDimItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: any) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: value };

      if (field === "productId" && value) {
        const product = products.find((p) => p.id === value);
        if (product) {
          item.price = Number(product.price);
          item.hsnCode = product.hsnCode || "";
          if (product.pricingMode === "area" && product.width && product.length) {
            item.type = "dimensional";
            item.width = product.width;
            item.length = product.length;
            if (!item.sheets) item.sheets = 1;
          }
          const gstRate = Number(product.gstRate || 0);
          if (gstRate > 0) {
            setIgstRate(gstRate);
            setCgstRate(0);
            setSgstRate(0);
          }
        }
      }

      if (field === "type") {
        if (value === "standard") {
          item.width = 0;
          item.length = 0;
          item.sheets = 0;
          item.ratePerSqm = 0;
          item.quantity = 1;
        }
        if (value === "dimensional") {
          if (!item.width && !item.length) {
            item.width = 1;
            item.length = 1;
            item.sheets = 1;
          }
          const rawQty = (item.width || 0) * (item.length || 0) * (item.sheets || 0);
          item.quantity = parseFloat(rawQty.toFixed(3));
        }
      }

      if (field === "width" || field === "length" || field === "sheets" || field === "ratePerSqm") {
        if (item.type === "dimensional") {
          const rawQty = (item.width || 0) * (item.length || 0) * (item.sheets || 0);
          item.quantity = parseFloat(rawQty.toFixed(3));
        }
        item.total = getItemAmount(item);
      }
      if (field === "quantity" || field === "price") {
        if (item.type === "dimensional" && field !== "quantity") {
          const rawQty = (item.width || 0) * (item.length || 0) * (item.sheets || 0);
          item.quantity = parseFloat(rawQty.toFixed(3));
          item.total = getItemAmount(item);
        } else {
          item.total = item.price * item.quantity;
        }
      }

      newItems[index] = item;
      return newItems;
    });
  }, [products]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + getItemAmount(item), 0);
  const afterDiscount = subtotal - discount;
  const chargesTotal = freight + packingCharges + loadingCharges + insurance + otherCharges;
  const taxableBase = afterDiscount + chargesTotal;
  const igstTotal = igstRate > 0 ? taxableBase * (igstRate / 100) : 0;
  const cgstTotal = cgstRate > 0 ? taxableBase * (cgstRate / 100) : 0;
  const sgstTotal = sgstRate > 0 ? taxableBase * (sgstRate / 100) : 0;
  const totalTax = igstTotal + cgstTotal + sgstTotal;
  const cessAmount = cessRate > 0 ? taxableBase * (cessRate / 100) : 0;
  const grandTotal = taxableBase + totalTax + cessAmount - roundOff;

  // Group calculations
  const getGroupSubtotal = useCallback((group: ProductGroup) => {
    return group.itemIndices.reduce((sum, idx) => {
      if (idx < items.length) return sum + getItemAmount(items[idx]);
      return sum;
    }, 0);
  }, [items]);

  const getGroupQty = useCallback((group: ProductGroup) => {
    return group.itemIndices.reduce((sum, idx) => {
      if (idx < items.length) {
        const item = items[idx];
        return sum + (item.type === "dimensional" ? item.sheets : item.quantity);
      }
      return sum;
    }, 0);
  }, [items]);

  const addGroup = useCallback(() => {
    const ungroupedIndices = items
      .map((_, i) => i)
      .filter((i) => !productGroups.some((g) => g.itemIndices.includes(i)));
    const newGroup: ProductGroup = {
      id: Date.now().toString(),
      name: "",
      itemIndices: ungroupedIndices.length > 0 ? [ungroupedIndices[0]] : [],
    };
    setProductGroups((prev) => [...prev, newGroup]);
  }, [items, productGroups]);

  const removeGroup = useCallback((groupId: string) => {
    setProductGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const updateGroup = useCallback((groupId: string, field: keyof ProductGroup, value: any) => {
    setProductGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, [field]: value } : g))
    );
  }, []);

  const toggleGroupItem = useCallback((groupId: string, itemIndex: number) => {
    setProductGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const has = g.itemIndices.includes(itemIndex);
        return {
          ...g,
          itemIndices: has
            ? g.itemIndices.filter((i) => i !== itemIndex)
            : [...g.itemIndices, itemIndex],
        };
      })
    );
  }, []);

  // Submit
  const executeSubmit = useCallback(async () => {
    setLoading(true);
    setUILocked(true);
    try {
      const apiItems = items.map((i) => {
        const product = products.find(p => p.id === i.productId);
        const itemPrice = i.price || Number(product?.price) || 0;
        
        const baseItem: Record<string, any> = {
          productId: i.productId,
          quantity: Number(i.quantity) || 1,
          price: itemPrice,
          gstRate: igstRate + cgstRate + sgstRate,
          gstType: igstRate > 0 ? "IGST" : "CGST_SGST",
          hsnCode: i.hsnCode || undefined,
        };
        if (i.type === "dimensional") {
          const area = i.width * i.length;
          const calculatedAmount = area * i.sheets * i.ratePerSqm;
          const perUnit = i.quantity > 0 ? calculatedAmount / i.quantity : calculatedAmount;
          baseItem.price = perUnit;
        }
        if (!i.productId && i.description) {
          baseItem.name = i.description;
        }
        return baseItem;
      });

      const itemSectionsData: Record<string, any> = {};
      items.forEach((i, idx) => {
        if (i.type === "dimensional") {
          itemSectionsData[`item_${idx}`] = {
            pricingMode: "area",
            width: i.width,
            length: i.length,
            sheets: i.sheets,
            ratePerSqm: i.ratePerSqm,
          };
        }
      });

      if (enableGroups && productGroups.length > 0) {
        itemSectionsData.productGroups = productGroups;
      }

      const res = await api.post("accounting/invoices", {
        customerId,
        billingPrefix: billingPrefix.trim() || undefined,
        issueDate: invoiceDate,
        dueDate: dueDate || invoiceDate,
        billingMode: "standard",
        items: apiItems,
        itemSections: Object.keys(itemSectionsData).length > 0 ? itemSectionsData : undefined,
        amountPaid: Number(amountPaid) || 0,
        paymentMode,
        bankAccountId: bankAccountId || undefined,
        placeOfSupply: placeOfSupply || undefined,
        referenceNumber: referenceNumber || undefined,
        lrRrNumber: lrRrNumber || undefined,
        salesPerson: salesPerson || undefined,
        warehouse: warehouse || undefined,
        paymentTerms: paymentTerms || undefined,
        termsOfDelivery: termsOfDelivery || undefined,
        vehicleNumber: vehicleNumber || undefined,
        buyersOrderNo: buyersOrderNo || undefined,
        eWayBillNo: eWayBillNo || undefined,
        otherReferences: otherReferences || undefined,
        discount: discount || undefined,
        freight: freight || undefined,
        packingCharges: packingCharges || undefined,
        loadingCharges: loadingCharges || undefined,
        insurance: insurance || undefined,
        otherCharges: otherCharges || undefined,
        roundOff: roundOff || undefined,
        cessAmount: cessAmount || undefined,
        notes: notes || undefined,
        declaration: declaration || undefined,
      });

      const newInvoiceId = res.data?.id;
      toast.success("Invoice issued successfully — opening preview...");
      localStorage.removeItem("invoice_draft");
      resetForm();
      onSuccess();
      onClose();
      if (newInvoiceId) window.open(`/invoice/${newInvoiceId}`, "_blank");
    } catch (err: unknown) {
      try {
        console.log("[Invoice Submit Error] Raw error:", err);
        console.log("[Invoice Submit Error] Error type:", typeof err);
        console.log("[Invoice Submit Error] Error keys:", err ? Object.keys(err as any) : "null");
        
        let errMsg = "Failed to issue invoice";
        
        const error = err as any;
        
        // Handle custom API error objects (from interceptors)
        if (error?.message && typeof error.message === "string") {
          errMsg = error.message;
        }
        // Handle axios response errors
        else if (error?.response?.data?.message) {
          const msg = error.response.data.message;
          if (Array.isArray(msg)) {
            errMsg = msg.join(", ");
          } else if (typeof msg === "string") {
            errMsg = msg;
          }
        }
        // Handle plain response data
        else if (error?.response?.data) {
          const data = error.response.data;
          if (typeof data === "string") {
            errMsg = data;
          } else if (data?.error) {
            errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
          }
        }
        // Fallback to error message
        else if (error?.message) {
          errMsg = String(error.message);
        }
        
        // Ensure errMsg is always a valid string
        if (!errMsg || typeof errMsg !== "string" || errMsg.length === 0) {
          errMsg = "Failed to issue invoice";
        }
        
        console.log("[Invoice Submit Error] Final message:", errMsg);
        toast.error(errMsg);
      } catch (toastErr) {
        console.error("[Invoice Submit Error] Exception in error handler:", toastErr);
        toast.error("Failed to issue invoice - please try again");
      }
    } finally {
      setLoading(false);
      setUILocked(false);
    }
  }, [
    customerId, billingPrefix, invoiceDate, dueDate, items, amountPaid, paymentMode, bankAccountId,
    placeOfSupply, referenceNumber, lrRrNumber, salesPerson, warehouse, paymentTerms,
    termsOfDelivery, vehicleNumber, buyersOrderNo, eWayBillNo, otherReferences,
    discount, freight, packingCharges, loadingCharges, insurance, otherCharges, roundOff,
    cessRate, notes, declaration, enableGroups, productGroups,
    igstRate, cgstRate, sgstRate, onSuccess, onClose, setUILocked,
  ]);

  const resetForm = useCallback(() => {
    setItems([emptyItem()]);
    setCustomerId("");
    setBillingPrefix("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setAmountPaid("");
    setPaymentMode("Cash");
    setPlaceOfSupply("");
    setReferenceNumber("");
    setLrRrNumber("");
    setSalesPerson("");
    setWarehouse("");
    setPaymentTerms("");
    setTermsOfDelivery("");
    setVehicleNumber("");
    setBuyersOrderNo("");
    setEWayBillNo("");
    setOtherReferences("");
    setIgstRate(0);
    setCgstRate(0);
    setSgstRate(0);
    setDiscount(0);
    setFreight(0);
    setPackingCharges(0);
    setLoadingCharges(0);
    setInsurance(0);
    setOtherCharges(0);
    setRoundOff(0);
    setCessRate(0);
    setNotes("");
    setDeclaration("");
    setProductGroups([]);
    setEnableGroups(false);
    setBankAccountId("");
  }, []);

  const handleSubmit = useCallback(() => {
    if (loading) return;
    if (!customerId || !customerId.trim()) {
      toast.error("Please select a valid customer");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        toast.error(`Please select a product for item ${i + 1}`);
        return;
      }
      if (!item.price || item.price <= 0) {
        toast.error(`Please set a valid price (> 0) for item ${i + 1}`);
        return;
      }
      if (item.type === "dimensional" && (!item.width || !item.length || !item.sheets || !item.ratePerSqm)) {
        toast.error(`Please fill dimensional fields (width, length, sheets, rate/m²) for item ${i + 1}`);
        return;
      }
    }

    const customerName = customers.find((c) => c.id === customerId)?.company || "Selected Customer";
    showConfirm({
      title: "Confirm Tax Invoice Posting",
      description: `You are about to post a compliant tax invoice for ₹${grandTotal.toLocaleString("en-IN")} to ${customerName}. This action will affect your accounting ledgers and cannot be deleted once saved (only cancelled).`,
      confirmText: "Issue & Post",
      cancelText: "Review",
      onConfirm: async () => {
        await executeSubmit();
      },
    });
  }, [loading, customerId, items, customers, showConfirm, executeSubmit, grandTotal]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) { onClose(); return; }
      if (e.altKey && e.key === "n") { e.preventDefault(); addItem(); }
      if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose, addItem, handleSubmit]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setIsInitialLoad(true);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== "undefined" && isOpen && isInitialLoad) {
      if (restoreDraft) {
        const draft = localStorage.getItem("invoice_draft");
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            setCustomerId(parsed.customerId || "");
            setInvoiceDate(parsed.invoiceDate || new Date().toISOString().split("T")[0]);
            setDueDate(parsed.dueDate || "");
            setItems((parsed.items || [emptyItem()]).map((item: any) => ({
              ...emptyItem(),
              ...item,
              type: item.type || "standard",
            })));
          } catch {
            setItems([emptyItem()]);
          }
        } else {
          setItems([emptyItem()]);
        }
      } else {
        setItems([emptyItem()]);
      }
      setIsInitialLoad(false);
    }
  }, [isOpen, isInitialLoad, restoreDraft]);

  useEffect(() => {
    if (!isInitialLoad && isOpen) {
      localStorage.setItem("invoice_draft", JSON.stringify({ customerId, invoiceDate, dueDate, items }));
    }
  }, [customerId, invoiceDate, dueDate, items, isOpen, isInitialLoad]);

  const fetchData = useCallback(async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get("crm/customers"),
        api.get("inventory/products"),
      ]);
      const rawCustomers = custRes.data?.data ?? custRes.data;
      const rawProducts = prodRes.data?.data ?? prodRes.data?.items ?? prodRes.data;
      setCustomers(Array.isArray(rawCustomers) ? rawCustomers : []);
      setProducts(Array.isArray(rawProducts) ? rawProducts : []);
    } catch {
      toast.error("Failed to load resources");
      setCustomers([]);
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  const onQuickCounterSale = useCallback(() => {
    const walkIn = customers.find((c) => c.email === "walkin@system.local");
    if (walkIn) setCustomerId(walkIn.id);
  }, [customers]);

  const groupedItemIndices = new Set(productGroups.flatMap((g) => g.itemIndices));
  const ungroupedItems = items.map((_, i) => i).filter((i) => !groupedItemIndices.has(i));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${sidebarCollapsed ? "sm:max-w-[920px]" : "sm:max-w-[760px]"} bg-white text-slate-900 border-slate-200 max-h-[90vh] overflow-y-auto gap-1 p-2 transition-all duration-300`}>
        <DialogHeader>
          <DialogTitle>Issue New Invoice</DialogTitle>
          <DialogDescription className="text-slate-500">
            Create a compliant tax invoice for your customer.
          </DialogDescription>
        </DialogHeader>

        {/* Row 1: Customer + Dates */}
        <div className="grid grid-cols-12 gap-1 py-0.5">
          <div className="col-span-4 space-y-0.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Customer</Label>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setIsCustomerCreateOpen(true)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">+ New</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={onQuickCounterSale} className="text-[10px] font-bold text-amber-600 hover:text-amber-700">Walk-In</button>
              </div>
            </div>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.company})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-8 grid grid-cols-4 gap-1">
            <div className="space-y-0.5">
              <Label className="text-xs">Billing Prefix</Label>
              <Input placeholder="JDI" className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={billingPrefix} onChange={(e) => setBillingPrefix(e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Invoice Date</Label>
              <Input type="date" className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Due Date</Label>
              <Input type="date" className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Place of Supply</Label>
              <Input placeholder="Karnataka" className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Row 2: Payment + Reference */}
        <div className="grid grid-cols-12 gap-1">
          <div className="col-span-2 space-y-0.5">
            <Label className="text-xs">Payment Terms</Label>
            <Input className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-0.5">
            <Label className="text-xs">Payment Mode</Label>
            <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
              <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900">
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Bank">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-0.5">
            <Label className="text-xs">Receive In</Label>
            {bankAccounts.length > 1 ? (
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8"><SelectValue placeholder="Select Bank" /></SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900">
                  {bankAccounts.map((b: any) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">{b.bankName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={bankAccounts[0]?.bankName || ""} disabled />
            )}
          </div>
          <div className="col-span-2 space-y-0.5">
            <Label className="text-xs">Amount Paid</Label>
            <Input type="number" min="0" step="0.01" className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" />
          </div>
          <div className="col-span-2 space-y-0.5">
            <Label className="text-xs">Reference No.</Label>
            <Input className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-1">
            <div className="space-y-0.5">
              <Label className="text-xs">Sales Person</Label>
              <Input className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={salesPerson} onChange={(e) => setSalesPerson(e.target.value)} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Warehouse</Label>
              <Input className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Transport Details (collapsible) */}
        <div className="border rounded-md border-slate-200">
          <button
            type="button"
            onClick={() => setTransportOpen(!transportOpen)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50"
          >
            {transportOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Transport Details
          </button>
          {transportOpen && (
            <div className="grid grid-cols-4 gap-1 px-3 pb-2">
              <div className="space-y-1">
                <Label>Buyer Order No.</Label>
                <Input placeholder="Order number" className="bg-slate-50 border-slate-200 text-slate-900" value={buyersOrderNo} onChange={(e) => setBuyersOrderNo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Vehicle Number</Label>
                <Input placeholder="e.g. AP02TE5669" className="bg-slate-50 border-slate-200 text-slate-900" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>LR/RR Number</Label>
                <Input placeholder="LR/RR number" className="bg-slate-50 border-slate-200 text-slate-900" value={lrRrNumber} onChange={(e) => setLrRrNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>E-Way Bill No.</Label>
                <Input placeholder="Optional" className="bg-slate-50 border-slate-200 text-slate-900" value={eWayBillNo} onChange={(e) => setEWayBillNo(e.target.value)} />
              </div>
              <div className="col-span-4 space-y-1">
                <Label>Terms of Delivery</Label>
                <Input placeholder="e.g. Ex Works, FOB" className="bg-slate-50 border-slate-200 text-slate-900" value={termsOfDelivery} onChange={(e) => setTermsOfDelivery(e.target.value)} />
              </div>
              <div className="col-span-4 space-y-1">
                <Label>Other References</Label>
                <Input placeholder="e.g. Party Self Vehicle" className="bg-slate-50 border-slate-200 text-slate-900" value={otherReferences} onChange={(e) => setOtherReferences(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Product Groups Toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableGroups}
              onChange={(e) => {
                setEnableGroups(e.target.checked);
                if (e.target.checked && productGroups.length === 0) addGroup();
                if (!e.target.checked) setProductGroups([]);
              }}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-xs font-bold text-slate-600">Enable Product Groups</span>
          </label>
          {enableGroups && (
            <Button type="button" variant="outline" size="sm" onClick={addGroup} className="h-7 text-[10px]">
              <Plus className="h-3 w-3 mr-1" /> Add Group
            </Button>
          )}
        </div>

        {/* Items Table */}
        <div className="border rounded-md border-slate-200 overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="text-slate-500 w-[140px] text-[10px] font-semibold py-1 px-1">
                  <div className="flex justify-between items-center gap-1">
                    <span>Item Details</span>
                    <button type="button" onClick={() => setIsProductCreateOpen(true)} className="shrink-0 text-[8px] font-bold text-blue-600 hover:text-blue-700 leading-none">+ Create</button>
                  </div>
                </TableHead>
                <TableHead className="text-slate-500 w-[64px] text-[10px] font-semibold py-1 px-1">Type</TableHead>
                <TableHead className="text-slate-500 w-[50px] text-[10px] font-semibold py-1 px-1">HSN</TableHead>
                <TableHead className="text-slate-500 text-center w-[48px] text-[10px] font-semibold py-1 px-1">W</TableHead>
                <TableHead className="text-slate-500 text-center w-[48px] text-[10px] font-semibold py-1 px-1">L</TableHead>
                <TableHead className="text-slate-500 text-center w-[48px] text-[10px] font-semibold py-1 px-1">Sheets</TableHead>
                <TableHead className="text-slate-500 text-right w-[52px] text-[10px] font-semibold py-1 px-1">Qty</TableHead>
                <TableHead className="text-slate-500 text-right w-[60px] text-[10px] font-semibold py-1 px-1">Rate</TableHead>
                <TableHead className="text-slate-500 text-right w-[88px] text-[10px] font-semibold py-1 px-1">Amount</TableHead>
                <TableHead className="w-[28px] py-1 px-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enableGroups && productGroups.map((group) => (
                <React.Fragment key={group.id}>
                  <TableRow className="bg-blue-50/50 border-slate-200">
                    <TableCell colSpan={10} className="py-1 px-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={group.name}
                          onChange={(e) => updateGroup(group.id, "name", e.target.value)}
                          placeholder="Group name (e.g. Roofing Sheets)"
                          className="h-7 text-xs font-bold bg-transparent border-transparent focus:bg-white focus:border-slate-200 w-64"
                        />
                        <span className="text-[10px] text-slate-400">
                          {getGroupQty(group)} pcs | ₹{getGroupSubtotal(group).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <button type="button" onClick={() => removeGroup(group.id)} className="ml-auto text-slate-400 hover:text-rose-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {group.itemIndices.map((idx) => {
                    const item = items[idx];
                    if (!item) return null;
                    return (
                      <TableRow key={`g-${group.id}-${idx}`} className="border-slate-200 hover:bg-slate-50">
                        <TableCell className="p-0.5">
                          <Select value={item.productId} onValueChange={(val) => {
                            updateItem(idx, "productId", val);
                            if (item.type === "dimensional" && !item.description) {
                              const p = products.find((pp) => pp.id === val);
                              if (p) updateItem(idx, "description", p.name);
                            }
                          }}>
                            <SelectTrigger className="h-7 bg-transparent border-transparent focus:bg-slate-100 text-slate-900 text-[10px]">
                              <SelectValue placeholder="Select" className="truncate" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 text-slate-900 max-h-60 overflow-y-auto">
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-[10px]">
                                  <span className="font-medium">{p.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {item.productId && (() => { const p = products.find((pp) => pp.id === item.productId); return p ? <span className="text-[8px] text-slate-400 leading-none">{p.sku}</span> : null; })()}
                        </TableCell>
                        <TableCell className="py-1 text-[10px]">
                          <Select value={item.type} onValueChange={(val: any) => {
                            updateItem(idx, "type", val);
                            if (val === "dimensional" && item.productId && !item.description) {
                              const p = products.find((pp) => pp.id === item.productId);
                              if (p) updateItem(idx, "description", p.name);
                            }
                          }}>
                            <SelectTrigger className="h-7 text-[10px] bg-transparent border-transparent"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 text-slate-900">
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="dimensional">Dimensional</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-0.5"><Input value={item.hsnCode} onChange={(e) => updateItem(idx, "hsnCode", e.target.value)} className="h-7 text-[10px] w-[50px] px-1 bg-transparent border-slate-200 text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="HSN" /></TableCell>
                        <TableCell className="p-0.5"><Input type="number" value={item.type === "standard" ? "" : (item.width || "")} onChange={(e) => updateItem(idx, "width", parseFloat(e.target.value) || 0)} className="h-7 text-[10px] w-[46px] px-0 bg-transparent border-slate-200 text-center text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:text-slate-400 disabled:opacity-100" disabled={item.type === "standard"} /></TableCell>
                        <TableCell className="p-0.5"><Input type="number" value={item.type === "standard" ? "" : (item.length || "")} onChange={(e) => updateItem(idx, "length", parseFloat(e.target.value) || 0)} className="h-7 text-[10px] w-[46px] px-0 bg-transparent border-slate-200 text-center text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:text-slate-400 disabled:opacity-100" disabled={item.type === "standard"} /></TableCell>
                        <TableCell className="p-0.5"><Input type="number" value={item.type === "standard" ? "" : (item.sheets || "")} onChange={(e) => updateItem(idx, "sheets", parseInt(e.target.value) || 0)} className="h-7 text-[10px] w-[46px] px-0 bg-transparent border-slate-200 text-center text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:text-slate-400 disabled:opacity-100" disabled={item.type === "standard"} /></TableCell>
                        <TableCell className="p-0.5"><Input type="number" min="0" value={item.type === "dimensional" ? (item.quantity || 0) : (item.quantity || "")} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="h-7 text-[10px] w-[50px] px-1 bg-transparent border-slate-200 text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:text-slate-900 disabled:opacity-100 text-right" disabled={item.type === "dimensional"} /></TableCell>
                        <TableCell className="p-0.5">
                          {item.type === "dimensional" ? (
                            <Input type="number" min="0" step="0.01" value={item.ratePerSqm || ""} onChange={(e) => updateItem(idx, "ratePerSqm", parseFloat(e.target.value) || 0)} className="h-7 text-[10px] w-[56px] px-1 bg-transparent border-slate-200 text-right text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="/m²" />
                          ) : (
                            <span className="text-[10px] text-slate-700 font-mono">₹{item.price.toLocaleString("en-IN")}</span>
                          )}
                        </TableCell>
                        <TableCell className="p-0.5 text-right text-[10px] font-bold text-slate-900 font-mono tabular-nums whitespace-nowrap">
                          ₹{getItemAmount(item).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="p-0.5"><Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-7 w-7 text-slate-500 hover:text-rose-500"><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* Ungrouped items */}
              {(enableGroups ? ungroupedItems : items.map((_, i) => i)).map((idx) => {
                const item = items[idx];
                if (!item) return null;
                return (
                  <TableRow key={idx} className="border-slate-200 hover:bg-slate-50">
                    <TableCell className="p-0.5">
                      <div>
                        <Select value={item.productId || ""} onValueChange={(val) => {
                          updateItem(idx, "productId", val);
                          const p = products.find((pp) => pp.id === val);
                          if (p && item.type === "dimensional" && !item.description) {
                            updateItem(idx, "description", p.name);
                          }
                        }}>
                          <SelectTrigger className="h-7 bg-transparent border-transparent focus:bg-slate-100 text-slate-900 text-[10px]">
                            <SelectValue placeholder="Select" className="truncate" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 text-slate-900 max-h-60 overflow-y-auto">
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-[10px]">
                                <span className="font-medium">{p.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {item.productId && (() => { const p = products.find((pp) => pp.id === item.productId); return p ? <span className="text-[8px] text-slate-400 leading-none">{p.sku}</span> : null; })()}
                      </div>
                    </TableCell>
                    <TableCell className="p-0.5">
                      <Select value={item.type} onValueChange={(val: any) => {
                        updateItem(idx, "type", val);
                        if (val === "dimensional" && item.productId && !item.description) {
                          const p = products.find((pp) => pp.id === item.productId);
                          if (p) updateItem(idx, "description", p.name);
                        }
                      }}>
                        <SelectTrigger className="h-7 text-[10px] bg-transparent border-transparent"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-900">
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="dimensional">Dimensional</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-0.5"><Input value={item.hsnCode} onChange={(e) => updateItem(idx, "hsnCode", e.target.value)} className="h-7 text-[10px] w-[50px] px-1 bg-transparent border-slate-200 text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="HSN" /></TableCell>
                    <TableCell className="p-0.5"><Input type="number" value={item.type === "standard" ? "" : (item.width || "")} onChange={(e) => updateItem(idx, "width", parseFloat(e.target.value) || 0)} className="h-7 text-[10px] w-[46px] px-0 bg-transparent border-slate-200 text-center text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:text-slate-400 disabled:opacity-100" disabled={item.type === "standard"} /></TableCell>
                    <TableCell className="p-0.5"><Input type="number" value={item.type === "standard" ? "" : (item.length || "")} onChange={(e) => updateItem(idx, "length", parseFloat(e.target.value) || 0)} className="h-7 text-[10px] w-[46px] px-0 bg-transparent border-slate-200 text-center text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:text-slate-400 disabled:opacity-100" disabled={item.type === "standard"} /></TableCell>
                    <TableCell className="p-0.5"><Input type="number" value={item.type === "standard" ? "" : (item.sheets || "")} onChange={(e) => updateItem(idx, "sheets", parseInt(e.target.value) || 0)} className="h-7 text-[10px] w-[46px] px-0 bg-transparent border-slate-200 text-center text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:text-slate-400 disabled:opacity-100" disabled={item.type === "standard"} /></TableCell>
                    <TableCell className="p-0.5"><Input type="number" min="0" value={item.type === "dimensional" ? (item.quantity || 0) : (item.quantity || "")} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="h-7 text-[10px] w-[50px] px-1 bg-transparent border-slate-200 text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:text-slate-900 disabled:opacity-100 text-right" disabled={item.type === "dimensional"} /></TableCell>
                    <TableCell className="p-0.5">
                      {item.type === "dimensional" ? (
                        <Input type="number" min="0" step="0.01" value={item.ratePerSqm || ""} onChange={(e) => updateItem(idx, "ratePerSqm", parseFloat(e.target.value) || 0)} className="h-7 text-[10px] w-[56px] px-1 bg-transparent border-slate-200 text-right text-slate-900 font-mono appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="/m²" />
                      ) : (
                        <span className="text-[10px] text-slate-700 font-mono">₹{item.price.toLocaleString("en-IN")}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1 text-right text-[10px] font-bold text-slate-900 font-mono">
                      ₹{getItemAmount(item).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="p-0.5"><Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-7 w-7 text-slate-500 hover:text-rose-500"><Trash2 className="h-3 w-3" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Tax Section */}
        <div className="border rounded-md border-slate-200 p-3 bg-slate-50/50">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tax</div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={igstRate > 0} onChange={(e) => setIgstRate(e.target.checked ? 18 : 0)} className="w-4 h-4 rounded border-slate-300" />
              <span className="text-xs font-bold text-slate-600">IGST</span>
              <Input type="number" min="0" max="100" step="0.5" className="h-7 bg-white border-slate-200 text-slate-900 w-16 text-center text-xs font-mono" value={igstRate || ""} onChange={(e) => { const val = e.target.value === "" ? 0 : parseFloat(e.target.value); setIgstRate(isNaN(val) ? 0 : val); }} disabled={igstRate === 0} />
              <span className="text-[10px] text-slate-400">%</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={cgstRate > 0} onChange={(e) => setCgstRate(e.target.checked ? 9 : 0)} className="w-4 h-4 rounded border-slate-300" />
              <span className="text-xs font-bold text-slate-600">CGST</span>
              <Input type="number" min="0" max="100" step="0.5" className="h-7 bg-white border-slate-200 text-slate-900 w-16 text-center text-xs font-mono" value={cgstRate || ""} onChange={(e) => { const val = e.target.value === "" ? 0 : parseFloat(e.target.value); setCgstRate(isNaN(val) ? 0 : val); }} disabled={cgstRate === 0} />
              <span className="text-[10px] text-slate-400">%</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={sgstRate > 0} onChange={(e) => setSgstRate(e.target.checked ? 9 : 0)} className="w-4 h-4 rounded border-slate-300" />
              <span className="text-xs font-bold text-slate-600">SGST</span>
              <Input type="number" min="0" max="100" step="0.5" className="h-7 bg-white border-slate-200 text-slate-900 w-16 text-center text-xs font-mono" value={sgstRate || ""} onChange={(e) => { const val = e.target.value === "" ? 0 : parseFloat(e.target.value); setSgstRate(isNaN(val) ? 0 : val); }} disabled={sgstRate === 0} />
              <span className="text-[10px] text-slate-400">%</span>
            </div>
          </div>
        </div>

        {/* Bottom: Add buttons + Totals */}
        <div className="sticky bottom-0 bg-white pt-0.5 pb-0 border-t border-slate-200 mt-0.5 z-20">
          <div className="flex justify-between items-start">
            <div className="flex gap-2">
              <Button variant="outline" onClick={addItem} className="border-dashed border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-50 h-8 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Add Line
              </Button>
              <Button variant="outline" onClick={addDimItem} className="border-dashed border-blue-300 text-blue-500 hover:text-blue-900 hover:bg-blue-50 h-8 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Add Dimensional
              </Button>
            </div>

            <div className="w-[280px] space-y-1 text-right text-xs">
              <div className="flex justify-between text-slate-500"><span>Subtotal:</span><span className="font-mono">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
              {discount > 0 && <div className="flex justify-between text-slate-500"><span>Discount:</span><span className="font-mono text-rose-600">-₹{discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
              {chargesTotal > 0 && (
                <>
                  {freight > 0 && <div className="flex justify-between text-slate-500"><span>Freight:</span><span className="font-mono">₹{freight.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                  {packingCharges > 0 && <div className="flex justify-between text-slate-500"><span>Packing:</span><span className="font-mono">₹{packingCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                  {loadingCharges > 0 && <div className="flex justify-between text-slate-500"><span>Loading:</span><span className="font-mono">₹{loadingCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                  {insurance > 0 && <div className="flex justify-between text-slate-500"><span>Insurance:</span><span className="font-mono">₹{insurance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                  {otherCharges > 0 && <div className="flex justify-between text-slate-500"><span>Other:</span><span className="font-mono">₹{otherCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                </>
              )}
              {igstTotal > 0 && <div className="flex justify-between text-slate-500"><span>IGST:</span><span className="font-mono">₹{igstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
              {cgstTotal > 0 && <div className="flex justify-between text-slate-500"><span>CGST:</span><span className="font-mono">₹{cgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
              {sgstTotal > 0 && <div className="flex justify-between text-slate-500"><span>SGST:</span><span className="font-mono">₹{sgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
              {cessAmount > 0 && <div className="flex justify-between text-slate-500"><span>CESS:</span><span className="font-mono">₹{cessAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
              {roundOff !== 0 && <div className="flex justify-between text-slate-500"><span>Round Off:</span><span className="font-mono">{roundOff > 0 ? "+" : ""}₹{roundOff.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
              <div className="flex justify-between text-lg font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total:</span>
                <span className="font-mono">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charges Row */}
        <div className="grid grid-cols-6 gap-1.5 border rounded-md border-slate-200 p-2 bg-slate-50/50">
          <div className="space-y-1"><Label className="text-[10px]">Discount</Label><Input type="number" min="0" step="0.01" className="h-7 text-[10px] bg-white border-slate-200" value={discount || ""} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} placeholder="0" /></div>
          <div className="space-y-1"><Label className="text-[10px]">Freight</Label><Input type="number" min="0" step="0.01" className="h-7 text-[10px] bg-white border-slate-200" value={freight || ""} onChange={(e) => setFreight(parseFloat(e.target.value) || 0)} placeholder="0" /></div>
          <div className="space-y-1"><Label className="text-[10px]">Packing</Label><Input type="number" min="0" step="0.01" className="h-7 text-[10px] bg-white border-slate-200" value={packingCharges || ""} onChange={(e) => setPackingCharges(parseFloat(e.target.value) || 0)} placeholder="0" /></div>
          <div className="space-y-1"><Label className="text-[10px]">Loading</Label><Input type="number" min="0" step="0.01" className="h-7 text-[10px] bg-white border-slate-200" value={loadingCharges || ""} onChange={(e) => setLoadingCharges(parseFloat(e.target.value) || 0)} placeholder="0" /></div>
          <div className="space-y-1"><Label className="text-[10px]">Insurance</Label><Input type="number" min="0" step="0.01" className="h-7 text-[10px] bg-white border-slate-200" value={insurance || ""} onChange={(e) => setInsurance(parseFloat(e.target.value) || 0)} placeholder="0" /></div>
          <div className="space-y-1"><Label className="text-[10px]">Other / Round Off</Label><div className="flex gap-1"><Input type="number" min="0" step="0.01" className="h-7 text-[10px] bg-white border-slate-200" value={otherCharges || ""} onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)} placeholder="Other" /><Input type="number" step="0.01" className="h-7 text-[10px] bg-white border-slate-200" value={roundOff || ""} onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)} placeholder="R/O" /></div></div>
        </div>

        {/* Notes & Declaration */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-1"><Label className="text-[10px] text-slate-500">Notes</Label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-16 text-[10px] border border-slate-200 rounded-md p-2 bg-slate-50 resize-none" placeholder="Additional notes..." /></div>
          <div className="space-y-1"><Label className="text-[10px] text-slate-500">Declaration</Label><textarea value={declaration} onChange={(e) => setDeclaration(e.target.value)} className="w-full h-16 text-[10px] border border-slate-200 rounded-md p-2 bg-slate-50 resize-none" placeholder="Declaration text..." /></div>
        </div>

        <DialogFooter className="pt-0.5">
          <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-900">Cancel</Button>
          <Button onClick={handleSubmit} className="bg-amber-600 hover:bg-amber-700 text-white px-4" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Issue Tax Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
      <InlineCreateCustomerDialog
        open={isCustomerCreateOpen}
        onOpenChange={setIsCustomerCreateOpen}
        onSuccess={(newCust) => { fetchData(); setCustomerId(newCust.id); }}
      />
      <InlineCreateProductDialog
        open={isProductCreateOpen}
        onOpenChange={setIsProductCreateOpen}
        onSuccess={(newProd) => {
          fetchData();
          setItems((prev) => {
            const copy = [...prev];
            const lastEmpty = copy.findIndex((i) => !i.productId && i.type === "standard");
            if (lastEmpty >= 0) {
              copy[lastEmpty] = { ...copy[lastEmpty], productId: newProd.id, price: Number(newProd.price), hsnCode: newProd.hsnCode || "", total: Number(newProd.price) };
              return copy;
            }
            return [...copy, { ...emptyItem(), productId: newProd.id, price: Number(newProd.price), hsnCode: newProd.hsnCode || "", total: Number(newProd.price) }];
          });
          const gstRate = Number(newProd.gstRate || 0);
          if (gstRate > 0) { setIgstRate(gstRate); setCgstRate(0); setSgstRate(0); }
        }}
      />
    </Dialog>
  );
}
