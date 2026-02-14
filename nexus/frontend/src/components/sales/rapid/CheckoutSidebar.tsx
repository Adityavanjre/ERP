import React from 'react';
import { User, Settings, CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface CheckoutSidebarProps {
    customerName: string;
    paymentMode: 'CASH' | 'UPI' | 'CREDIT';
    setPaymentMode: (mode: 'CASH' | 'UPI' | 'CREDIT') => void;
    customAmountPaid: string;
    setCustomAmountPaid: (val: string) => void;
    total: number;
    itemsCount: number;
    isSubmitting: boolean;
    completeInvoice: () => void;
    userRole: string | null;
}

export const CheckoutSidebar: React.FC<CheckoutSidebarProps> = ({
    customerName,
    paymentMode,
    setPaymentMode,
    customAmountPaid,
    setCustomAmountPaid,
    total,
    itemsCount,
    isSubmitting,
    completeInvoice,
    userRole
}) => {
    return (
        <div className="w-[420px] bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl relative z-30">
            {/* Identity Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-md">
                        <User className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 leading-none">{customerName}</p>
                        <p className="text-[10px] text-blue-600 font-extrabold mt-1 uppercase tracking-widest">Premium Member</p>
                    </div>
                </div>
                <button className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-8">
                {/* Payment Modes */}
                <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Select Payment Type</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setPaymentMode('CASH')}
                            className={cn(
                                "h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95",
                                paymentMode === 'CASH'
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-inner"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-emerald-200"
                            )}
                        >
                            <span className="text-3xl">💵</span>
                            <span className="font-black text-xs uppercase tracking-tight">Cash Pay</span>
                        </button>
                        <button
                            onClick={() => setPaymentMode('UPI')}
                            className={cn(
                                "h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95",
                                paymentMode === 'UPI'
                                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-inner"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-blue-200"
                            )}
                        >
                            <span className="text-3xl">📱</span>
                            <span className="font-black text-xs uppercase tracking-tight">Digital UPI</span>
                        </button>
                        <button
                            onClick={() => setPaymentMode('CREDIT')}
                            className={cn(
                                "h-24 col-span-2 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95",
                                paymentMode === 'CREDIT'
                                    ? "bg-purple-50 border-purple-500 text-purple-700 shadow-inner"
                                    : "bg-white border-slate-100 text-slate-500 hover:border-purple-200"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <CreditCard className="w-6 h-6" />
                                <span className="font-black text-xs uppercase tracking-tight">Credit / Debit Card</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Amount Entry */}
                <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Amount Received</p>
                    <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-inner">
                        <span className="text-slate-400 font-black text-2xl">₹</span>
                        <input
                            type="number"
                            value={customAmountPaid}
                            onChange={(e) => setCustomAmountPaid(e.target.value)}
                            placeholder={total.toFixed(2)}
                            className="w-full bg-transparent text-3xl font-black text-slate-900 outline-none tabular-nums placeholder:text-slate-200"
                        />
                    </div>
                </div>

                {/* Invoice Summary */}
                <div className="pt-4">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Order Summary</p>
                    <div className="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-tight">
                            <span>Subtotal</span>
                            <span className="tabular-nums">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-slate-500 uppercase tracking-tight">
                            <span>Tax (GST)</span>
                            <span className="tabular-nums">₹{(total * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="h-px bg-slate-200/50 my-2" />
                        <div className="flex justify-between items-center">
                            <span className="font-black text-slate-900 text-lg uppercase tracking-tight">Final Amount</span>
                            <span className="font-black text-slate-900 text-4xl tabular-nums">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Checkout Action */}
            <div className="p-6 border-t border-slate-200 bg-white">
                {['Owner', 'Manager', 'Storekeeper'].includes(userRole || '') ? (
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
                                <span className="text-[10px] font-bold opacity-60">Ready to Print [F1]</span>
                            </>
                        )}
                    </button>
                ) : (
                    <div className="p-5 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-rose-600" />
                        </div>
                        <span className="text-sm font-black text-rose-900 uppercase leading-tight">Terminal Locked:<br />Manager Required</span>
                    </div>
                )}
            </div>
        </div>
    );
};
