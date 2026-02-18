"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Printer, Download, Mail } from "lucide-react";
import { toast } from "sonner";

export default function InvoicePrintPage() {
    const params = useParams();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const res = await api.get(`/accounting/invoices/${params.id}`);
                setInvoice(res.data);
            } catch (err) {
                toast.error("Failed to load invoice");
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [params.id]);

    if (loading) return <div className="p-8 text-slate-900 bg-slate-50 min-h-screen flex items-center justify-center font-black uppercase tracking-widest italic">Syncing invoice details...</div>;
    if (!invoice) return <div className="p-8 text-slate-900 bg-slate-50 min-h-screen flex items-center justify-center font-black uppercase tracking-widest">Invoice not found</div>;

    const subtotal = Number(invoice.subtotal || invoice.totalAmount); // Fallback
    const totalTax = Number(invoice.taxAmount || 0);
    const totalAmount = Number(invoice.totalAmount);

    // Helper for date formatting
    const fmtDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-slate-900 p-8 print:p-0 print:bg-white text-slate-900 print:text-black">
            {/* Action Bar (Hidden in Print) */}
            <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-black text-white tracking-tighter">Zenith Invoice Artifact</h1>
                <div className="flex gap-3">
                    <Button variant="outline" className="text-white border-white/20 hover:bg-white/10 rounded-2xl font-bold px-6 h-11 transition-all" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
                    </Button>
                    <Button variant="outline" className="text-white border-white/20 hover:bg-white/10 rounded-2xl font-bold px-6 h-11 transition-all">
                        <Mail className="mr-2 h-4 w-4" /> Email Client
                    </Button>
                </div>
            </div>

            {/* Invoice Paper */}
            <div className="max-w-4xl mx-auto bg-white p-12 shadow-2xl print:shadow-none print:w-full">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-zinc-100 pb-8 mb-8">
                    <div>
                        <div className="text-4xl font-extrabold text-zinc-900 tracking-tight">ZENITH INVOICE</div>
                        <div className="text-sm text-zinc-500 mt-1 font-medium italic tracking-widest uppercase">Artifact Sequence: #{invoice.invoiceNumber}</div>
                        <div className="mt-4 space-y-1 text-sm text-zinc-600">
                            <p className="font-bold text-zinc-900 uppercase text-[10px] tracking-widest mb-1">Target Relation:</p>
                            <p className="font-black text-zinc-900">{invoice.customer.firstName} {invoice.customer.lastName}</p>
                            <p>{invoice.customer.company}</p>
                            {invoice.customer.address && <p>{invoice.customer.address}</p>}
                            {invoice.customer.gstin && <p>GSTIN: {invoice.customer.gstin}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-black text-zinc-900 uppercase tracking-tighter italic">Zenith Ecosystems</div>
                        <div className="text-sm text-zinc-500 mt-1">
                            123 Business Park, Tech City<br />
                            Maharashtra, India - 400001<br />
                            GSTIN: 27AABCU9603R1ZN
                        </div>
                        <div className="mt-6 flex flex-col items-end gap-1">
                            <div className="bg-zinc-100 px-4 py-2 rounded-lg text-right">
                                <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Issue Date</div>
                                <div className="font-bold text-zinc-900">{fmtDate(invoice.issueDate)}</div>
                            </div>
                            <div className="bg-zinc-100 px-4 py-2 rounded-lg text-right mt-1">
                                <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Due Date</div>
                                <div className="font-bold text-zinc-900">{fmtDate(invoice.dueDate)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm mb-8">
                    <thead className="border-b-2 border-zinc-900">
                        <tr>
                            <th className="text-left py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px]">Description</th>
                            <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-24">HSN</th>
                            <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-20">Qty</th>
                            <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-32">Rate</th>
                            <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {invoice.items && invoice.items.map((item: any, i: number) => (
                            <tr key={i}>
                                <td className="py-4 text-zinc-700 font-medium">
                                    {item.product?.name || "Product Item"}
                                    <div className="text-[10px] text-zinc-400 mt-0.5">{item.product?.sku}</div>
                                </td>
                                <td className="py-4 text-right text-zinc-500 font-mono">{item.product?.hsnCode || "-"}</td>
                                <td className="py-4 text-right text-zinc-700">{item.quantity}</td>
                                <td className="py-4 text-right text-zinc-700">₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-4 text-right font-bold text-zinc-900">₹{(Number(item.price) * Number(item.quantity)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end border-t border-zinc-100 pt-8">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm text-zinc-600">
                            <span>Subtotal</span>
                            <span className="font-medium">₹{(totalAmount - totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm text-zinc-600">
                            <span>CGST (9%)</span>
                            <span className="font-medium">₹{(totalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm text-zinc-600">
                            <span>SGST (9%)</span>
                            <span className="font-medium">₹{(totalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-zinc-900 border-t-2 border-zinc-900 pt-4 mt-4">
                            <span>Total</span>
                            <span>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-zinc-100 flex justify-between items-end">
                    <div className="text-[10px] text-zinc-400 max-w-sm">
                        <p className="font-bold text-zinc-900 mb-1">Nexus Protocols:</p>
                        <p>1. Settlement required within {Math.ceil((new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) / (1000 * 3600 * 24))} nexus cycles.</p>
                        <p>2. Quote artifact sequence in all node communications.</p>
                        <p>3. Transfer credit flux to "Zenith Ecosystems".</p>
                    </div>
                    <div className="text-right">
                        <div className="h-16 mb-2 flex justify-end">
                            {/* Signature Placeholder */}
                            <div className="font-script text-2xl text-zinc-400 italic font-medium pr-4 pt-4">Authorized Signature</div>
                        </div>
                        <div className="border-t border-zinc-300 w-48 ml-auto"></div>
                        <div className="text-[10px] text-zinc-500 mt-1 font-bold uppercase tracking-wider">Authorized Signatory</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
