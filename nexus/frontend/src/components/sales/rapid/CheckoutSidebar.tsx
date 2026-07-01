import React, { useState } from "react";
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

interface CheckoutSidebarProps {
  customerId: string | null;
  setCustomerId: (id: string | null) => void;
  customerName?: string;
  setCustomerName: (name: string) => void;
  customers: Record<string, unknown>[];
  onAddCustomerSuccess: (newCust: Record<string, unknown>) => void;
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
  subtotal: number;
  taxTotal: number;
  total: number;
  itemsCount: number;
  isSubmitting: boolean;
  completeInvoice: () => void;
  userRole: string | null;
}

export const CheckoutSidebar: React.FC<CheckoutSidebarProps> = ({
  customerId,
  setCustomerId,
  /* customerName, */
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
  subtotal,
  taxTotal,
  total,
  itemsCount,
  isSubmitting,
  completeInvoice,
  userRole,
}) => {
  const [isCustomerCreateOpen, setIsCustomerCreateOpen] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);

  return (
    <div className="w-[420px] bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl relative z-30">
      {/* Identity Header / Customer Selector */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2.5 shrink-0">
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
        <select
          value={customerId || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              setCustomerId(null);
              setCustomerName("Walk-in Customer");
            } else {
              setCustomerId(val);
              const found = customers.find((c) => c.id === val);
              setCustomerName(found ? `${found.firstName} ${found.lastName || ""}`.trim() : "Walk-in Customer");
            }
          }}
          className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Walk-in Customer / Guest</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company ? `${c.company} (${c.firstName})` : `${c.firstName} ${c.lastName || ""}`.trim()}
            </option>
          ))}
        </select>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {/* Collapsible Address Section */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
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
            <div className="space-y-3 pt-3">
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
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
            Select Payment Type
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMode("CASH")}
              className={cn(
                "h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95",
                paymentMode === "CASH"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner"
                  : "bg-white border-slate-100 text-slate-500 hover:border-emerald-200",
              )}
            >
              <Banknote className="w-8 h-8 mb-1" />
              <span className="font-black text-xs uppercase tracking-tight">
                Cash Pay
              </span>
            </button>
            <button
              onClick={() => setPaymentMode("UPI")}
              className={cn(
                "h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95",
                paymentMode === "UPI"
                  ? "bg-blue-50 border-blue-500 text-blue-700 shadow-inner"
                  : "bg-white border-slate-100 text-slate-500 hover:border-blue-200",
              )}
            >
              <Smartphone className="w-8 h-8 mb-1" />
              <span className="font-black text-xs uppercase tracking-tight">
                Digital UPI
              </span>
            </button>
            <button
              onClick={() => setPaymentMode("CREDIT")}
              className={cn(
                "h-24 col-span-2 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95",
                paymentMode === "CREDIT"
                  ? "bg-purple-50 border-purple-500 text-purple-700 shadow-inner"
                  : "bg-white border-slate-100 text-slate-500 hover:border-purple-200",
              )}
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6" />
                <span className="font-black text-xs uppercase tracking-tight">
                  Credit / Debit Card
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Amount Entry */}
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Amount Received
          </p>
          <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-inner">
            <span className="text-slate-400 font-black text-2xl">₹</span>
            <NumericInput
              value={customAmountPaid}
              onChange={(val) => setCustomAmountPaid(val)}
              placeholder={total.toFixed(2)}
              className="w-full bg-transparent text-3xl font-black text-slate-900 outline-none tabular-nums placeholder:text-slate-200 border-none shadow-none p-0 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="pt-4">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
            Order Summary
          </p>
          <div className="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-tight">
              <span>Subtotal</span>
              <span className="tabular-nums">
                ₹
                {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-tight">
              <span>Tax (GST)</span>
              <span className="tabular-nums">
                ₹
                {taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-px bg-slate-200/50 my-2" />
            <div className="flex justify-between items-center">
              <span className="font-black text-slate-900 text-lg uppercase tracking-tight">
                Final Amount
              </span>
              <span className="font-black text-slate-900 text-4xl tabular-nums">
                ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Action */}
      <div className="p-6 border-t border-slate-200 bg-white">
        {["Owner", "Manager", "Storekeeper"].includes(userRole || "") ? (
          <button
            disabled={itemsCount === 0 || isSubmitting}
            onClick={completeInvoice}
            className="w-full bg-blue-600 text-white h-24 rounded-[32px] text-2xl font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale shadow-xl shadow-blue-500/20 flex flex-col items-center justify-center gap-1 group"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-3">
                <span>Syncing...</span>
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span>Finalize Bill</span>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold opacity-60">
                  Ready to Print [F1]
                </span>
              </>
            )}
          </button>
        ) : (
          <div className="p-5 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <span className="text-sm font-black text-rose-900 uppercase leading-tight">
              Terminal Locked:
              <br />
              Manager Required
            </span>
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
