import React, { useState, useMemo } from "react";
import {
  User,
  Settings,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Smartphone,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { NumericInput } from "../../ui/numeric-input";
import { InlineCreateCustomerDialog } from "../../shared/inline-create-customer-dialog";
import { fuzzySearch, fuzzySearchWeighted } from "../../../lib/fuzzy-search";

interface CheckoutSidebarProps {
  customerId: string | null;
  setCustomerId: (id: string | null) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customers: any[];
  onAddCustomerSuccess: (newCust: any) => void;
  paymentMode: "CASH" | "UPI" | "CREDIT";
  setPaymentMode: (mode: "CASH" | "UPI" | "CREDIT") => void;
  customAmountPaid: number;
  setCustomAmountPaid: (val: number) => void;
  billingAddress: string;
  setBillingAddress: (val: string) => void;
  shippingAddress: string;
  setShippingAddress: (val: string) => void;
  supplierAddress: string;
  setSupplierAddress: (val: string) => void;
  bankAccountId: string;
  setBankAccountId: (val: string) => void;
  bankAccounts: any[];
  subtotal: number;
  taxTotal: number;
  igstTotal?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  total: number;
  itemsCount: number;
  isSubmitting: boolean;
  completeInvoice: () => void;
  userRole: string | null;
  canBill: boolean;
}

export const CheckoutSidebar: React.FC<CheckoutSidebarProps> = ({
  customerId,
  setCustomerId,
  customerName,
  setCustomerName,
  customers,
  onAddCustomerSuccess,
  paymentMode,
  setPaymentMode,
  customAmountPaid,
  setCustomAmountPaid,
  billingAddress,
  setBillingAddress,
  shippingAddress,
  setShippingAddress,
  supplierAddress,
  setSupplierAddress,
  bankAccountId,
  setBankAccountId,
  bankAccounts,
  subtotal,
  taxTotal,
  igstTotal = 0,
  cgstTotal = 0,
  sgstTotal = 0,
  total,
  itemsCount,
  isSubmitting,
  completeInvoice,
  userRole,
  canBill,
}) => {
  const [isCustomerCreateOpen, setIsCustomerCreateOpen] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Use fuzzy search for better customer matching
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];

    // Create searchable format: "firstName lastName company phone"
    const searchableCustomers = customers.map((c) => ({
      ...c,
      searchText: `${c.firstName} ${c.lastName || ""} ${c.company || ""} ${c.phone || ""}`,
    }));

    // Use fuzzy search with weighted fields
    const results = fuzzySearchWeighted(
      searchableCustomers,
      customerSearch,
      {
        firstName: 0.3,
        lastName: 0.2,
        company: 0.25,
        phone: 0.25,
      } as any,
      0.2 // Lower threshold for typo tolerance
    );

    return results.map((match) => match.item);
  }, [customers, customerSearch]);

  const handleSelectCustomer = (customer: any) => {
    setCustomerId(customer.id);
    setCustomerName(`${customer.firstName} ${customer.lastName || ""}`.trim());
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  return (
    <div className="w-full h-full bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-2xl">
      {/* Identity Header / Customer Selector */}
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Customer Selection</span>
          </div>
          <button
            onClick={() => setIsCustomerCreateOpen(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold"
          >
            + New Customer
          </button>
        </div>
        
        {/* Searchable Customer Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={customerId ? customerName : "Search customer by name or phone..."}
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setShowCustomerDropdown(true);
            }}
            onFocus={() => setShowCustomerDropdown(true)}
            className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {showCustomerDropdown && customerSearch && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-b-0 text-xs font-medium text-slate-700 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold">{`${c.firstName} ${c.lastName || ""}`.trim()}</div>
                      {c.company && <div className="text-slate-400 text-[10px]">{c.company}</div>}
                      {c.phone && <div className="text-slate-400 text-[10px]">{c.phone}</div>}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-slate-400 text-center">No customers found</div>
              )}
            </div>
          )}
          
          {customerId && (
            <button
              onClick={() => {
                setCustomerId(null);
                setCustomerName("Walk-in Customer");
                setCustomerSearch("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-red-500 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-2 flex-1 overflow-y-auto space-y-1.5">
        {/* Collapsible Address Section */}
        <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setShowAddresses(!showAddresses)}
            className="w-full flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest outline-none"
          >
            <span>Address Details</span>
            <span className="text-[10px] font-bold text-blue-600">
              {showAddresses ? "Hide" : "Show"}
            </span>
          </button>
          {showAddresses && (
            <div className="space-y-1.5 pt-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Billing Address</label>
                <textarea
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Enter billing address..."
                  className="w-full h-16 p-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shipping Address</label>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter shipping address..."
                  className="w-full h-16 p-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supplier Address (Our Details)</label>
                <textarea
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Override our company address on invoice..."
                  className="w-full h-16 p-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Payment Modes */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Select Payment Type
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMode("CASH")}
              className={cn(
                "h-14 rounded-xl flex flex-row items-center justify-center gap-2 border-2 transition-all active:scale-95",
                paymentMode === "CASH"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner"
                  : "bg-white border-slate-100 text-slate-500 hover:border-emerald-200",
              )}
            >
              <Banknote className="w-4 h-4" />
              <span className="font-black text-xs uppercase tracking-tight">Cash</span>
            </button>
            <button
              onClick={() => setPaymentMode("UPI")}
              className={cn(
                "h-14 rounded-xl flex flex-row items-center justify-center gap-2 border-2 transition-all active:scale-95",
                paymentMode === "UPI"
                  ? "bg-blue-50 border-blue-500 text-blue-700 shadow-inner"
                  : "bg-white border-slate-100 text-slate-500 hover:border-blue-200",
              )}
            >
              <Smartphone className="w-4 h-4" />
              <span className="font-black text-xs uppercase tracking-tight">UPI</span>
            </button>
            <button
              onClick={() => setPaymentMode("CREDIT")}
              className={cn(
                "h-14 rounded-xl flex flex-row items-center justify-center gap-2 border-2 transition-all active:scale-95",
                paymentMode === "CREDIT"
                  ? "bg-purple-50 border-purple-500 text-purple-700 shadow-inner"
                  : "bg-white border-slate-100 text-slate-500 hover:border-purple-200",
              )}
            >
              <CreditCard className="w-4 h-4" />
              <span className="font-black text-xs uppercase tracking-tight">Card</span>
            </button>
          </div>
        </div>

        {/* Bank Account (only if multiple accounts exist) */}
        {bankAccounts.length > 1 && (
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Receive In
            </p>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {bankAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountNumber}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount Entry */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Amount Received
          </p>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border-2 border-slate-100 focus-within:border-blue-600 focus-within:bg-white transition-all">
            <span className="text-slate-400 font-black text-lg">₹</span>
            <NumericInput
              value={customAmountPaid}
              onChange={(val) => setCustomAmountPaid(val)}
              placeholder={total.toFixed(2)}
              className="w-full bg-transparent text-2xl font-black text-slate-900 outline-none tabular-nums placeholder:text-slate-200 border-none shadow-none p-0 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Invoice Summary */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Order Summary
          </p>
          <div className="space-y-1.5 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-tight">
              <span>Subtotal</span>
              <span className="tabular-nums">
                ₹
                {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {igstTotal > 0 && (
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>IGST</span>
                <span className="tabular-nums">
                  ₹{igstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {cgstTotal > 0 && (
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>CGST</span>
                <span className="tabular-nums">
                  ₹{cgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {sgstTotal > 0 && (
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>SGST</span>
                <span className="tabular-nums">
                  ₹{sgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {taxTotal > 0 && (
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Total Tax</span>
                <span className="tabular-nums">
                  ₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="h-px bg-slate-200/50 my-1" />
            <div className="flex justify-between items-center">
              <span className="font-black text-slate-900 text-lg uppercase tracking-tight">
                Final Amount
              </span>
              <span className="font-black text-slate-900 text-2xl tabular-nums">
                ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Action */}
      <div className="px-3 pb-3 pt-2 border-t border-slate-200 bg-white">
        {canBill ? (
          <button
            disabled={itemsCount === 0 || isSubmitting}
            onClick={completeInvoice}
            className="w-full bg-blue-600 text-white h-14 rounded-2xl text-base font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span>Syncing...</span>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span>Finalize Bill</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold opacity-60">[F1]</span>
              </>
            )}
          </button>
        ) : (
          <div className="p-3 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs font-black text-rose-900 uppercase leading-tight">Terminal Locked — Manager Required</span>
          </div>
        )}
      </div>

      <InlineCreateCustomerDialog
        open={isCustomerCreateOpen}
        onOpenChange={setIsCustomerCreateOpen}
        onSuccess={onAddCustomerSuccess}
      />
    </div>
  );
};
