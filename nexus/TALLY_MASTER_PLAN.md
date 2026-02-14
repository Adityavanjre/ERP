# Tally Bridge: 10-Day Execution Blueprint (Solo Founder Edition)

## I. 10-Day Execution Grid

| Day | Task | Definition of Done (DoD) | DO NOT BUILD |
| :--- | :--- | :--- | :--- |
| **01** | **Master Sync** | XML generates all Products/Customers/Suppliers masters. | Advanced Tax configurations. |
| **02** | **Sales Bridge** | Sales Vouchers with SGST/CGST/IGST mapping verified. | Multi-currency support. |
| **03** | **Purchase Bridge** | Purchase Orders (Received) mapped to Purchase Vouchers. | RFQs or Partially Received POs. |
| **04** | **Ledger Bridge** | Receipt (Cash/Bank) and Payment Vouchers logic. | Cost Centers or Projects. |
| **05** | **Integrity Pass** | Dry-Run Validator implemented (Zero-balance check). | Auto-reconciliation of banks. |
| **06** | **UI Selector** | Month/Year selector + Download feedback UI. | Custom Date Range picker. |
| **07** | **Stress Test** | Export 500+ mixed vouchers without memory leak. | Real-time Tally API push. |
| **08** | **Pilot Feedback** | First file import into Pilot's Tally (UAT). | Change requests to UI colors. |
| **09** | **Red-Flag Audit** | Final check of XML encoding and Ledger name unique-ness. | Performance optimizations. |
| **10** | **GO-LIVE** | Successful month-end export for Pilot Client. | Version 2 features. |

---

## II. Trust-Break Prevention Matrix

| Failure Scenario | Prevention Strategy |
| :--- | :--- |
| **Debit != Credit** | **Dry-Run Validator**: Blocks export if a single voucher is imbalanced. |
| **Duplicate VCH No.** | **Unique Index Check**: Validates VCH number against existing Tally sequence. |
| **XML Corruption** | **Entity Encoding**: Strict character escaping logic in the bridge service. |

---

## III. Boundary Control (MVP vs V2)

### ✅ MVP (IN)
- **Month-wise Export**: Strategic for monthly accounting cycles.
- **Voucher Types**: Sales, Purchase, Receipt, Payment.
- **Masters**: Ledger (Debtors/Creditors), Stock Items (HSN/GST).
- **Manual XML Upload**: Keep it simple, offline-first.

### ❌ Version 2 (OUT for now)
- **Direct Tally API Integration**.
- **Inventory Stock Journals** (Manufacturing).
- **Cost Center Allocation**.
- **Multi-Tenant Global Masters**.

---

## IV. Safe Deployment Checklist
1. [ ] **Validator Pass**: All vouchers sum to exactly 0.00.
2. [ ] **HSN Check**: All products exported have valid HSN codes.
3. [ ] **Sanitization**: No `&` or special chars in Ledger names (Escaped).
4. [ ] **State Check**: State names match Tally's lookup list (e.g. "Karnataka").
5. [ ] **Rollback**: If export fails, standard accounting ledger is the fallback.

---

## V. Founder Discipline Lock
**Ignore these requests until Client #5 is signed:**
- "Can we sync this with Excel?"
- "Can we have custom XML templates for my accountant?"
- "Can it push to QuickBooks too?"
- "Can we add employee payroll to the export?"
