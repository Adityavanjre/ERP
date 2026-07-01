# Task 13: Payment Tracking Implementation Guide

**Date**: July 1, 2026  
**Status**: 📋 **READY FOR IMPLEMENTATION**  
**Complexity**: Medium (Backend-heavy)  
**Estimated Time**: 4-6 hours backend + 3-4 hours frontend  

---

## OVERVIEW

Payment tracking allows you to:
- Mark invoices with payment status (Unpaid, Partially Paid, Paid, Advance Paid)
- Track payment amounts and due dates
- Record multiple payments against a single invoice
- See outstanding balance

---

## SCHEMA STATUS ✅

The database schema is **already ready** with these fields:

```prisma
model Invoice {
  // Existing fields
  id                 String        @id
  invoiceNumber      String
  totalAmount        Decimal
  dueDate            DateTime
  
  // Payment Tracking (Already in schema!)
  amountPaid         Decimal       @default(0.00)
  totalPaid          Decimal       @default(0.00)
  amountDue          Decimal       @default(0.00)
  paymentStatus      PaymentStatus @default(Unpaid)  // Enum: Unpaid, PartiallyPaid, Paid, AdvancePaid
  
  // Relations
  payments           Payment[]
}

model Payment {
  // Already exists!
  id                 String   @id
  invoiceId          String?
  amount             Decimal
  date               DateTime
  mode               PaymentMode  @default(Cash)  // Cash, UPI, Card, Check, BankTransfer
  reference          String?
  createdAt          DateTime
}

enum PaymentStatus {
  Unpaid
  PartiallyPaid
  Paid
  AdvancePaid
}

enum PaymentMode {
  Cash
  UPI
  Card
  Check
  BankTransfer
}
```

**Status**: ✅ Schema is ready, no migrations needed!

---

## IMPLEMENTATION ROADMAP

### Phase 1: Backend Service Layer (1-2 hours)

#### 1. Create Payment Service
**File**: `nexus/backend/src/accounting/services/payment.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  // Record a payment against an invoice
  async recordPayment(
    tenantId: string,
    invoiceId: string,
    amount: number,
    mode: 'Cash' | 'UPI' | 'Card' | 'Check' | 'BankTransfer',
    reference?: string,
  ) {
    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
        amount: new Decimal(amount),
        mode,
        reference,
      },
    });

    // Update invoice payment status
    await this.updateInvoicePaymentStatus(tenantId, invoiceId);

    return payment;
  }

  // Calculate payment status based on paid amount
  async updateInvoicePaymentStatus(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) throw new Error('Invoice not found');

    // Get total paid from all payments
    const payments = await this.prisma.payment.findMany({
      where: { invoiceId, tenantId },
    });

    const totalPaid = payments.reduce(
      (sum, p) => sum.plus(p.amount),
      new Decimal(0),
    );

    const totalAmount = new Decimal(invoice.totalAmount);
    const amountDue = totalAmount.minus(totalPaid);

    // Determine payment status
    let paymentStatus = 'Unpaid';
    if (totalPaid.greaterThanOrEqualTo(totalAmount)) {
      paymentStatus = 'Paid';
    } else if (totalPaid.greaterThan(0)) {
      paymentStatus = 'PartiallyPaid';
    } else if (totalPaid.greaterThan(totalAmount)) {
      paymentStatus = 'AdvancePaid';
    }

    // Update invoice
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        totalPaid,
        amountDue,
        paymentStatus: paymentStatus as any,
      },
    });
  }

  // Get all payments for an invoice
  async getPaymentHistory(tenantId: string, invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoiceId, tenantId },
      orderBy: { date: 'desc' },
    });
  }
}
```

#### 2. Update Invoice Service
**File**: `nexus/backend/src/accounting/services/invoice.service.ts`

Add method to compute payment status when creating invoice:

```typescript
async createInvoice(data: CreateInvoiceDto, tenantId: string) {
  // ... existing code ...
  
  const invoice = await this.prisma.invoice.create({
    data: {
      ...invoiceData,
      tenantId,
      paymentStatus: 'Unpaid',
      totalPaid: 0,
      amountDue: invoiceData.totalAmount,
    },
  });

  return invoice;
}
```

#### 3. Create Payment Controller
**File**: `nexus/backend/src/accounting/controllers/payment.controller.ts`

```typescript
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';

@Controller('accounting/payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post()
  async recordPayment(
    @Body() dto: { invoiceId: string; amount: number; mode: string; reference?: string },
  ) {
    const tenantId = 'current-tenant'; // Get from context
    return this.paymentService.recordPayment(
      tenantId,
      dto.invoiceId,
      dto.amount,
      dto.mode as any,
      dto.reference,
    );
  }

  @Get('history/:invoiceId')
  async getPaymentHistory(@Param('invoiceId') invoiceId: string) {
    const tenantId = 'current-tenant';
    return this.paymentService.getPaymentHistory(tenantId, invoiceId);
  }
}
```

---

### Phase 2: Frontend - Invoice Dialog (1-2 hours)

#### 1. Add Payment Section to Create Invoice Dialog
**File**: `nexus/frontend/src/components/accounting/create-invoice-dialog.tsx`

```typescript
const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
const [amountPaid, setAmountPaid] = useState<number>(0);
const [dueDate, setDueDate] = useState<Date>(new Date());

// In the form JSX:
<div className="space-y-3">
  <Label>Payment Method</Label>
  <select
    value={paymentMode}
    onChange={(e) => setPaymentMode(e.target.value as any)}
    className="w-full h-10 px-3 rounded-lg border border-slate-200"
  >
    <option value="Cash">💵 Cash</option>
    <option value="UPI">📱 UPI</option>
    <option value="Card">💳 Card</option>
    <option value="Check">✓ Cheque</option>
    <option value="BankTransfer">🏦 Bank Transfer</option>
  </select>

  <Label>Amount Paid</Label>
  <input
    type="number"
    value={amountPaid}
    onChange={(e) => setAmountPaid(Number(e.target.value))}
    className="w-full h-10 px-3 rounded-lg border border-slate-200"
    placeholder="Leave empty if unpaid"
  />

  <Label>Due Date</Label>
  <input
    type="date"
    value={dueDate.toISOString().split('T')[0]}
    onChange={(e) => setDueDate(new Date(e.target.value))}
    className="w-full h-10 px-3 rounded-lg border border-slate-200"
  />
</div>
```

#### 2. Update Invoice Submission
```typescript
const handleCreateInvoice = async () => {
  const payload = {
    items,
    customerId,
    totalAmount: total,
    issueDate: new Date(),
    dueDate,
    paymentMode,
    amountPaid: amountPaid > 0 ? amountPaid : 0,
    paymentStatus: amountPaid >= total ? 'Paid' : amountPaid > 0 ? 'PartiallyPaid' : 'Unpaid',
  };

  await api.post('accounting/invoices', payload);
};
```

---

### Phase 3: Frontend - Invoice Display (1 hour)

#### Update Invoice Print Template
**File**: `nexus/frontend/src/app/(dashboard)/invoice/[id]/page.tsx`

Add payment status section:

```tsx
{/* Payment Status Section */}
<div className="my-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <div className="flex justify-between items-center mb-2">
    <span className="font-bold text-blue-900">Payment Status:</span>
    <span className={cn(
      "px-3 py-1 rounded-full text-sm font-bold",
      invoice.paymentStatus === 'Paid' && "bg-green-100 text-green-800",
      invoice.paymentStatus === 'PartiallyPaid' && "bg-yellow-100 text-yellow-800",
      invoice.paymentStatus === 'Unpaid' && "bg-red-100 text-red-800",
    )}>
      {invoice.paymentStatus}
    </span>
  </div>
  <div className="grid grid-cols-3 gap-4 text-sm">
    <div>
      <p className="text-gray-600">Total Amount</p>
      <p className="font-bold">₹{invoice.totalAmount.toLocaleString()}</p>
    </div>
    <div>
      <p className="text-gray-600">Paid</p>
      <p className="font-bold text-green-600">₹{invoice.totalPaid.toLocaleString()}</p>
    </div>
    <div>
      <p className="text-gray-600">Due</p>
      <p className="font-bold text-red-600">₹{invoice.amountDue.toLocaleString()}</p>
    </div>
  </div>
</div>
```

---

### Phase 4: Frontend - Record Payment Modal (1 hour)

#### Create Payment Recording Dialog
**File**: `nexus/frontend/src/components/accounting/record-payment-dialog.tsx`

```typescript
export function RecordPaymentDialog({
  invoiceId,
  invoiceAmount,
  amountPaid,
  onSuccess,
}: {
  invoiceId: string;
  invoiceAmount: number;
  amountPaid: number;
  onSuccess: () => void;
}) {
  const [paymentAmount, setPaymentAmount] = useState(invoiceAmount - amountPaid);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRecordPayment = async () => {
    try {
      setLoading(true);
      await api.post('accounting/payments', {
        invoiceId,
        amount: paymentAmount,
        mode: paymentMode,
        reference,
      });
      toast.success('Payment recorded successfully');
      onSuccess();
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogContent>
        <h2>Record Payment</h2>
        {/* Input fields */}
        <Button onClick={handleRecordPayment} disabled={loading}>
          Record Payment
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

---

## API ENDPOINTS

### Create Invoice with Payment Info
```
POST /accounting/invoices

{
  "customerId": "cust_123",
  "items": [
    { "productId": "prod_1", "quantity": 2, "price": 100, "gstRate": 18 }
  ],
  "totalAmount": 236,
  "issueDate": "2026-07-01",
  "dueDate": "2026-07-31",
  "paymentMode": "Cash",
  "amountPaid": 100,  // NEW
  "paymentStatus": "PartiallyPaid"  // NEW
}
```

### Record Payment
```
POST /accounting/payments

{
  "invoiceId": "inv_123",
  "amount": 136,
  "mode": "UPI",
  "reference": "UPI_123456"
}

Response:
{
  "id": "pmt_123",
  "invoiceId": "inv_123",
  "amount": 136,
  "date": "2026-07-01",
  "mode": "UPI"
}
```

### Get Payment History
```
GET /accounting/payments/history/:invoiceId

Response:
[
  {
    "id": "pmt_123",
    "amount": 100,
    "date": "2026-07-01",
    "mode": "Cash",
    "reference": null
  },
  {
    "id": "pmt_124",
    "amount": 136,
    "date": "2026-07-02",
    "mode": "UPI",
    "reference": "UPI_123456"
  }
]
```

---

## PAYMENT STATUS LOGIC

```
if (amountPaid == 0):
  status = UNPAID

else if (amountPaid < totalAmount):
  status = PARTIALLY_PAID

else if (amountPaid == totalAmount):
  status = PAID

else if (amountPaid > totalAmount):
  status = ADVANCE_PAID
```

---

## TESTING CHECKLIST

- [ ] Create invoice with partial payment
- [ ] Record additional payment against invoice
- [ ] Verify status changes from Unpaid → Partially Paid → Paid
- [ ] Test with different payment modes (Cash, UPI, Card, etc.)
- [ ] Verify payment history shows all transactions
- [ ] Test outstanding balance calculation
- [ ] Print invoice shows payment status correctly

---

## DATABASE CHANGES

**No migrations needed!** Schema already has:
- ✅ `paymentStatus` enum
- ✅ `totalPaid` decimal field
- ✅ `amountDue` calculated field
- ✅ `Payment` model with mode and reference
- ✅ Invoice-Payment relationship

---

## NEXT STEPS

1. Implement PaymentService in backend
2. Add PaymentController endpoints
3. Update InvoiceService to compute payment status
4. Add payment fields to frontend invoice dialog
5. Create RecordPaymentDialog component
6. Update invoice print template
7. Test end-to-end payment flow

---

**Estimated Completion**: 1 sprint (4-6 hours)  
**Priority**: 🔴 High (Payment is critical feature)  
**Complexity**: 🟡 Medium (Backend-heavy but straightforward)

