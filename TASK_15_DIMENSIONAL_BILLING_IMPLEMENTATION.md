# Task 15: Dimensional Billing Implementation Guide

**Date**: July 1, 2026  
**Status**: 📋 **READY FOR DESIGN & IMPLEMENTATION**  
**Complexity**: High (Complex feature, requires careful design)  
**Estimated Time**: 6-8 hours backend + 4-6 hours frontend  

---

## OVERVIEW

Dimensional billing is for products measured by dimensions rather than simple quantity.

### Use Case: Roofing Sheets
```
Standard Billing:
  Qty: 100 sheets
  Rate: ₹50/sheet
  Amount: ₹5,000

Dimensional Billing (Roofing Format):
Section 1: Roof Sheets
  Width × Length × Quantity
  → 2m × 4m × 10 sheets = 80 sq.m → Rate ₹50/sq.m → ₹4,000
  
Section 2: Labor
  Simple Qty: 5 hours
  Rate: ₹200/hour
  Amount: ₹1,000
  
Total: ₹5,000
```

---

## SCHEMA STATUS ✅

Already in place:
```prisma
model Invoice {
  billingMode      String?  @default("standard")  // "standard" or "dimensional"
  itemSections     Json?    // Stores dimensional data
}
```

Need to define structure for `itemSections` JSON:

```typescript
interface ItemSection {
  id: string;
  title: string;  // e.g., "Roof Sheets", "Labor"
  type: 'dimensional' | 'simple';
  
  // For DIMENSIONAL type:
  items: {
    width: number;
    length: number;
    quantity: number;
    rate: number;
    unit: string;  // "sqm", "sqft", etc.
    amount: number;  // Computed: width × length × quantity × rate
  }[];
  
  // For SIMPLE type:
  items: {
    description: string;
    quantity: number;
    rate: number;
    unit: string;
    amount: number;  // Computed: quantity × rate
  }[];
  
  subtotal: number;  // Sum of all items in section
}
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: Backend Schema Validation (1 hour)

#### 1. Create Type Definitions
**File**: `nexus/backend/src/accounting/types/billing.ts`

```typescript
export type BillingMode = 'standard' | 'dimensional';

export interface DimensionalItem {
  width: number;
  length: number;
  quantity: number;
  rate: number;
  unit: 'sqm' | 'sqft' | 'unit';
  amount?: number;  // Computed
}

export interface SimpleItem {
  description: string;
  quantity: number;
  rate: number;
  unit: string;
  amount?: number;  // Computed
}

export interface ItemSection {
  id: string;
  title: string;
  type: 'dimensional' | 'simple';
  items: (DimensionalItem | SimpleItem)[];
  subtotal?: number;  // Computed
  taxRate?: number;
  tax?: number;  // Computed
}

export interface DimensionalBillingData {
  billingMode: 'dimensional';
  sections: ItemSection[];
}

export interface StandardBillingData {
  billingMode: 'standard';
  // Items array (existing structure)
}
```

#### 2. Validation Service
**File**: `nexus/backend/src/accounting/services/billing-validator.service.ts`

```typescript
@Injectable()
export class BillingValidatorService {
  validateDimensionalBilling(data: DimensionalBillingData): ValidationResult {
    const errors: string[] = [];

    data.sections.forEach((section, idx) => {
      if (!section.title) errors.push(`Section ${idx}: Title is required`);
      if (!section.type) errors.push(`Section ${idx}: Type is required`);

      if (section.type === 'dimensional') {
        section.items.forEach((item: any, itemIdx) => {
          if (!item.width || item.width <= 0) {
            errors.push(`Section ${idx} Item ${itemIdx}: Width must be > 0`);
          }
          if (!item.length || item.length <= 0) {
            errors.push(`Section ${idx} Item ${itemIdx}: Length must be > 0`);
          }
          if (!item.quantity || item.quantity <= 0) {
            errors.push(`Section ${idx} Item ${itemIdx}: Quantity must be > 0`);
          }
          if (!item.rate || item.rate < 0) {
            errors.push(`Section ${idx} Item ${itemIdx}: Rate is required`);
          }
        });
      }
    });

    return { valid: errors.length === 0, errors };
  }

  computeDimensionalBilling(data: DimensionalBillingData) {
    let totalAmount = 0;

    data.sections.forEach((section) => {
      let sectionSubtotal = 0;

      section.items.forEach((item: any) => {
        if (section.type === 'dimensional') {
          const area = item.width * item.length * item.quantity;
          item.amount = area * item.rate;
        } else {
          item.amount = item.quantity * item.rate;
        }
        sectionSubtotal += item.amount;
      });

      section.subtotal = sectionSubtotal;
      totalAmount += sectionSubtotal;
    });

    return { sections: data.sections, totalAmount };
  }
}
```

### Phase 2: Invoice Service Updates (1-2 hours)

#### Update Invoice Service
**File**: `nexus/backend/src/accounting/services/invoice.service.ts`

```typescript
async createInvoice(data: any, tenantId: string) {
  const { billingMode = 'standard', itemSections, items } = data;

  if (billingMode === 'dimensional') {
    // Validate dimensional billing
    const validation = this.billingValidator.validateDimensionalBilling({
      billingMode: 'dimensional',
      sections: itemSections,
    });

    if (!validation.valid) {
      throw new BadRequestException(validation.errors);
    }

    // Compute totals
    const computed = this.billingValidator.computeDimensionalBilling({
      billingMode: 'dimensional',
      sections: itemSections,
    });

    const invoice = await this.prisma.invoice.create({
      data: {
        ...commonInvoiceData,
        billingMode: 'dimensional',
        itemSections: computed.sections,
        totalAmount: new Decimal(computed.totalAmount),
        // Create invoice items from sections for GST calculation
        items: {
          create: this.extractItemsFromSections(computed.sections),
        },
      },
    });

    return invoice;
  }

  // Standard billing (existing logic)
  return this.createStandardInvoice(data, tenantId);
}

private extractItemsFromSections(sections: ItemSection[]): any[] {
  return sections.flatMap((section, sIdx) =>
    section.items.map((item, iIdx) => ({
      productName: section.type === 'dimensional'
        ? `${section.title} - Dimensional`
        : `${section.title}`,
      quantity: section.type === 'dimensional' 
        ? (item as any).width * (item as any).length * (item as any).quantity
        : (item as any).quantity,
      price: section.type === 'dimensional'
        ? (item as any).rate
        : (item as any).rate,
      gstRate: section.taxRate || 0,
    })),
  );
}
```

### Phase 3: Frontend - Dimensional Billing Editor (2-3 hours)

#### Create Dimensional Billing Editor
**File**: `nexus/frontend/src/components/accounting/dimensional-billing-editor.tsx`

```typescript
export function DimensionalBillingEditor({
  sections = [],
  onSectionsChange,
}: {
  sections: ItemSection[];
  onSectionsChange: (sections: ItemSection[]) => void;
}) {
  const [sections, setSections] = useState<ItemSection[]>(sections);

  const addSection = () => {
    const newSection: ItemSection = {
      id: generateId(),
      title: '',
      type: 'simple',
      items: [],
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, updates: Partial<ItemSection>) => {
    setSections(
      sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const addItem = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newItem =
      section.type === 'dimensional'
        ? { width: 0, length: 0, quantity: 1, rate: 0, unit: 'sqm' }
        : { description: '', quantity: 1, rate: 0, unit: 'units' };

    section.items.push(newItem);
    updateSection(sectionId, { items: section.items });
  };

  const updateItem = (
    sectionId: string,
    itemIdx: number,
    updates: any,
  ) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    section.items[itemIdx] = { ...section.items[itemIdx], ...updates };
    updateSection(sectionId, { items: section.items });
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Dimensional Billing Sections</h3>
        <button
          onClick={addSection}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-bold"
        >
          + Add Section
        </button>
      </div>

      {sections.map((section) => (
        <div
          key={section.id}
          className="p-3 bg-white border border-slate-200 rounded-lg"
        >
          <div className="flex justify-between items-center mb-3">
            <input
              type="text"
              value={section.title}
              onChange={(e) =>
                updateSection(section.id, { title: e.target.value })
              }
              placeholder="Section Title (e.g., Roof Sheets)"
              className="flex-1 h-9 px-3 rounded-lg border border-slate-200 font-bold"
            />
            <select
              value={section.type}
              onChange={(e) =>
                updateSection(section.id, { type: e.target.value as any })
              }
              className="ml-3 h-9 px-3 rounded-lg border border-slate-200"
            >
              <option value="simple">Simple</option>
              <option value="dimensional">Dimensional (W×L×Q)</option>
            </select>
            <button
              onClick={() => removeSection(section.id)}
              className="ml-3 text-red-500 hover:text-red-700 font-bold"
            >
              Delete
            </button>
          </div>

          {/* Items for this section */}
          <div className="space-y-2 mb-2">
            {section.items.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                {section.type === 'dimensional' ? (
                  <>
                    <input
                      type="number"
                      value={(item as any).width}
                      onChange={(e) =>
                        updateItem(section.id, idx, {
                          width: parseFloat(e.target.value),
                        })
                      }
                      placeholder="Width"
                      className="w-20 h-8 px-2 rounded border border-slate-200 text-sm"
                    />
                    <span className="text-center text-sm font-bold">×</span>
                    <input
                      type="number"
                      value={(item as any).length}
                      onChange={(e) =>
                        updateItem(section.id, idx, {
                          length: parseFloat(e.target.value),
                        })
                      }
                      placeholder="Length"
                      className="w-20 h-8 px-2 rounded border border-slate-200 text-sm"
                    />
                    <span className="text-center text-sm font-bold">×</span>
                    <input
                      type="number"
                      value={(item as any).quantity}
                      onChange={(e) =>
                        updateItem(section.id, idx, {
                          quantity: parseFloat(e.target.value),
                        })
                      }
                      placeholder="Qty"
                      className="w-16 h-8 px-2 rounded border border-slate-200 text-sm"
                    />
                    <span className="text-center text-sm font-bold">@</span>
                    <input
                      type="number"
                      value={(item as any).rate}
                      onChange={(e) =>
                        updateItem(section.id, idx, {
                          rate: parseFloat(e.target.value),
                        })
                      }
                      placeholder="Rate"
                      className="w-24 h-8 px-2 rounded border border-slate-200 text-sm"
                    />
                    <span className="text-sm font-bold">
                      = ₹
                      {(
                        (item as any).width *
                        (item as any).length *
                        (item as any).quantity *
                        (item as any).rate
                      ).toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={(item as any).description}
                      onChange={(e) =>
                        updateItem(section.id, idx, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Description"
                      className="flex-1 h-8 px-2 rounded border border-slate-200 text-sm"
                    />
                    <input
                      type="number"
                      value={(item as any).quantity}
                      onChange={(e) =>
                        updateItem(section.id, idx, {
                          quantity: parseFloat(e.target.value),
                        })
                      }
                      placeholder="Qty"
                      className="w-16 h-8 px-2 rounded border border-slate-200 text-sm"
                    />
                    <span className="text-center text-sm font-bold">@</span>
                    <input
                      type="number"
                      value={(item as any).rate}
                      onChange={(e) =>
                        updateItem(section.id, idx, {
                          rate: parseFloat(e.target.value),
                        })
                      }
                      placeholder="Rate"
                      className="w-24 h-8 px-2 rounded border border-slate-200 text-sm"
                    />
                    <span className="text-sm font-bold">
                      = ₹{((item as any).quantity * (item as any).rate).toFixed(2)}
                    </span>
                  </>
                )}
                <button
                  onClick={() =>
                    updateSection(section.id, {
                      items: section.items.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => addItem(section.id)}
            className="text-sm text-blue-600 font-bold hover:text-blue-700"
          >
            + Add Item
          </button>

          <div className="mt-2 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-700">
              Subtotal: ₹
              {section.items
                .reduce((sum, item: any) => {
                  if (section.type === 'dimensional') {
                    return sum + item.width * item.length * item.quantity * item.rate;
                  }
                  return sum + item.quantity * item.rate;
                }, 0)
                .toFixed(2)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Phase 4: Frontend - Invoice Creation Dialog Update (1-2 hours)

Update the invoice creation dialog to switch between Standard and Dimensional modes:

```typescript
const [billingMode, setBillingMode] = useState<'standard' | 'dimensional'>('standard');
const [itemSections, setItemSections] = useState<ItemSection[]>([]);

// In form:
<div className="mb-4">
  <Label>Billing Mode</Label>
  <div className="flex gap-2">
    <button
      onClick={() => setBillingMode('standard')}
      className={cn(
        'px-4 py-2 rounded-lg font-bold',
        billingMode === 'standard'
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 text-slate-700',
      )}
    >
      Standard Billing
    </button>
    <button
      onClick={() => setBillingMode('dimensional')}
      className={cn(
        'px-4 py-2 rounded-lg font-bold',
        billingMode === 'dimensional'
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 text-slate-700',
      )}
    >
      Dimensional Billing
    </button>
  </div>
</div>

{billingMode === 'dimensional' && (
  <DimensionalBillingEditor
    sections={itemSections}
    onSectionsChange={setItemSections}
  />
)}
```

### Phase 5: Invoice Print Template Update (1-2 hours)

Update the invoice print template to render dimensional sections:

```tsx
{/* Dimensional Billing Sections */}
{invoice.billingMode === 'dimensional' && invoice.itemSections && (
  <div className="space-y-4">
    {invoice.itemSections.map((section, sIdx) => (
      <div key={sIdx} className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-100 px-3 py-2 font-bold text-slate-900">
          {section.title}
        </div>
        
        {section.type === 'dimensional' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 text-left font-bold">Width</th>
                <th className="px-3 py-2 text-left font-bold">Length</th>
                <th className="px-3 py-2 text-left font-bold">Qty</th>
                <th className="px-3 py-2 text-left font-bold">Unit</th>
                <th className="px-3 py-2 text-right font-bold">Rate</th>
                <th className="px-3 py-2 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((item, iIdx) => (
                <tr key={iIdx} className="border-b border-slate-100">
                  <td className="px-3 py-2">{(item as any).width}</td>
                  <td className="px-3 py-2">{(item as any).length}</td>
                  <td className="px-3 py-2">{(item as any).quantity}</td>
                  <td className="px-3 py-2">{(item as any).unit}</td>
                  <td className="px-3 py-2 text-right">
                    ₹{(item as any).rate.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">
                    ₹{(item as any).amount?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {section.type === 'simple' && (
          <div className="space-y-2 px-3 py-2">
            {section.items.map((item, iIdx) => (
              <div key={iIdx} className="flex justify-between">
                <span>{(item as any).description}</span>
                <span>
                  {(item as any).quantity} × ₹{(item as any).rate} = ₹
                  {((item as any).quantity * (item as any).rate).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 font-bold text-right">
          Section Total: ₹{section.subtotal?.toFixed(2) || '0.00'}
        </div>
      </div>
    ))}
  </div>
)}
```

---

## TESTING CHECKLIST

- [ ] Create invoice with dimensional billing (2 sections)
- [ ] Verify calculations: Width × Length × Qty × Rate
- [ ] Test with simple section alongside dimensional
- [ ] Verify subtotals per section
- [ ] Verify grand total
- [ ] Print invoice shows sections correctly formatted
- [ ] Test with different units (sqm, sqft, units)
- [ ] Verify GST calculated on total amount
- [ ] Create payment against dimensional invoice
- [ ] Test convert dimensional back to standard (if needed)

---

## PERFORMANCE CONSIDERATIONS

- Store computed values in `itemSections` JSON to avoid recalculating
- Index invoices by billingMode for filtering
- Validate dimensions before saving to prevent data corruption

---

## MIGRATION NOTES

No database migration needed! Schema already has:
- ✅ `billingMode` field
- ✅ `itemSections` JSON field
- ✅ Invoice-InvoiceItem relationship for GST

---

## NEXT STEPS

1. Define ItemSection type structure
2. Implement BillingValidatorService
3. Update InvoiceService for dimensional handling
4. Create DimensionalBillingEditor component
5. Update InvoiceCreationDialog
6. Update invoice print template
7. Test comprehensive flow

---

**Estimated Completion**: 1.5 sprints (6-8 hours)  
**Priority**: 🟡 Medium (Complex feature, can be deferred)  
**Complexity**: 🔴 High (Careful design required, many edge cases)

---

## EXAMPLE: Roofing Invoice

```
INVOICE #INV-001

DIMENSIONAL BILLING:

┌─ Section 1: Roof Sheets ──────────────────────┐
│ Width × Length × Qty @ Rate = Amount          │
│ 2m × 4m × 10 @ ₹50/sqm = ₹4,000             │
│ 3m × 6m × 5 @ ₹50/sqm = ₹4,500              │
│ Section Subtotal: ₹8,500                      │
└──────────────────────────────────────────────┘

┌─ Section 2: Installation Labor ───────────────┐
│ Description × Qty @ Rate = Amount             │
│ Labor - 5 days × 1 @ ₹500/day = ₹2,500       │
│ Section Subtotal: ₹2,500                      │
└──────────────────────────────────────────────┘

TOTAL BEFORE TAX: ₹11,000
GST (18%): ₹1,980
TOTAL: ₹12,980

PAYMENT STATUS: Unpaid
DUE DATE: 30 days
```

