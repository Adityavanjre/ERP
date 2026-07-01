"use client";

import { getCurrencySymbol } from "../../../../lib/currency";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api";
import { Button } from "../../../../components/ui/button";
import { Printer, Mail } from "lucide-react";
import { toast } from "sonner";
import { useUX } from "../../../../components/providers/ux-provider";

interface InvoiceItem {
  productName?: string;
  product?: {
    name: string;
    sku: string;
    gstRate?: number;
    hsnCode?: string;
  };
  gstRate?: number;
  hsnCode?: string;
  quantity: number;
  price: number;
  unitPrice?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
}

interface InvoiceDetail {
  invoiceNumber: string;
  subtotal?: number;
  totalAmount: number;
  taxAmount?: number;
  totalGST?: number;
  totalCGST?: number;
  totalSGST?: number;
  totalIGST?: number;
  issueDate: string;
  dueDate: string;
  billingAddress?: string;
  shippingAddress?: string;
  supplierAddress?: string;
  billingMode?: string;
  itemSections?: any;
  bankAccountId?: string;
  bankAccount?: {
    id: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
    accountHolderName: string;
  };
  termsOfPayment?: string;
  termsOfDelivery?: string;
  vehicleNumber?: string;
  buyersOrderNo?: string;
  eWayBillNo?: string;
  customer: {
    firstName: string;
    lastName: string;
    company: string;
    address?: string;
    gstin?: string;
  };
  items: InvoiceItem[];
}

interface TaxSummaryData {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

function numberToWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const g = ["", "Thousand", "Lakh", "Crore"];

  const convertThreeDigits = (n: number) => {
    let word = "";
    if (n >= 100) {
      word += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      word += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      word += a[n] + " ";
    }
    return word.trim();
  };

  if (num === 0) return "Zero";

  const parts = num.toFixed(2).split(".");
  let intPart = parseInt(parts[0], 10);
  const decPart = parseInt(parts[1], 10);

  let result = "";
  const chunks: number[] = [];
  
  chunks.push(intPart % 1000);
  intPart = Math.floor(intPart / 1000);

  while (intPart > 0) {
    chunks.push(intPart % 100);
    intPart = Math.floor(intPart / 100);
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunkVal = chunks[i];
    if (chunkVal > 0) {
      const chunkWord = convertThreeDigits(chunkVal);
      const unit = g[i] ? " " + g[i] : "";
      result = chunkWord + unit + (result ? " " + result : "");
    }
  }

  result = "INR " + result.trim();

  if (decPart > 0) {
    result += " and Paise " + convertThreeDigits(decPart);
  }

  return result.trim() + " Only";
}

export default function InvoicePrintPage() {
  const currencySymbol = getCurrencySymbol();
  const params = useParams();
  const { pbac } = useUX();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<"classic" | "gst" | "minimal">("classic");

  // Get tenant profile details from sync metadata context
  const tenantProfile = pbac?.tenant || {
    name: "Klypso Ecosystems",
    logoUrl: "",
    address: "123 Business Park, Tech City, Maharashtra, India - 400001",
    gstin: "27AABCU9603R1ZN",
    state: "Maharashtra",
    panNumber: "",
    phone: "",
    email: "",
    authorizedSignatory: "",
  };

  const bankAccount = invoice?.bankAccount || null;

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await api.get(`accounting/invoices/${params.id}`);
        setInvoice(res.data);
      } catch {
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [params.id]);

  if (loading)
    return (
      <div className="p-8 text-slate-900 bg-slate-50 min-h-screen flex items-center justify-center font-black uppercase tracking-widest italic">
        Loading invoice...
      </div>
    );
  if (!invoice)
    return (
      <div className="p-8 text-slate-900 bg-slate-50 min-h-screen flex items-center justify-center font-black uppercase tracking-widest">
        Invoice not found
      </div>
    );

  const totalTax = Number(invoice.totalGST || invoice.taxAmount || 0);
  const totalCGST = Number(invoice.totalCGST || 0);
  const totalSGST = Number(invoice.totalSGST || 0);
  const totalIGST = Number(invoice.totalIGST || 0);
  const totalAmount = Number(invoice.totalAmount);
  const subtotal = totalAmount - totalTax;

  const fmtDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // GST HSN roll-up
  const taxSummary = (invoice.items || []).reduce<Record<number, TaxSummaryData>>((acc, item) => {
    const rate = Number(item.gstRate || item.product?.gstRate || 0);
    if (rate === 0) return acc;
    if (!acc[rate])
      acc[rate] = {
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
      };
    acc[rate].taxableAmount += Number(
      item.taxableAmount ||
        Number(item.price || item.unitPrice) * Number(item.quantity),
    );
    acc[rate].cgstAmount += Number(item.cgstAmount || 0);
    acc[rate].sgstAmount += Number(item.sgstAmount || 0);
    acc[rate].igstAmount += Number(item.igstAmount || 0);
    return acc;
  }, {});

  // Template 1: Classic
  const renderClassic = () => (
    <div className="bg-white p-4 sm:p-6 rounded-2xl print:p-0 print:rounded-none">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-0 border-b-2 border-zinc-100 pb-6 mb-6">
        <div className="w-full">
          <div className="flex items-center gap-4">
            {tenantProfile.logoUrl && (
              <img src={tenantProfile.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
            )}
            <div>
              <div className="text-4xl font-extrabold text-zinc-900 tracking-tight">
                {tenantProfile.name.toUpperCase()} INVOICE
              </div>
              <div className="text-sm text-zinc-500 mt-1 font-medium italic tracking-widest uppercase">
                Invoice No: #{invoice.invoiceNumber}
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-1 text-sm text-zinc-600">
            <p className="font-bold text-zinc-900 uppercase text-[10px] tracking-widest mb-1">
              Bill To:
            </p>
            <p className="font-black text-zinc-900">
              {invoice.customer.firstName} {invoice.customer.lastName}
            </p>
            <p>{invoice.customer.company}</p>
            {invoice.billingAddress ? (
              <p className="whitespace-pre-line">{invoice.billingAddress}</p>
            ) : (
              invoice.customer.address && <p>{invoice.customer.address}</p>
            )}
            {invoice.customer.gstin && <p>GSTIN: {invoice.customer.gstin}</p>}
          </div>
        </div>
        <div className="text-left md:text-right w-full md:w-auto">
          <div className="text-xl font-black text-zinc-900 uppercase tracking-tighter italic">
            {tenantProfile.name}
          </div>
          <div className="text-sm text-zinc-500 mt-1 whitespace-pre-line">
            {tenantProfile.address}
            {tenantProfile.gstin && <><br />GSTIN: {tenantProfile.gstin}</>}
          </div>
          <div className="mt-6 flex flex-col items-end gap-1">
            <div className="bg-zinc-100 px-4 py-2 rounded-lg text-right">
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Issue Date
              </div>
              <div className="font-bold text-zinc-900">
                {fmtDate(invoice.issueDate)}
              </div>
            </div>
            <div className="bg-zinc-100 px-4 py-2 rounded-lg text-right mt-1">
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Due Date
              </div>
              <div className="font-bold text-zinc-900">
                {fmtDate(invoice.dueDate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto mb-6 max-w-[100vw]">
        {(() => {
          // Group items by category for section headers
          const items = invoice.items || [];
          const itemSectionsMap: Record<string, any> = invoice.itemSections || {};
          const hasAreaItems = items.some((item: any) => {
            const meta = itemSectionsMap[item.productId] || item.itemSections || {};
            return meta.pricingMode === "area";
          });
          
          return (
            <table className="w-full text-sm min-w-[500px]">
              <thead className="border-b-2 border-zinc-999">
                <tr className="border-b-2 border-zinc-900">
                  <th className="text-left py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
                    Description
                  </th>
                  <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-24">
                    HSN
                  </th>
                  {hasAreaItems ? (
                    <>
                      <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-16">W(m)</th>
                      <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-16">L(m)</th>
                      <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-16">Sheets</th>
                      <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-20">SQM</th>
                    </>
                  ) : (
                    <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-20">
                      Qty
                    </th>
                  )}
                  <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-32">
                    Rate
                  </th>
                  <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[11px] w-32">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item: any, i: number) => {
                  const meta = itemSectionsMap[item.productId] || item.itemSections || {};
                  const isArea = meta.pricingMode === "area";
                  const width = meta.width || 0;
                  const length = meta.length || 0;
                  const sheets = meta.sheets || 0;
                  const sqm = width * length * sheets;
                  const ratePerSqm = meta.ratePerSqm || 0;
                  const itemAmount = isArea ? sqm * ratePerSqm : Number(item.price) * Number(item.quantity);

                  return (
                    <tr key={i}>
                      <td className="py-4 text-zinc-700 font-medium">
                        {item.productName || item.product?.name || "Product Item"}
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {item.product?.sku}
                        </div>
                      </td>
                      <td className="py-4 text-right text-zinc-500 font-mono">
                        {item.hsnCode || item.product?.hsnCode || "-"}
                      </td>
                      {hasAreaItems ? (
                        <>
                          <td className="py-4 text-right text-zinc-700">{isArea ? width : "-"}</td>
                          <td className="py-4 text-right text-zinc-700">{isArea ? length : "-"}</td>
                          <td className="py-4 text-right text-zinc-700">{isArea ? sheets : item.quantity}</td>
                          <td className="py-4 text-right text-zinc-700">{isArea ? sqm.toFixed(2) : "-"}</td>
                        </>
                      ) : (
                        <td className="py-4 text-right text-zinc-700">
                          {item.quantity}
                        </td>
                      )}
                      <td className="py-4 text-right text-zinc-700">
                        {currencySymbol}
                        {isArea
                          ? ratePerSqm.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                          : Number(item.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })
                        }
                      </td>
                      <td className="py-4 text-right font-bold text-zinc-900">
                        {currencySymbol}
                        {itemAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </div>

      {/* GST Summary */}
      {Object.keys(taxSummary).length > 0 && totalTax > 0 && (
        <div className="mt-8 border border-zinc-200 rounded-xl overflow-hidden print:border-zinc-300">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 print:bg-zinc-100">
              <tr>
                <th className="text-left py-2 px-4 font-bold text-zinc-900 uppercase tracking-widest text-[10px]">
                  GST Rate Roll-up
                </th>
                <th className="text-right py-2 px-4 font-bold text-zinc-900 uppercase tracking-widest text-[10px]">
                  Taxable Base
                </th>
                {totalCGST > 0 && (
                  <th className="text-right py-2 px-4 font-bold text-zinc-900 uppercase tracking-widest text-[10px]">
                    CGST
                  </th>
                )}
                {totalSGST > 0 && (
                  <th className="text-right py-2 px-4 font-bold text-zinc-900 uppercase tracking-widest text-[10px]">
                    SGST
                  </th>
                )}
                {totalIGST > 0 && (
                  <th className="text-right py-2 px-4 font-bold text-zinc-900 uppercase tracking-widest text-[10px]">
                    IGST
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 print:divide-zinc-200">
              {Object.entries(taxSummary)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([rate, data]) => (
                  <tr key={rate}>
                    <td className="py-2 px-4 text-zinc-700 font-bold">
                      {rate}% Tax Subtotal
                    </td>
                    <td className="py-2 px-4 text-right text-zinc-700">
                      {currencySymbol}
                      {data.taxableAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    {totalCGST > 0 && (
                      <td className="py-2 px-4 text-right text-zinc-700">
                        {currencySymbol}
                        {data.cgstAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    )}
                    {totalSGST > 0 && (
                      <td className="py-2 px-4 text-right text-zinc-700">
                        {currencySymbol}
                        {data.sgstAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    )}
                    {totalIGST > 0 && (
                      <td className="py-2 px-4 text-right text-zinc-700">
                        {currencySymbol}
                        {data.igstAmount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="flex justify-end pt-8">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-sm text-zinc-600">
            <span>Subtotal</span>
            <span className="font-medium">
              {currencySymbol}
              {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          {totalCGST > 0 && (
            <div className="flex justify-between text-sm text-zinc-600">
              <span>CGST</span>
              <span className="font-medium">
                {currencySymbol}
                {totalCGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {totalSGST > 0 && (
            <div className="flex justify-between text-sm text-zinc-600">
              <span>SGST</span>
              <span className="font-medium">
                {currencySymbol}
                {totalSGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {totalIGST > 0 && (
            <div className="flex justify-between text-sm text-zinc-600">
              <span>IGST</span>
              <span className="font-medium">
                {currencySymbol}
                {totalIGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-zinc-900 border-t-2 border-zinc-900 pt-4 mt-4">
            <span>Total</span>
            <span>
              {currencySymbol}
              {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-zinc-100 flex flex-col lg:flex-row justify-between items-start md:items-end gap-16 lg:gap-0">
        <div className="text-[10px] text-zinc-400 max-w-sm w-full space-y-4">
          <div>
            <p className="font-bold text-zinc-900 mb-1">Payment Terms:</p>
            <p>1. Payment due within {Math.ceil((new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) / (1000 * 3600 * 24))} days.</p>
            <p>2. Please quote the invoice number in all correspondence.</p>
            <p>3. Make payment to "{tenantProfile.name}".</p>
          </div>
          {bankAccount && (
            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <p className="font-bold text-zinc-900 mb-1 uppercase text-[10px] tracking-wider">Bank Details</p>
              <p><span className="font-bold">Bank:</span> {bankAccount.bankName}</p>
              <p><span className="font-bold">A/c No:</span> {bankAccount.accountNumber}</p>
              <p><span className="font-bold">IFSC:</span> {bankAccount.ifscCode}</p>
              <p><span className="font-bold">Branch:</span> {bankAccount.branch}</p>
            </div>
          )}
          {invoice.termsOfPayment && (
            <p><span className="font-bold text-zinc-900">Terms of Payment:</span> {invoice.termsOfPayment}</p>
          )}
          {invoice.termsOfDelivery && (
            <p><span className="font-bold text-zinc-900">Terms of Delivery:</span> {invoice.termsOfDelivery}</p>
          )}
          {invoice.vehicleNumber && (
            <p><span className="font-bold text-zinc-900">Vehicle No:</span> {invoice.vehicleNumber}</p>
          )}
          {invoice.buyersOrderNo && (
            <p><span className="font-bold text-zinc-900">Buyer's Order No:</span> {invoice.buyersOrderNo}</p>
          )}
          {invoice.eWayBillNo && (
            <p><span className="font-bold text-zinc-900">E-Way Bill No:</span> {invoice.eWayBillNo}</p>
          )}
        </div>
        <div className="text-left md:text-right w-full md:w-auto">
          <div className="h-16 mb-2 flex justify-start md:justify-end">
            <div className="font-script text-2xl text-zinc-400 italic font-medium pr-4 pt-4">
              Authorized Signature
            </div>
          </div>
          <div className="border-t border-zinc-300 w-48 ml-auto"></div>
          <div className="text-[10px] text-zinc-500 mt-1 font-bold uppercase tracking-wider">
            {tenantProfile.authorizedSignatory || "Authorized Signatory"}
          </div>
          {tenantProfile.panNumber && (
            <div className="text-[10px] text-zinc-400 mt-1 font-mono">
              PAN: {tenantProfile.panNumber}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Template 2: Tax Invoice (GST / e-Invoice format matching image)
  const renderGST = () => {
    // Generate a mock IRN and Ack details based on invoice number
    const mockAckNo = "1526" + String(Math.abs(Number(invoice.invoiceNumber.replace(/[^0-9]/g, "") || "0"))).slice(0, 11).padEnd(11, "0");
    const mockIRN = "33439ee14787753094b1179a63f379cd898aa" + invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().padEnd(28, "a");

    return (
      <div className="bg-white text-[11px] font-sans text-slate-900 border-2 border-slate-900 p-0 rounded-none print:border-slate-900">
        {/* Top Header Block: Title & e-Invoice Details */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900">
          <div className="col-span-8 p-3 flex flex-col justify-between border-r-2 border-slate-900">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">Tax Invoice</h2>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic">(ORIGINAL FOR RECIPIENT)</span>
            </div>
            <div className="mt-3 space-y-1 font-mono text-[9px] leading-tight">
              <div><span className="font-bold">IRN:</span> <span className="break-all">{mockIRN}</span></div>
              <div><span className="font-bold">Ack No.:</span> {mockAckNo}</div>
              <div><span className="font-bold">Ack Date:</span> {fmtDate(invoice.issueDate)}</div>
            </div>
          </div>
          <div className="col-span-4 p-3 flex flex-col items-center justify-center bg-slate-50/50">
            <span className="text-[9px] font-black uppercase tracking-wider mb-1.5 text-slate-700">e-Invoice</span>
            {/* Clean SVG Mock QR Code */}
            <svg viewBox="0 0 100 100" className="w-16 h-16 bg-white p-1 border border-slate-300">
              <rect x="0" y="0" width="20" height="20" fill="black" />
              <rect x="5" y="5" width="10" height="10" fill="white" />
              <rect x="80" y="0" width="20" height="20" fill="black" />
              <rect x="85" y="5" width="10" height="10" fill="white" />
              <rect x="0" y="80" width="20" height="20" fill="black" />
              <rect x="5" y="85" width="10" height="10" fill="white" />
              <rect x="30" y="30" width="40" height="40" fill="black" />
              <rect x="35" y="35" width="30" height="30" fill="white" />
              <rect x="45" y="45" width="10" height="10" fill="black" />
              {/* Random tiny blocks */}
              <rect x="10" y="30" width="5" height="10" fill="black" />
              <rect x="70" y="10" width="10" height="5" fill="black" />
              <rect x="15" y="60" width="5" height="5" fill="black" />
              <rect x="80" y="70" width="15" height="15" fill="black" />
            </svg>
          </div>
        </div>

        {/* Second Block: Supplier Profile & Invoice Metadata */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900">
          <div className="col-span-6 p-3 border-r-2 border-slate-900 space-y-1">
            <div className="flex items-center gap-3">
              {tenantProfile.logoUrl && (
                <img src={tenantProfile.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
              )}
              <h3 className="text-xs font-black uppercase text-slate-900">{tenantProfile.name}</h3>
            </div>
            <p className="text-slate-600 leading-tight whitespace-pre-line">{tenantProfile.address}</p>
            <div className="pt-1.5 space-y-0.5 text-[9px] font-bold">
              <div>GSTIN/UIN: <span className="font-mono text-slate-800">{tenantProfile.gstin}</span></div>
              <div>State Name: <span className="text-slate-800">{tenantProfile.state}</span></div>
            </div>
          </div>
          <div className="col-span-6 grid grid-cols-2 text-[9px] leading-tight">
            <div className="p-2 border-r border-b border-slate-300">
              <span className="block font-bold text-slate-400 uppercase text-[8px]">Invoice No.</span>
              <span className="font-black text-slate-900">{invoice.invoiceNumber}</span>
            </div>
            <div className="p-2 border-b border-slate-300">
              <span className="block font-bold text-slate-400 uppercase text-[8px]">Dated</span>
              <span className="font-black text-slate-900">{fmtDate(invoice.issueDate)}</span>
            </div>
            <div className="p-2 border-r border-b border-slate-300">
              <span className="block font-bold text-slate-400 uppercase text-[8px]">e-Way Bill No.</span>
              <span className="font-mono text-slate-900">592013167431</span>
            </div>
            <div className="p-2 border-b border-slate-300">
              <span className="block font-bold text-slate-400 uppercase text-[8px]">Terms of Payment</span>
              <span className="font-bold text-slate-900">Against Loading</span>
            </div>
            <div className="p-2 border-r border-slate-300">
              <span className="block font-bold text-slate-400 uppercase text-[8px]">Buyer's Order No.</span>
              <span className="font-mono text-slate-900">86/SO/26-27</span>
            </div>
            <div className="p-2">
              <span className="block font-bold text-slate-400 uppercase text-[8px]">Terms of Delivery</span>
              <span className="font-bold text-slate-900">Ex Site</span>
            </div>
          </div>
        </div>

        {/* Third Block: Consignee & Buyer Addresses */}
        <div className="grid grid-cols-12 border-b-2 border-slate-900 leading-tight">
          {/* Consignee */}
          <div className="col-span-6 p-3 border-r-2 border-slate-900 space-y-1">
            <span className="block font-black text-slate-400 uppercase text-[8px] tracking-wider">Consignee (Ship to)</span>
            <h4 className="font-black text-slate-900 uppercase">
              {invoice.customer.company || `${invoice.customer.firstName} ${invoice.customer.lastName}`}
            </h4>
            <p className="text-slate-600 whitespace-pre-line">
              {invoice.shippingAddress || invoice.customer.address || "-"}
            </p>
            {invoice.customer.gstin && (
              <div className="text-[9px] font-bold mt-1">
                GSTIN/UIN: <span className="font-mono text-slate-950">{invoice.customer.gstin}</span>
              </div>
            )}
          </div>
          {/* Buyer */}
          <div className="col-span-6 p-3 space-y-1">
            <span className="block font-black text-slate-400 uppercase text-[8px] tracking-wider">Buyer (Bill to)</span>
            <h4 className="font-black text-slate-900 uppercase">
              {invoice.customer.firstName} {invoice.customer.lastName}
            </h4>
            {invoice.customer.company && <p className="font-bold">{invoice.customer.company}</p>}
            <p className="text-slate-600 whitespace-pre-line">
              {invoice.billingAddress || invoice.customer.address || "-"}
            </p>
            {invoice.customer.gstin && (
              <div className="text-[9px] font-bold mt-1">
                GSTIN/UIN: <span className="font-mono text-slate-950">{invoice.customer.gstin}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="border-b-2 border-slate-900">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-50 font-bold uppercase text-[9px]">
                <th className="px-3 py-2 text-center w-10 border-r border-slate-900">SI No.</th>
                <th className="px-3 py-2 border-r border-slate-900">Description of Goods</th>
                <th className="px-3 py-2 text-center w-24 border-r border-slate-900">HSN/SAC</th>
                <th className="px-3 py-2 text-right w-20 border-r border-slate-900">Quantity</th>
                <th className="px-3 py-2 text-right w-24 border-r border-slate-900">Rate</th>
                <th className="px-3 py-2 text-center w-12 border-r border-slate-900">per</th>
                <th className="px-3 py-2 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items &&
                invoice.items.map((item, idx) => {
                  const hasTax = Number(item.gstRate || item.product?.gstRate || 0) > 0;
                  const rate = Number(item.gstRate || item.product?.gstRate || 0);

                  return (
                    <React.Fragment key={idx}>
                      {/* Main Item Row */}
                      <tr className="align-top border-b border-slate-100">
                        <td className="px-3 py-2 text-center border-r border-slate-900 font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-900 font-bold text-slate-950">
                          {item.productName || item.product?.name || "Product Item"}
                          {item.product?.sku && (
                            <span className="block text-[8px] text-slate-400 font-mono mt-0.5">SKU: {item.product.sku}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-900 font-mono text-slate-600">
                          {item.hsnCode || item.product?.hsnCode || "-"}
                        </td>
                        <td className="px-3 py-2 text-right border-r border-slate-900 font-bold tabular-nums">
                          {item.quantity.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-right border-r border-slate-900 font-mono tabular-nums">
                          {Number(item.price).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-900 font-bold text-slate-400">
                          Pcs
                        </td>
                        <td className="px-3 py-2 text-right font-black text-slate-900 tabular-nums">
                          {Number(item.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* Optional Tax Output Rows Inline */}
                      {hasTax && (
                        <tr className="text-[9px] text-slate-500 align-top border-b border-slate-100 italic bg-slate-50/20">
                          <td className="px-3 py-1 border-r border-slate-900"></td>
                          <td className="px-3 py-1 border-r border-slate-900 pl-6">
                            {totalIGST > 0 ? (
                              <span>IGST OUTPUT {rate}%</span>
                            ) : (
                              <span>CGST OUTPUT {rate/2}% + SGST OUTPUT {rate/2}%</span>
                            )}
                          </td>
                          <td className="px-3 py-1 text-center border-r border-slate-900"></td>
                          <td className="px-3 py-1 text-right border-r border-slate-900"></td>
                          <td className="px-3 py-1 text-right border-r border-slate-900 font-mono">{rate}%</td>
                          <td className="px-3 py-1 text-center border-r border-slate-900"></td>
                          <td className="px-3 py-1 text-right font-bold tabular-nums">
                            {Number(item.cgstAmount ? (item.cgstAmount + (item.sgstAmount || 0)) : (item.igstAmount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

              {/* Total Calculation Row */}
              <tr className="border-t border-slate-900 bg-slate-50 font-black">
                <td className="px-3 py-2 border-r border-slate-900"></td>
                <td className="px-3 py-2 border-r border-slate-900 text-right uppercase text-[9px] tracking-wider">Total</td>
                <td className="px-3 py-2 border-r border-slate-900"></td>
                <td className="px-3 py-2 text-right border-r border-slate-900 tabular-nums">
                  {(invoice.items || []).reduce((sum, item) => sum + item.quantity, 0).toLocaleString("en-IN")} Pcs
                </td>
                <td className="px-3 py-2 border-r border-slate-900"></td>
                <td className="px-3 py-2 border-r border-slate-900"></td>
                <td className="px-3 py-2 text-right font-black text-slate-950 text-xs tabular-nums">
                  ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in words */}
        <div className="p-3 border-b border-slate-300 bg-slate-50/30">
          <span className="font-bold text-slate-400 uppercase text-[8px] block">Amount Chargeable (in words)</span>
          <span className="font-black text-slate-900 text-xs tracking-tight">{numberToWords(totalAmount)}</span>
        </div>

        {/* GST Tax Breakdown Summary Table */}
        {Object.keys(taxSummary).length > 0 && totalTax > 0 && (
          <div className="p-3 border-b border-slate-900">
            <table className="w-full border border-slate-300 text-center text-[9px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
                  <th className="p-1.5 border-r border-slate-300" rowSpan={2}>HSN/SAC</th>
                  <th className="p-1.5 border-r border-slate-300" rowSpan={2}>Taxable Value</th>
                  {totalCGST > 0 && <th className="p-1 border-r border-slate-300" colSpan={2}>Central Tax</th>}
                  {totalSGST > 0 && <th className="p-1 border-r border-slate-300" colSpan={2}>State Tax</th>}
                  {totalIGST > 0 && <th className="p-1 border-r border-slate-300" colSpan={2}>Integrated Tax</th>}
                  <th className="p-1.5" rowSpan={2}>Total Tax Amount</th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-300 font-bold">
                  {totalCGST > 0 && (
                    <>
                      <th className="p-1 border-r border-slate-300">Rate</th>
                      <th className="p-1 border-r border-slate-300">Amount</th>
                    </>
                  )}
                  {totalSGST > 0 && (
                    <>
                      <th className="p-1 border-r border-slate-300">Rate</th>
                      <th className="p-1 border-r border-slate-300">Amount</th>
                    </>
                  )}
                  {totalIGST > 0 && (
                    <>
                      <th className="p-1 border-r border-slate-300">Rate</th>
                      <th className="p-1 border-r border-slate-300">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {Object.entries(taxSummary).map(([rate, data]) => {
                  const rNum = Number(rate);
                  const totalLineTax = Number(data.cgstAmount ? (data.cgstAmount + data.sgstAmount) : data.igstAmount);

                  return (
                    <tr key={rate} className="border-b border-slate-200 font-mono">
                      <td className="p-1 border-r border-slate-300 font-sans font-bold">39041090</td>
                      <td className="p-1 border-r border-slate-300 text-right tabular-nums">{data.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      {totalCGST > 0 && (
                        <>
                          <td className="p-1 border-r border-slate-300">{(rNum / 2)}%</td>
                          <td className="p-1 border-r border-slate-300 text-right tabular-nums">{data.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </>
                      )}
                      {totalSGST > 0 && (
                        <>
                          <td className="p-1 border-r border-slate-300">{(rNum / 2)}%</td>
                          <td className="p-1 border-r border-slate-300 text-right tabular-nums">{data.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </>
                      )}
                      {totalIGST > 0 && (
                        <>
                          <td className="p-1 border-r border-slate-300">{rNum}%</td>
                          <td className="p-1 border-r border-slate-300 text-right tabular-nums">{data.igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </>
                      )}
                      <td className="p-1 text-right font-black tabular-nums">{totalLineTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="bg-slate-100 font-black">
                  <td className="p-1.5 border-r border-slate-300">Total</td>
                  <td className="p-1.5 border-r border-slate-300 text-right tabular-nums">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  {totalCGST > 0 && (
                    <>
                      <td className="p-1 border-r border-slate-300"></td>
                      <td className="p-1 border-r border-slate-300 text-right tabular-nums">₹{totalCGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </>
                  )}
                  {totalSGST > 0 && (
                    <>
                      <td className="p-1 border-r border-slate-300"></td>
                      <td className="p-1 border-r border-slate-300 text-right tabular-nums">₹{totalSGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </>
                  )}
                  {totalIGST > 0 && (
                    <>
                      <td className="p-1 border-r border-slate-300"></td>
                      <td className="p-1 border-r border-slate-300 text-right tabular-nums">₹{totalIGST.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </>
                  )}
                  <td className="p-1.5 text-right tabular-nums">₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-2 text-left">
              <span className="font-bold text-slate-400 uppercase text-[8px] block">Tax Amount (in words)</span>
              <span className="font-black text-slate-800 text-[10px]">{numberToWords(totalTax)}</span>
            </div>
          </div>
        )}

        {/* Company PAN & Declaration & Bank Details */}
        <div className="grid grid-cols-12 border-b border-slate-900 bg-slate-50/20">
          <div className="col-span-6 p-3 border-r-2 border-slate-900 space-y-1.5">
            <div>
              <span className="font-bold text-slate-400 uppercase text-[8px] block">Company's PAN</span>
              <span className="font-mono font-bold text-slate-900">ABEFR7073F</span>
            </div>
            <div className="text-[8px] text-slate-500 leading-tight">
              <span className="font-bold text-slate-800 uppercase block mb-0.5">Declaration</span>
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
            </div>
          </div>
          <div className="col-span-6 p-3 space-y-1 text-[9px]">
            <span className="font-bold text-slate-400 uppercase text-[8px] block">Company's Bank Details</span>
            <div><span className="font-bold">Bank Name:</span> KOTAK MAHINDRA BANK</div>
            <div><span className="font-bold">Account No:</span> 0546113516</div>
            <div><span className="font-bold">Branch & IFS Code:</span> Yeshwanthpur, Bangalore - KKBK0008062</div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 h-20 text-[9px] font-bold">
          <div className="p-3 border-r-2 border-slate-900 flex flex-col justify-between">
            <span className="text-slate-400 uppercase text-[8px]">Customer's Seal and Signature</span>
          </div>
          <div className="p-3 flex flex-col justify-between text-right">
            <span className="text-slate-400 uppercase text-[8px]">for {tenantProfile.name}</span>
            <div className="mt-auto">
              <div className="border-t border-slate-300 w-36 ml-auto mb-1"></div>
              <span className="uppercase text-[8px] tracking-wider text-slate-500">Authorised Signatory</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Template 3: Minimal Layout
  const renderMinimal = () => (
    <div className="bg-white p-8 rounded-none border border-slate-100 text-slate-800 font-sans">
      <div className="flex justify-between items-start border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{tenantProfile.name}</h2>
          <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">{tenantProfile.address}</p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-widest text-slate-400 block">Invoice</span>
          <span className="text-lg font-bold text-slate-950">#{invoice.invoiceNumber}</span>
          <span className="block text-xs text-slate-500 mt-1">{fmtDate(invoice.issueDate)}</span>
        </div>
      </div>

      <div className="mt-8 space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billed To</span>
        <h3 className="font-bold text-slate-950">{invoice.customer.firstName} {invoice.customer.lastName}</h3>
        <p className="text-xs text-slate-500">{invoice.customer.company}</p>
        <p className="text-xs text-slate-500 whitespace-pre-line">{invoice.billingAddress || invoice.customer.address}</p>
      </div>

      <table className="w-full mt-10 text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px]">
            <th className="py-2 text-left">Item</th>
            <th className="py-2 text-right w-16">Qty</th>
            <th className="py-2 text-right w-24">Rate</th>
            <th className="py-2 text-right w-24">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoice.items &&
            invoice.items.map((item, idx) => (
              <tr key={idx} className="py-2">
                <td className="py-3 font-semibold text-slate-950">
                  {item.productName || item.product?.name || "Product Item"}
                </td>
                <td className="py-3 text-right tabular-nums">{item.quantity}</td>
                <td className="py-3 text-right tabular-nums">
                  {currencySymbol}
                  {Number(item.price).toFixed(2)}
                </td>
                <td className="py-3 text-right font-bold text-slate-950 tabular-nums">
                  {currencySymbol}
                  {(item.price * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end border-t border-slate-250 pt-4">
        <div className="w-48 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span className="font-medium text-slate-950">
              {currencySymbol}
              {subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          {totalTax > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>GST Total</span>
              <span className="font-medium text-slate-950">
                {currencySymbol}
                {totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-slate-950 border-t border-slate-100 pt-2 mt-2">
            <span>Total</span>
            <span>
              {currencySymbol}
              {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDimensional = () => {
    const sections = (invoice.itemSections as any[]) || [];
    const grandTotal = sections.reduce((sum, s) => {
      const sectionTotal = (s.items || []).reduce((s2: number, i: any) => s2 + Number(i.amount || 0), 0);
      return sum + sectionTotal;
    }, 0);

    return (
      <div className="bg-white p-4 sm:p-6 rounded-2xl print:p-0 print:rounded-none text-slate-900">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-0 border-b-2 border-zinc-100 pb-6 mb-6">
          <div className="w-full">
            <div className="flex items-center gap-4">
              {tenantProfile.logoUrl && (
                <img src={tenantProfile.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
              )}
              <div>
                <div className="text-4xl font-extrabold text-zinc-900 tracking-tight">
                  {tenantProfile.name.toUpperCase()} INVOICE
                </div>
                <div className="text-sm text-zinc-500 mt-1 font-medium italic tracking-widest uppercase">
                  Invoice No: #{invoice.invoiceNumber}
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-1 text-sm text-zinc-600">
              <p className="font-bold text-zinc-900 uppercase text-[10px] tracking-widest mb-1">Bill To:</p>
              <p className="font-black text-zinc-900">{invoice.customer.firstName} {invoice.customer.lastName}</p>
              <p>{invoice.customer.company}</p>
              {invoice.billingAddress ? (
                <p className="whitespace-pre-line">{invoice.billingAddress}</p>
              ) : (
                invoice.customer.address && <p>{invoice.customer.address}</p>
              )}
              {invoice.customer.gstin && <p>GSTIN: {invoice.customer.gstin}</p>}
            </div>
          </div>
          <div className="text-left md:text-right w-full md:w-auto">
            <div className="text-xl font-black text-zinc-900 uppercase tracking-tighter italic">
              {tenantProfile.name}
            </div>
            <div className="text-sm text-zinc-500 mt-1 whitespace-pre-line">
              {tenantProfile.address}
              {tenantProfile.gstin && <><br />GSTIN: {tenantProfile.gstin}</>}
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

        {sections.map((section: any, sIdx: number) => {
          const isDim = section.type === "dimensional";
          const sectionItems = section.items || [];
          const sectionTotal = sectionItems.reduce((s2: number, i: any) => s2 + Number(i.amount || 0), 0);
          const sectionQty = sectionItems.reduce((s2: number, i: any) => s2 + Number(i.qty || 0), 0);

          return (
            <div key={sIdx} className="mb-8">
              <div className="border-2 border-zinc-200 rounded-xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200">
                  <span className="text-sm font-black text-zinc-900 uppercase tracking-wider">{section.label || `Section ${String.fromCharCode(65 + sIdx)}`}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 font-bold uppercase text-[9px] text-zinc-700">
                        <th className="px-2 py-2 text-center w-8 border-r border-zinc-200">No</th>
                        <th className="px-2 py-2 border-r border-zinc-200 text-left">Description</th>
                        <th className="px-2 py-2 text-center border-r border-zinc-200 w-20">HSN/SAC</th>
                        {isDim ? (
                          <>
                            <th className="px-2 py-2 text-center border-r border-zinc-200 w-16">{section.dim1Label || "WIDTH"}</th>
                            <th className="px-2 py-2 text-center border-r border-zinc-200 w-16">{section.dim2Label || "LENGTH"}</th>
                            <th className="px-2 py-2 text-center border-r border-zinc-200 w-20">{section.dim3Label || "No of Sheets"}</th>
                            <th className="px-2 py-2 text-center border-r border-zinc-200 w-16">Qty</th>
                          </>
                        ) : (
                          <>
                            <th className="px-2 py-2 text-center border-r border-zinc-200 w-20">Size</th>
                            <th className="px-2 py-2 text-center border-r border-zinc-200 w-16">Qty</th>
                          </>
                        )}
                        <th className="px-2 py-2 text-right border-r border-zinc-200 w-20">Rate</th>
                        <th className="px-2 py-2 text-right w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {sectionItems.map((item: any, idx: number) => (
                        <tr key={idx} className="align-top">
                          <td className="px-2 py-2 text-center border-r border-zinc-100 font-bold text-zinc-500">{idx + 1}</td>
                          <td className="px-2 py-2 border-r border-zinc-100 font-medium text-zinc-800">{item.description || "-"}</td>
                          <td className="px-2 py-2 text-center border-r border-zinc-100 font-mono text-zinc-600">{item.hsnSac || "-"}</td>
                          {isDim ? (
                            <>
                              <td className="px-2 py-2 text-center border-r border-zinc-100 tabular-nums">{item.dim1 ?? "-"}</td>
                              <td className="px-2 py-2 text-center border-r border-zinc-100 tabular-nums">{item.dim2 ?? "-"}</td>
                              <td className="px-2 py-2 text-center border-r border-zinc-100 tabular-nums">{item.dim3 ?? "-"}</td>
                              <td className="px-2 py-2 text-center border-r border-zinc-100 font-bold tabular-nums">{Number(item.qty || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 py-2 text-center border-r border-zinc-100">{item.size || "-"}</td>
                              <td className="px-2 py-2 text-center border-r border-zinc-100 tabular-nums">{Number(item.qty || 0).toLocaleString("en-IN")}</td>
                            </>
                          )}
                          <td className="px-2 py-2 text-right border-r border-zinc-100 font-mono tabular-nums">{Number(item.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-2 text-right font-black text-zinc-900 tabular-nums">{Number(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      {sectionItems.length === 0 && (
                        <tr>
                          <td colSpan={isDim ? 9 : 8} className="px-2 py-3 text-center text-zinc-400 text-[10px]">No items</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-zinc-50 px-4 py-2 border-t border-zinc-200 flex justify-between items-center">
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">{section.label || `Section ${String.fromCharCode(65 + sIdx)}`} Total ({section.letter || String.fromCharCode(65 + sIdx)})</span>
                  <div className="flex gap-4 text-xs font-bold text-zinc-900">
                    {isDim && <span>Qty: {sectionQty.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>}
                    <span>{currencySymbol}{sectionTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="mt-8 flex justify-end border-t-2 border-zinc-900 pt-4">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Grand Total</span>
              <span className="font-black text-zinc-900 text-xl">
                {currencySymbol}
                {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4 md:p-8 print:p-0 print:bg-white text-slate-900 print:text-black">
      <style jsx global>{`
        @media print {
          @page {
            margin: 10mm;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr {
            page-break-inside: avoid;
          }
          .print-header {
            position: running(header);
          }
        }
      `}</style>
      
      {/* Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-white tracking-tighter">
            Invoice #{invoice.invoiceNumber}
          </h1>
          {/* Template Switcher */}
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as any)}
            className="h-9 px-3 rounded-xl border border-white/20 bg-slate-800 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="classic">Classic Template</option>
            <option value="gst">Tax Invoice (GST)</option>
            <option value="minimal">Minimal Template</option>
          </select>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="text-white border-white/20 hover:bg-white/10 rounded-2xl font-bold px-6 h-11 transition-all"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
          <Button
            variant="outline"
            className="text-white border-white/20 hover:bg-white/10 rounded-2xl font-bold px-6 h-11 transition-all"
          >
            <Mail className="mr-2 h-4 w-4" /> Email Client
          </Button>
        </div>
      </div>

      {/* Invoice Paper Wrapper */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl print:shadow-none print:w-full overflow-hidden text-clip rounded-2xl print:rounded-none">
        {invoice.billingMode === "dimensional"
          ? renderDimensional()
          : (
            <>
              {template === "classic" && renderClassic()}
              {template === "gst" && renderGST()}
              {template === "minimal" && renderMinimal()}
            </>
          )}
      </div>
    </div>
  );
}
