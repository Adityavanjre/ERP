import re

with open('nexus/frontend/src/app/(dashboard)/invoice/[id]/page.tsx', 'r') as f:
    content = f.read()

# Add logic for templates
template_selector = '''      {/* Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
        <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-4">
          Invoice
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white rounded-xl h-10">
              <SelectValue placeholder="Select Template" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-white rounded-xl">
              <SelectItem value="classic">Classic Layout</SelectItem>
              <SelectItem value="tax">Tax Invoice (GST)</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
            </SelectContent>
          </Select>
        </h1>
        <div className="flex gap-3">'''

content = content.replace('''      {/* Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
        <h1 className="text-2xl font-black text-white tracking-tighter">
          Invoice
        </h1>
        <div className="flex gap-3">''', template_selector)

# Define templates
tax_template = '''{template === "tax" && (
        <div className="max-w-4xl mx-auto bg-white p-6 sm:p-6 md:p-8 shadow-2xl print:shadow-none print:w-full overflow-hidden text-clip print:rounded-none">
          <div className="border border-zinc-300">
            {/* Tax Header */}
            <div className="flex border-b border-zinc-300">
              <div className="flex-1 p-4 border-r border-zinc-300">
                <div className="font-bold text-center text-lg uppercase">Tax Invoice</div>
                <div className="text-[10px] text-center">(ORIGINAL FOR RECIPIENT)</div>
                <div className="mt-4 space-y-1 text-xs">
                  <div className="flex"><span className="w-16 font-bold">IRN</span>: <span className="font-mono text-[9px] text-zinc-500">Not Generated</span></div>
                  <div className="flex"><span className="w-16 font-bold">Ack No.</span>: <span className="font-mono text-[9px] text-zinc-500">N/A</span></div>
                  <div className="flex"><span className="w-16 font-bold">Ack Date</span>: <span className="font-mono text-[9px] text-zinc-500">N/A</span></div>
                </div>
              </div>
              <div className="w-32 flex items-center justify-center p-4">
                {/* QR Code Placeholder */}
                <div className="w-24 h-24 bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] text-zinc-400">QR CODE</div>
              </div>
            </div>

            {/* Address Blocks */}
            <div className="flex border-b border-zinc-300 min-h-[160px]">
              <div className="flex-1 p-4 border-r border-zinc-300 space-y-1 relative">
                {logoUrl && <img src={logoUrl} alt="Logo" className="absolute top-4 right-4 h-12 object-contain" />}
                <div className="font-bold text-sm uppercase">{pbac.tenantProfile?.name || "Klypso Ecosystems"}</div>
                <div className="text-xs text-zinc-600">
                  {pbac.tenantProfile?.name ? "Company Address..." : "123 Business Park, Tech City\\nMaharashtra, India - 400001"}
                </div>
                <div className="text-xs"><span className="font-bold">GSTIN/UIN:</span> 27AABCU9603R1ZN</div>
                <div className="text-xs"><span className="font-bold">State Name:</span> Maharashtra, Code: 27</div>
                <div className="text-xs"><span className="font-bold">E-Mail:</span> admin@company.com</div>

                <div className="mt-4 border-t border-zinc-300 pt-2">
                  <div className="text-[10px] font-bold text-zinc-500">Buyer (Bill to)</div>
                  <div className="font-bold text-sm">{invoice.customer.firstName} {invoice.customer.lastName}</div>
                  <div className="text-xs">{invoice.customer.company}</div>
                  <div className="text-xs text-zinc-600 max-w-[200px]">{invoice.customer.address}</div>
                  <div className="text-xs"><span className="font-bold">GSTIN/UIN:</span> {invoice.customer.gstin || "N/A"}</div>
                </div>
              </div>
              <div className="flex-1 p-0 flex flex-col">
                <div className="flex border-b border-zinc-300">
                   <div className="flex-1 p-2 border-r border-zinc-300">
                     <div className="text-xs"><span className="font-bold">Invoice No.</span><br/>{invoice.invoiceNumber}</div>
                   </div>
                   <div className="flex-1 p-2">
                     <div className="text-xs"><span className="font-bold">Dated</span><br/>{fmtDate(invoice.issueDate)}</div>
                   </div>
                </div>
                <div className="flex border-b border-zinc-300">
                   <div className="flex-1 p-2 border-r border-zinc-300">
                     <div className="text-xs"><span className="font-bold">e-Way Bill No.</span><br/>-</div>
                   </div>
                   <div className="flex-1 p-2">
                     <div className="text-xs"><span className="font-bold">Mode/Terms of Payment</span><br/>-</div>
                   </div>
                </div>
                <div className="p-4 flex-1 space-y-1">
                  <div className="text-[10px] font-bold text-zinc-500">Consignee (Ship to)</div>
                  <div className="font-bold text-sm">{invoice.customer.firstName} {invoice.customer.lastName}</div>
                  <div className="text-xs">{invoice.customer.company}</div>
                  <div className="text-xs text-zinc-600 max-w-[200px]">{invoice.customer.address}</div>
                </div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-xs border-b border-zinc-300">
              <thead className="bg-zinc-50 border-b border-zinc-300">
                <tr className="divide-x divide-zinc-300 text-zinc-600">
                  <th className="p-2 text-center w-10">Sl No.</th>
                  <th className="p-2 text-left">Description of Goods</th>
                  <th className="p-2 text-center w-20">HSN/SAC</th>
                  <th className="p-2 text-right w-20">Quantity</th>
                  <th className="p-2 text-right w-20">Rate</th>
                  <th className="p-2 text-right w-16">per</th>
                  <th className="p-2 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {invoice.items.map((item, idx) => {
                  const qty = Number(item.quantity);
                  const price = Number(item.price || item.unitPrice || 0);
                  return (
                    <tr key={idx} className="divide-x divide-zinc-300">
                      <td className="p-2 text-center">{idx + 1}</td>
                      <td className="p-2 font-bold">{item.product?.name || item.productName || "Custom Item"}</td>
                      <td className="p-2 text-center">{item.hsnCode || item.product?.hsnCode || "-"}</td>
                      <td className="p-2 text-right font-bold">{qty}</td>
                      <td className="p-2 text-right">{price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right">Nos</td>
                      <td className="p-2 text-right font-bold">{(qty * price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )
                })}
                {/* Tax Rows */}
                {Object.entries(taxSummary).map(([rate, sums]) => {
                   if (sums.cgstAmount > 0 && sums.sgstAmount > 0) {
                     return (
                       <React.Fragment key={rate}>
                         <tr className="divide-x divide-zinc-300">
                           <td colSpan={6} className="p-2 text-right font-bold italic">CGST {Number(rate)/2}%</td>
                           <td className="p-2 text-right">{sums.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                         </tr>
                         <tr className="divide-x divide-zinc-300">
                           <td colSpan={6} className="p-2 text-right font-bold italic">SGST {Number(rate)/2}%</td>
                           <td className="p-2 text-right">{sums.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                         </tr>
                       </React.Fragment>
                     )
                   }
                   if (sums.igstAmount > 0) {
                     return (
                       <tr key={rate} className="divide-x divide-zinc-300">
                         <td colSpan={6} className="p-2 text-right font-bold italic">IGST {rate}%</td>
                         <td className="p-2 text-right">{sums.igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                       </tr>
                     )
                   }
                   return null;
                })}
              </tbody>
              <tfoot className="border-t-2 border-zinc-400 font-bold bg-zinc-50 divide-x divide-zinc-300">
                <tr>
                  <td colSpan={6} className="p-2 text-right uppercase">Total Amount Chargeable</td>
                  <td className="p-2 text-right">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>

            {/* Footer Text */}
            <div className="flex min-h-[120px]">
              <div className="flex-1 p-4 border-r border-zinc-300 text-xs">
                <div className="font-bold">Declaration</div>
                <div className="text-zinc-600 italic">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
              </div>
              <div className="flex-1 p-4 text-xs flex flex-col justify-end text-right">
                <div className="font-bold uppercase">For {pbac.tenantProfile?.name || "Klypso Ecosystems"}</div>
                <div className="mt-8 text-zinc-500 italic">Authorised Signatory</div>
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-zinc-400 mt-2">This is a Computer Generated Invoice</div>
        </div>
      )}'''

minimal_template = '''{template === "minimal" && (
        <div className="max-w-4xl mx-auto bg-white p-10 shadow-2xl print:shadow-none print:w-full overflow-hidden text-clip print:rounded-none min-h-[800px] flex flex-col font-sans">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-4">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="h-12 object-contain" /> : <div className="h-12 w-12 bg-zinc-900 rounded flex items-center justify-center text-white font-bold">K</div>}
              <div>
                <div className="text-xl font-bold tracking-tight text-zinc-900">{pbac.tenantProfile?.name || "Klypso Ecosystems"}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-light text-zinc-400 uppercase tracking-widest">Invoice</div>
              <div className="font-medium text-zinc-900">#{invoice.invoiceNumber}</div>
            </div>
          </div>

          <div className="flex justify-between mb-12">
            <div className="space-y-1">
              <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Billed To</div>
              <div className="text-lg font-medium text-zinc-900">{invoice.customer.firstName} {invoice.customer.lastName}</div>
              <div className="text-zinc-600">{invoice.customer.company}</div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Date</div>
              <div className="font-medium text-zinc-900">{fmtDate(invoice.issueDate)}</div>
              <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold mt-4">Due</div>
              <div className="font-medium text-zinc-900">{fmtDate(invoice.dueDate)}</div>
            </div>
          </div>

          <div className="flex-1">
            <table className="w-full">
              <thead className="border-b-2 border-zinc-900">
                <tr>
                  <th className="py-4 text-left text-xs text-zinc-400 font-bold uppercase tracking-widest">Description</th>
                  <th className="py-4 text-right text-xs text-zinc-400 font-bold uppercase tracking-widest w-24">Qty</th>
                  <th className="py-4 text-right text-xs text-zinc-400 font-bold uppercase tracking-widest w-32">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {invoice.items.map((item, idx) => {
                  const qty = Number(item.quantity);
                  const price = Number(item.price || item.unitPrice || 0);
                  return (
                    <tr key={idx}>
                      <td className="py-4 font-medium text-zinc-900">{item.product?.name || item.productName || "Custom Item"}</td>
                      <td className="py-4 text-right text-zinc-600">{qty}</td>
                      <td className="py-4 text-right font-medium text-zinc-900">{(qty * price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t-2 border-zinc-900 pt-6 mt-8 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>{currencySymbol}{(totalAmount - totalTax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Tax</span>
                <span>{currencySymbol}{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-zinc-900 pt-4 border-t border-zinc-100">
                <span>Total</span>
                <span>{currencySymbol}{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}'''

classic_template = '''{template === "classic" && (
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-6 md:p-8 shadow-2xl print:shadow-none print:w-full overflow-hidden text-clip rounded-2xl print:rounded-none">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-0 border-b-2 border-zinc-100 pb-6 mb-6">
          <div className="w-full">
            <div className="flex items-center gap-4 mb-4">
              {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 object-contain" />}
              <div className="text-4xl font-extrabold text-zinc-900 tracking-tight">
                {logoUrl ? "" : "KLYPSO INVOICE"}
              </div>
            </div>
            <div className="text-sm text-zinc-500 mt-1 font-medium italic tracking-widest uppercase">
              Invoice No: #{invoice.invoiceNumber}
            </div>
            <div className="mt-4 space-y-1 text-sm text-zinc-600">
              <p className="font-bold text-zinc-900 uppercase text-[10px] tracking-widest mb-1">
                Bill To:
              </p>
              <p className="font-black text-zinc-900">
                {invoice.customer.firstName} {invoice.customer.lastName}
              </p>
              <p>{invoice.customer.company}</p>
              {invoice.customer.address && <p>{invoice.customer.address}</p>}
              {invoice.customer.gstin && <p>GSTIN: {invoice.customer.gstin}</p>}
            </div>
          </div>
          <div className="text-left md:text-right w-full md:w-auto">
            <div className="text-xl font-black text-zinc-900 uppercase tracking-tighter italic">
              {pbac.tenantProfile?.name || "Klypso Ecosystems"}
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              123 Business Park, Tech City
              <br />
              Maharashtra, India - 400001
              <br />
              GSTIN: 27AABCU9603R1ZN
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
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-3 font-bold text-zinc-900 uppercase tracking-wider text-[10px]">
                  Description
                </th>
                <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[10px] w-24">
                  Qty
                </th>
                <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[10px] w-32">
                  Price
                </th>
                <th className="text-right py-3 font-bold text-zinc-900 uppercase tracking-wider text-[10px] w-32">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(invoice.items || []).map((item, index) => {
                const price = Number(item.price || item.unitPrice || 0);
                const qty = Number(item.quantity || 1);
                const lineTotal = price * qty;
                return (
                  <tr key={index} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-zinc-900">
                        {item.product?.name || item.productName || "Custom Item"}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {item.product?.sku
                          ? `SKU: ${item.product.sku}`
                          : "Custom Service"}
                        {item.hsnCode || item.product?.hsnCode
                          ? ` | HSN: ${item.hsnCode || item.product?.hsnCode}`
                          : ""}
                      </div>
                    </td>
                    <td className="py-4 text-right font-medium text-zinc-700">
                      {qty}
                    </td>
                    <td className="py-4 text-right font-medium text-zinc-700">
                      {currencySymbol}
                      {price.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-4 text-right font-bold text-zinc-900">
                      {currencySymbol}
                      {lineTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start gap-6 pt-4 border-t-2 border-zinc-100">
          <div className="w-full md:w-1/2">
            <div className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-2">
              Payment Terms & Notes
            </div>
            <div className="bg-zinc-50 p-4 rounded-xl text-xs text-zinc-600 font-medium">
              <ul className="list-disc pl-4 space-y-1">
                <li>Payment due within 15 days of invoice date.</li>
                <li>Please include Invoice No. on your check/transfer.</li>
                <li>Thank you for your business!</li>
              </ul>
            </div>
          </div>
          <div className="w-full md:w-[320px]">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                  Subtotal
                </span>
                <span className="font-bold text-zinc-900">
                  {currencySymbol}
                  {Number(
                    invoice.subtotal || invoice.totalAmount - totalTax,
                  ).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                  Tax (GST)
                </span>
                <span className="font-bold text-zinc-900">
                  {currencySymbol}
                  {totalTax.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
                <span className="text-zinc-900 font-black uppercase tracking-wider text-sm">
                  Grand Total
                </span>
                <span className="text-2xl font-black text-zinc-900 tracking-tighter">
                  {currencySymbol}
                  {totalAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GST Summary Block */}
        {Object.keys(taxSummary).length > 0 && (
          <div className="mt-8 border border-zinc-200 rounded-xl overflow-hidden page-break-inside-avoid">
            <div className="bg-zinc-100 px-4 py-2 border-b border-zinc-200 font-bold text-zinc-800 text-xs uppercase tracking-wider">
              GST Tax Summary
            </div>
            <table className="w-full text-xs text-zinc-600">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2 text-left font-bold">Tax Rate</th>
                  <th className="px-4 py-2 text-right font-bold">
                    Taxable Amt
                  </th>
                  <th className="px-4 py-2 text-right font-bold">CGST</th>
                  <th className="px-4 py-2 text-right font-bold">SGST</th>
                  <th className="px-4 py-2 text-right font-bold">IGST</th>
                  <th className="px-4 py-2 text-right font-bold">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {Object.entries(taxSummary).map(([rate, sums]) => {
                  const rowTotalTax =
                    sums.cgstAmount + sums.sgstAmount + sums.igstAmount;
                  return (
                    <tr key={rate}>
                      <td className="px-4 py-2 font-medium">{rate}%</td>
                      <td className="px-4 py-2 text-right">
                        {sums.taxableAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {sums.cgstAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {sums.sgstAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {sums.igstAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-zinc-800">
                        {rowTotalTax.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}'''

# We need to replace everything starting from `{/* Invoice Paper */}` to the end, but before the closing `</div>` of the page.
content_to_replace_start = content.find('{/* Invoice Paper */}')
content_to_replace_end = content.rfind('</div>') # second to last closing div

new_content = content[:content_to_replace_start] + tax_template + '\n' + minimal_template + '\n' + classic_template + '\n' + content[content_to_replace_end:]
new_content = new_content.replace('import React, { useEffect', 'import React, { useEffect')

if 'import React' not in new_content:
    new_content = new_content.replace('"use client";\n', '"use client";\nimport React from "react";\n')


with open('nexus/frontend/src/app/(dashboard)/invoice/[id]/page.tsx', 'w') as f:
    f.write(new_content)
