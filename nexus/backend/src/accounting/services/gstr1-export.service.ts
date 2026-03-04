import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService } from './ledger.service';

// GST-002: GSTN offline utility schema format (GSTR-1)
// Reference: GSTN Offline Tool JSON Schema v2.1

interface Gstr1B2bInvoice {
    inum: string;      // Invoice Number
    idt: string;       // Invoice Date (DD-MMM-YYYY)
    val: number;       // Total Invoice Value (2 decimal)
    pos: string;       // Place of Supply (2-digit state code)
    rchrg: 'Y' | 'N'; // Reverse Charge
    inv_typ: 'R' | 'SEWP' | 'SEWOP' | 'DE' | 'CBW'; // Invoice type
    itms: Gstr1Item[];
}

interface Gstr1B2cLarge {
    oty: string;       // OTY
    pos: string;       // Place of Supply
    typ: 'OE';         // OE always for B2C Large
    val: number;
    itms: Gstr1Item[];
}

interface Gstr1Item {
    num: number;       // Item serial number (1-indexed)
    itm_det: {
        txval: number;   // Taxable value
        rt: number;      // Tax rate
        camt?: number;   // CGST amount (intra-state)
        samt?: number;   // SGST amount (intra-state)
        iamt?: number;   // IGST amount (inter-state)
        csamt?: number;  // CESS amount (default 0)
    };
}

interface Gstr1HsnSummary {
    num: number;
    hsn_sc: string;    // HSN/SAC Code
    desc: string;      // Description
    uqc: string;       // Unit of Measure (NOS etc.)
    cnt: number;       // Total qty
    val: number;       // Total value
    txval: number;     // Taxable value
    iamt: number;
    camt: number;
    samt: number;
    csamt: number;
}

interface Gstr1NilExempted {
    sply_ty: 'INTRB2B' | 'INTRB2C' | 'EXPWP' | 'EXPWOP';
    nil_amt: number;
    expt_amt: number;
    ngsup_amt: number;
}

@Injectable()
export class Gstr1ExportService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ledger: LedgerService,
    ) { }

    // GSTN state code mapping (2-digit codes per GSTN schema)
    private readonly STATE_CODES: Record<string, string> = {
        'andhra pradesh': '37', 'arunachal pradesh': '12', 'assam': '18',
        'bihar': '10', 'chhattisgarh': '22', 'goa': '30', 'gujarat': '24',
        'haryana': '06', 'himachal pradesh': '02', 'jharkhand': '20',
        'karnataka': '29', 'kerala': '32', 'madhya pradesh': '23',
        'maharashtra': '27', 'manipur': '14', 'meghalaya': '17',
        'mizoram': '15', 'nagaland': '13', 'odisha': '21', 'punjab': '03',
        'rajasthan': '08', 'sikkim': '11', 'tamil nadu': '33',
        'telangana': '36', 'tripura': '16', 'uttar pradesh': '09',
        'uttarakhand': '05', 'west bengal': '19', 'delhi': '07',
        'jammu and kashmir': '01', 'ladakh': '38', 'puducherry': '34',
        'chandigarh': '04', 'dadra and nagar haveli': '26', 'daman and diu': '25',
        'lakshadweep': '31', 'andaman and nicobar islands': '35',
    };

    private getStateCode(state?: string | null): string {
        if (!state) return '27'; // Default Maharashtra
        return this.STATE_CODES[state.toLowerCase().trim()] || '27';
    }

    private formatDate(date: Date): string {
        // GSTN expects DD-MMM-YYYY format e.g. "01-Jan-2025"
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            .replace(/ /g, '-');
    }

    private round2(val: number): number {
        return Math.round(val * 100) / 100;
    }

    /**
     * GST-002: Generate GSTR-1 JSON strictly conforming to GSTN Offline Utility Schema
     * Section coverage: b2b, b2cl, b2cs, hsn, nil
     */
    async generateGstr1Json(tenantId: string, month: number, year: number): Promise<object> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        const tenantStateCode = this.getStateCode(tenant?.state);

        // Fetch all non-cancelled invoices for the period
        const invoices = await this.prisma.invoice.findMany({
            where: {
                tenantId,
                issueDate: { gte: startDate, lte: endDate },
                status: { not: 'Cancelled' },
            },
            include: {
                customer: true,
                items: {
                    include: { product: true },
                },
            },
            orderBy: { issueDate: 'asc' },
        });

        const b2b: { ctin: string; inv: Gstr1B2bInvoice[] }[] = [];
        const b2cl: { pos: string; inv: Gstr1B2cLarge[] }[] = [];
        const b2csMap: Record<string, { txval: number; iamt: number; camt: number; samt: number; csamt: number }> = {};
        const hsnMap: Record<string, Gstr1HsnSummary> = {};
        const nilMap: Record<string, Gstr1NilExempted> = {};

        const B2CL_THRESHOLD = 250000; // B2C Large threshold: >2.5L inter-state

        // GST-005: consolidate per-rate subtotals for HSN summary
        for (const inv of invoices) {
            const customer = inv.customer;
            const custGstin = customer?.gstin;
            const custState = customer?.state;
            const custStateCode = this.getStateCode(custState);
            const isInterState = tenantStateCode !== custStateCode;
            const invVal = this.round2(Number(inv.totalAmount));
            const pos = custStateCode;
            const invDate = this.formatDate(inv.issueDate);
            const isB2B = !!custGstin;

            // Build GSTN item list from invoice items
            const itemsList: Gstr1Item[] = [];
            for (let i = 0; i < inv.items.length; i++) {
                const item = inv.items[i];
                const txval = this.round2(Number(item.taxableAmount));
                const rt = this.round2(Number(item.gstRate));
                const iamt = this.round2(Number((item as any).igstAmount || 0));
                const camt = this.round2(Number((item as any).cgstAmount || 0));
                const samt = this.round2(Number((item as any).sgstAmount || 0));

                itemsList.push({
                    num: i + 1,
                    itm_det: {
                        txval,
                        rt,
                        ...(isInterState ? { iamt } : { camt, samt }),
                        csamt: 0,
                    },
                });

                // GST-005 HSN Summary roll-up across all invoices by HSN+rate pair
                const hsnCode = item.product?.hsnCode || item.hsnCode || 'UNKNOWN';
                const hsnKey = `${hsnCode}_${rt}`;
                if (!hsnMap[hsnKey]) {
                    hsnMap[hsnKey] = {
                        num: Object.keys(hsnMap).length + 1,
                        hsn_sc: hsnCode,
                        desc: item.product?.name || hsnCode,
                        uqc: 'NOS',
                        cnt: 0,
                        val: 0,
                        txval: 0,
                        iamt: 0,
                        camt: 0,
                        samt: 0,
                        csamt: 0,
                    };
                }
                hsnMap[hsnKey].cnt += this.round2(Number(item.quantity));
                hsnMap[hsnKey].val = this.round2(hsnMap[hsnKey].val + Number(item.totalAmount));
                hsnMap[hsnKey].txval = this.round2(hsnMap[hsnKey].txval + txval);
                hsnMap[hsnKey].iamt = this.round2(hsnMap[hsnKey].iamt + iamt);
                hsnMap[hsnKey].camt = this.round2(hsnMap[hsnKey].camt + camt);
                hsnMap[hsnKey].samt = this.round2(hsnMap[hsnKey].samt + samt);
            }

            // Total GST on invoice
            const totalGST = this.round2(Number(inv.totalGST));
            if (totalGST === 0) {
                // Nil / exempted supply
                const nilKey = isInterState ? 'INTRB2B' : 'INTRB2C';
                if (!nilMap[nilKey]) {
                    nilMap[nilKey] = { sply_ty: nilKey as any, nil_amt: 0, expt_amt: 0, ngsup_amt: 0 };
                }
                nilMap[nilKey].nil_amt = this.round2(nilMap[nilKey].nil_amt + invVal);
                continue;
            }

            if (isB2B) {
                // B2B: lookup or create entry by customer GSTIN
                let b2bEntry = b2b.find((e) => e.ctin === custGstin);
                if (!b2bEntry) {
                    b2bEntry = { ctin: custGstin!, inv: [] };
                    b2b.push(b2bEntry);
                }
                b2bEntry.inv.push({
                    inum: inv.invoiceNumber,
                    idt: invDate,
                    val: invVal,
                    pos,
                    rchrg: 'N',
                    inv_typ: 'R',
                    itms: itemsList,
                });
            } else if (isInterState && invVal > B2CL_THRESHOLD) {
                // B2C Large: inter-state, unregistered, value > 2.5L
                let b2clEntry = b2cl.find((e) => e.pos === pos);
                if (!b2clEntry) {
                    b2clEntry = { pos, inv: [] };
                    b2cl.push(b2clEntry);
                }
                b2clEntry.inv.push({
                    oty: 'OE',
                    pos,
                    typ: 'OE',
                    val: invVal,
                    itms: itemsList,
                });
            } else {
                // B2CS: aggregated by rate+pos
                for (const it of itemsList) {
                    const b2csKey = `${it.itm_det.rt}_${pos}`;
                    if (!b2csMap[b2csKey]) {
                        b2csMap[b2csKey] = { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
                    }
                    b2csMap[b2csKey].txval = this.round2(b2csMap[b2csKey].txval + it.itm_det.txval);
                    b2csMap[b2csKey].iamt = this.round2(b2csMap[b2csKey].iamt + (it.itm_det.iamt || 0));
                    b2csMap[b2csKey].camt = this.round2(b2csMap[b2csKey].camt + (it.itm_det.camt || 0));
                    b2csMap[b2csKey].samt = this.round2(b2csMap[b2csKey].samt + (it.itm_det.samt || 0));
                }
            }
        }

        // Build final b2cs array
        const b2cs = Object.entries(b2csMap).map(([key, v]) => {
            const [rt, pos] = key.split('_');
            const isInterState = pos !== tenantStateCode;
            return {
                sply_ty: isInterState ? 'INTER' : 'INTRA',
                pos,
                typ: 'OE',
                txval: v.txval,
                rt: Number(rt),
                ...(isInterState ? { iamt: v.iamt } : { camt: v.camt, samt: v.samt }),
                csamt: 0,
            };
        });

        const hsn = {
            data: Object.values(hsnMap).map((h, i) => ({ ...h, num: i + 1 })),
        };

        const nil = Object.values(nilMap);

        // GSTN JSON Schema root structure
        const gstr1Payload = {
            gstin: tenant?.gstin || '',
            fp: `${String(month).padStart(2, '0')}${year}`,  // Filing Period e.g. "012025"
            b2b,
            b2cl,
            b2cs,
            hsn,
            nil: nil.length > 0 ? nil : undefined,
            // Sections not yet applicable: exp, at, ata, txpd, cdnr, cdnur
        };

        return gstr1Payload;
    }
}
