-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('Company', 'Individual');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUST');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('Char', 'Text', 'Integer', 'Float', 'Boolean', 'Date', 'DateTime', 'Selection', 'Many2One', 'One2Many', 'Many2Many', 'Binary', 'Html');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Owner', 'Manager', 'Biller', 'Storekeeper', 'Accountant', 'CA', 'Customer', 'Supplier');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('Email', 'Google');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('Free', 'Starter', 'Growth', 'Business', 'Enterprise');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('Active', 'GracePeriod', 'ReadOnly', 'Suspended');

-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('Manufacturing', 'Retail', 'Wholesale', 'Healthcare', 'Education', 'Construction', 'Logistics', 'RealEstate', 'Service', 'Gov', 'NBFC', 'General');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('Lead', 'Prospect', 'Customer', 'Inactive');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Draft', 'Pending', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled');

-- CreateEnum
CREATE TYPE "BOMStatus" AS ENUM ('Active', 'Archived', 'Draft');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('Planned', 'Confirmed', 'InProgress', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High', 'Urgent', 'Critical');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('Idle', 'Running', 'Maintenance', 'Offline');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('Debit', 'Credit');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('Unpaid', 'Paid', 'Partial', 'Overdue', 'Cancelled');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('Cash', 'Bank', 'UPI', 'Cheque');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('Active', 'OnLeave', 'Terminated', 'Resigned');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('Draft', 'Processed', 'Paid');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('Annual', 'Sick', 'Maternity', 'Paternity', 'Unpaid');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('Draft', 'RFQ', 'Ordered', 'Received', 'Cancelled');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Planned', 'Active', 'OnHold', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('Todo', 'InProgress', 'InReview', 'Done', 'Blocked');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('Active', 'Disposed', 'FullyDepreciated');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'Email',
    "providerId" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaRecoveryCodes" TEXT[],
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "TenantType" NOT NULL DEFAULT 'Retail',
    "industry" TEXT,
    "businessType" TEXT,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "plan" "PlanType" NOT NULL DEFAULT 'Free',
    "logoUrl" TEXT,
    "address" TEXT,
    "state" TEXT,
    "gstin" TEXT,
    "fyStartMonth" INTEGER NOT NULL DEFAULT 4,
    "fyStartDay" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'Active',
    "planExpiresAt" TIMESTAMP(3),
    "gracePeriodEndsAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodLock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,

    CONSTRAINT "PeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Biller',

    CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "costPrice" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "stock" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "category" TEXT,
    "tags" TEXT,
    "brand" TEXT,
    "manufacturer" TEXT,
    "weight" TEXT,
    "dimensions" TEXT,
    "minStockLevel" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "supplierName" TEXT,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "hsnCode" TEXT,
    "gstRate" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "isGstOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "barcode" TEXT,
    "skuAlias" TEXT,
    "shelfLifeDays" INTEGER,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "address" TEXT,
    "state" TEXT,
    "gstin" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'Lead',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "stage" "Stage" NOT NULL DEFAULT 'New',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "expectedClose" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "status" "OrderStatus" NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" JSONB,
    "channel" TEXT,
    "ipAddress" TEXT,
    "correlationId" TEXT,
    "responseTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevHash" TEXT,
    "entryHash" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillOfMaterial" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "overheadRate" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "isOverheadFixed" BOOLEAN NOT NULL DEFAULT false,
    "status" "BOMStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "correlationId" TEXT,

    CONSTRAINT "BillOfMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOMItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT,
    "isByproduct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BOMItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "producedQuantity" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "scrapQuantity" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "machineId" TEXT,
    "machineTimeHours" DOUBLE PRECISION,
    "operatorName" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'Planned',
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,
    "correlationId" TEXT,
    "completionLog" JSONB,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT,
    "status" "MachineStatus" NOT NULL DEFAULT 'Idle',
    "hourlyRate" DECIMAL(65,30) DEFAULT 0.00,
    "lastMaintenance" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "correlationId" TEXT,
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "accountId" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "correlationId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalTaxable" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalCGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalSGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalIGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'Unpaid',
    "billingTimeSeconds" INTEGER,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "correlationId" TEXT,
    "tallyExported" BOOLEAN NOT NULL DEFAULT false,
    "cancellationReason" TEXT,
    "isInterState" BOOLEAN DEFAULT false,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL DEFAULT '',
    "hsnCode" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "gstRate" DECIMAL(65,30) NOT NULL,
    "isGstOverride" BOOLEAN NOT NULL DEFAULT false,
    "taxableAmount" DECIMAL(65,30) NOT NULL,
    "gstAmount" DECIMAL(65,30) NOT NULL,
    "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "supplierId" TEXT,
    "invoiceId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "tdsAmount" DECIMAL(65,30) DEFAULT 0.00,
    "netAmount" DECIMAL(65,30) DEFAULT 0.00,
    "tdsSection" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" "PaymentMode" NOT NULL DEFAULT 'Cash',
    "reference" TEXT,
    "notes" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "tallyExported" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOpeningBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,

    CONSTRAINT "CustomerOpeningBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT NOT NULL,
    "departmentId" TEXT,
    "salary" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerId" TEXT,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "basicSalary" DECIMAL(65,30) NOT NULL,
    "bonuses" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "deductions" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "netPay" DECIMAL(65,30) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'Draft',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "state" TEXT,
    "gstin" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "pan" TEXT,
    "vendorType" "VendorType" NOT NULL DEFAULT 'Individual',
    "defaultTdsSection" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOpeningBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,

    CONSTRAINT "SupplierOpeningBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "totalTaxable" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalCGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalSGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalIGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "tdsAmount" DECIMAL(65,30) DEFAULT 0.00,
    "netAmount" DECIMAL(65,30) DEFAULT 0.00,
    "tdsSection" TEXT,
    "status" "POStatus" NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "hsnCode" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "taxableAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "gstRate" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "noteNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "totalTaxable" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalCGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalSGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalIGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "reason" TEXT,
    "journalEntryId" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNoteItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "taxableAmount" DECIMAL(65,30) NOT NULL,
    "gstRate" DECIMAL(65,30) NOT NULL,
    "gstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "CreditNoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebitNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "noteNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "totalTaxable" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalCGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalSGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalIGST" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "reason" TEXT,
    "journalEntryId" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "DebitNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebitNoteItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "debitNoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "taxableAmount" DECIMAL(65,30) NOT NULL,
    "gstRate" DECIMAL(65,30) NOT NULL,
    "gstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "DebitNoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'Planned',
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'Todo',
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "manager" TEXT,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehousePrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehousePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "type" "MovementType" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "fromPlan" TEXT,
    "toPlan" TEXT,
    "reason" TEXT,
    "performedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchaseValue" DECIMAL(65,30) NOT NULL,
    "salvageValue" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "usefulLife" INTEGER NOT NULL,
    "accumulatedDepreciation" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "status" "AssetStatus" NOT NULL DEFAULT 'Active',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "correlationId" TEXT,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepreciationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepreciationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "quotaLimit" INTEGER,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "author" TEXT,
    "website" TEXT,
    "dependencies" TEXT,
    "installed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelDefinition" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldDefinition" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "targetModel" TEXT,
    "selectionOptions" JSONB,

    CONSTRAINT "FieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRight" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permRead" BOOLEAN NOT NULL DEFAULT true,
    "permWrite" BOOLEAN NOT NULL DEFAULT false,
    "permCreate" BOOLEAN NOT NULL DEFAULT false,
    "permUnlink" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccessRight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowNode" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "WorkflowNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "label" TEXT,
    "condition" TEXT,

    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TdsRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "threshold" DECIMAL(65,30) NOT NULL,
    "cumulativeThreshold" DECIMAL(65,30),
    "applicableVendorType" "VendorType" NOT NULL,

    CONSTRAINT "TdsRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TdsLedgerMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "TdsLedgerMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TdsTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "tdsAmount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentId" TEXT,
    "purchaseOrderId" TEXT,
    "journalEntryId" TEXT,

    CONSTRAINT "TdsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "bloodGroup" TEXT,
    "allergies" TEXT,
    "medicalHistory" TEXT,
    "emergencyContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "employeeId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "notes" TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosis" TEXT NOT NULL,
    "prescription" JSONB,
    "labResults" JSONB,
    "notes" TEXT,
    "triageStatus" TEXT NOT NULL DEFAULT 'Normal',

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "costPrice" DECIMAL(65,30),

    CONSTRAINT "PharmacyBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQ" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalEstimated" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalActual" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,

    CONSTRAINT "BOQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BOQItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boqId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "estimatedQty" DECIMAL(65,30) NOT NULL,
    "estimatedRate" DECIMAL(65,30) NOT NULL,
    "actualQty" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "actualRate" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "correlationId" TEXT,

    CONSTRAINT "BOQItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteInventory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "correlationId" TEXT,

    CONSTRAINT "SiteInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "correlationId" TEXT,

    CONSTRAINT "RetentionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "model" TEXT,
    "type" TEXT,
    "capacity" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "lastCurrentKM" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liters" DECIMAL(65,30) NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "odometerReading" INTEGER NOT NULL,
    "journalEntryId" TEXT,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "lrNumber" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "dispatchDate" TIMESTAMP(3) NOT NULL,
    "arrivalDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Dispatched',

    CONSTRAINT "RouteLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "lastServiceDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',

    CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteBenchmark" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "avgFuelLiters" DECIMAL(65,30) NOT NULL,
    "avgTimeHours" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "RouteBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "loanAmount" DECIMAL(65,30) NOT NULL,
    "interestRate" DECIMAL(65,30) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "disbursedDate" TIMESTAMP(3),
    "journalEntryId" TEXT,
    "correlationId" TEXT,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanInterestSlab" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "thresholdAmount" DECIMAL(65,30) NOT NULL,
    "interestRate" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "LoanInterestSlab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EMISchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "principalPart" DECIMAL(65,30) NOT NULL,
    "interestPart" DECIMAL(65,30) NOT NULL,
    "totalEMI" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "paymentId" TEXT,
    "correlationId" TEXT,

    CONSTRAINT "EMISchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestAccrual" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(65,30) NOT NULL,
    "journalEntryId" TEXT,
    "correlationId" TEXT,

    CONSTRAINT "InterestAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KYCRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'Pending',
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "KYCRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "closingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reference" TEXT,
    "type" "TransactionType" NOT NULL,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BankStatementLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "statementLineId" TEXT NOT NULL,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HsnMaster" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "description" TEXT,
    "gstRate" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HsnMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodLock_tenantId_month_year_key" ON "PeriodLock"("tenantId", "month", "year");

-- CreateIndex
CREATE INDEX "TenantUser_tenantId_idx" ON "TenantUser"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_userId_tenantId_key" ON "TenantUser"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "Product_tenantId_name_idx" ON "Product"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Product_tenantId_category_idx" ON "Product"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Product_tenantId_tags_idx" ON "Product"("tenantId", "tags");

-- CreateIndex
CREATE INDEX "Product_tenantId_brand_idx" ON "Product"("tenantId", "brand");

-- CreateIndex
CREATE INDEX "Product_tenantId_skuAlias_idx" ON "Product"("tenantId", "skuAlias");

-- CreateIndex
CREATE INDEX "Product_tenantId_hsnCode_idx" ON "Product"("tenantId", "hsnCode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_barcode_key" ON "Product"("tenantId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_email_idx" ON "Customer"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Customer_tenantId_company_idx" ON "Customer"("tenantId", "company");

-- CreateIndex
CREATE INDEX "Customer_tenantId_status_idx" ON "Customer"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Customer_tenantId_phone_idx" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Customer_tenantId_firstName_lastName_idx" ON "Customer"("tenantId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "Order_tenantId_createdAt_idx" ON "Order"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_tenantId_status_idx" ON "Order"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_tenantId_customerId_createdAt_idx" ON "Order"("tenantId", "customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tenantId_idempotencyKey_key" ON "Order"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_productId_idx" ON "OrderItem"("orderId", "productId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "BillOfMaterial_correlationId_idx" ON "BillOfMaterial"("correlationId");

-- CreateIndex
CREATE INDEX "BOMItem_tenantId_idx" ON "BOMItem"("tenantId");

-- CreateIndex
CREATE INDEX "WorkOrder_tenantId_orderNumber_idx" ON "WorkOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "WorkOrder_correlationId_idx" ON "WorkOrder"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_tenantId_idempotencyKey_key" ON "WorkOrder"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Account_tenantId_idx" ON "Account"("tenantId");

-- CreateIndex
CREATE INDEX "Account_tenantId_type_idx" ON "Account"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Account_tenantId_code_key" ON "Account"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Account_tenantId_name_key" ON "Account"("tenantId", "name");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_date_idx" ON "JournalEntry"("tenantId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_correlationId_idx" ON "JournalEntry"("correlationId");

-- CreateIndex
CREATE INDEX "JournalEntry_reference_idx" ON "JournalEntry"("reference");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_date_idx" ON "Transaction"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_journalEntryId_idx" ON "Transaction"("journalEntryId");

-- CreateIndex
CREATE INDEX "Transaction_correlationId_idx" ON "Transaction"("correlationId");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_accountId_date_idx" ON "Transaction"("tenantId", "accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_journalEntryId_key" ON "Invoice"("journalEntryId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_issueDate_idx" ON "Invoice"("tenantId", "issueDate");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_correlationId_idx" ON "Invoice"("correlationId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_projectId_idx" ON "Invoice"("projectId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_issueDate_idx" ON "Invoice"("tenantId", "status", "issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_idempotencyKey_key" ON "Invoice"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_productId_idx" ON "InvoiceItem"("invoiceId", "productId");

-- CreateIndex
CREATE INDEX "InvoiceItem_tenantId_idx" ON "InvoiceItem"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_date_idx" ON "Payment"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Payment_tenantId_customerId_date_idx" ON "Payment"("tenantId", "customerId", "date");

-- CreateIndex
CREATE INDEX "Payment_correlationId_idx" ON "Payment"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_tenantId_idempotencyKey_key" ON "Payment"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "CustomerOpeningBalance_tenantId_customerId_idx" ON "CustomerOpeningBalance"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerOpeningBalance_correlationId_idx" ON "CustomerOpeningBalance"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_employeeId_key" ON "Employee"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "Payroll_tenantId_createdAt_idx" ON "Payroll"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_employeeId_periodStart_periodEnd_key" ON "Payroll"("employeeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Leave_tenantId_status_idx" ON "Leave"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_userId_key" ON "Supplier"("userId");

-- CreateIndex
CREATE INDEX "SupplierOpeningBalance_tenantId_supplierId_idx" ON "SupplierOpeningBalance"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "SupplierOpeningBalance_correlationId_idx" ON "SupplierOpeningBalance"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_idempotencyKey_key" ON "PurchaseOrder"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_orderNumber_key" ON "PurchaseOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_productId_idx" ON "PurchaseOrderItem"("purchaseOrderId", "productId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_tenantId_idx" ON "PurchaseOrderItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_journalEntryId_key" ON "CreditNote"("journalEntryId");

-- CreateIndex
CREATE INDEX "CreditNote_tenantId_customerId_idx" ON "CreditNote"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "CreditNote_correlationId_idx" ON "CreditNote"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_tenantId_idempotencyKey_key" ON "CreditNote"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_tenantId_noteNumber_key" ON "CreditNote"("tenantId", "noteNumber");

-- CreateIndex
CREATE INDEX "CreditNoteItem_tenantId_idx" ON "CreditNoteItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DebitNote_journalEntryId_key" ON "DebitNote"("journalEntryId");

-- CreateIndex
CREATE INDEX "DebitNote_tenantId_supplierId_idx" ON "DebitNote"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "DebitNote_correlationId_idx" ON "DebitNote"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "DebitNote_tenantId_idempotencyKey_key" ON "DebitNote"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "DebitNote_tenantId_noteNumber_key" ON "DebitNote"("tenantId", "noteNumber");

-- CreateIndex
CREATE INDEX "DebitNoteItem_tenantId_idx" ON "DebitNoteItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_tenantId_name_key" ON "Warehouse"("tenantId", "name");

-- CreateIndex
CREATE INDEX "StockLocation_tenantId_idx" ON "StockLocation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_tenantId_productId_warehouseId_notes_key" ON "StockLocation"("tenantId", "productId", "warehouseId", "notes");

-- CreateIndex
CREATE INDEX "WarehousePrice_tenantId_idx" ON "WarehousePrice"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehousePrice_tenantId_productId_warehouseId_key" ON "WarehousePrice"("tenantId", "productId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_correlationId_idx" ON "StockMovement"("correlationId");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_productId_idx" ON "StockMovement"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "StockMovement_warehouseId_idx" ON "StockMovement"("warehouseId");

-- CreateIndex
CREATE INDEX "BillingEvent_tenantId_createdAt_idx" ON "BillingEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingEvent_event_idx" ON "BillingEvent"("event");

-- CreateIndex
CREATE INDEX "FixedAsset_tenantId_idx" ON "FixedAsset"("tenantId");

-- CreateIndex
CREATE INDEX "FixedAsset_correlationId_idx" ON "FixedAsset"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_tenantId_assetCode_key" ON "FixedAsset"("tenantId", "assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_tenantId_idempotencyKey_key" ON "FixedAsset"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "DepreciationLog_journalEntryId_key" ON "DepreciationLog"("journalEntryId");

-- CreateIndex
CREATE INDEX "DepreciationLog_tenantId_assetId_idx" ON "DepreciationLog"("tenantId", "assetId");

-- CreateIndex
CREATE INDEX "Comment_tenantId_idx" ON "Comment"("tenantId");

-- CreateIndex
CREATE INDEX "Comment_resourceType_resourceId_idx" ON "Comment"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "App_name_key" ON "App"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_name_key" ON "Plugin"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ModelDefinition_name_key" ON "ModelDefinition"("name");

-- CreateIndex
CREATE INDEX "Record_tenantId_modelName_idx" ON "Record"("tenantId", "modelName");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_modelName_idx" ON "WorkflowDefinition"("modelName");

-- CreateIndex
CREATE INDEX "WorkflowNode_workflowId_idx" ON "WorkflowNode"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowTransition_workflowId_idx" ON "WorkflowTransition"("workflowId");

-- CreateIndex
CREATE INDEX "TdsRule_tenantId_idx" ON "TdsRule"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TdsLedgerMapping_tenantId_ruleId_key" ON "TdsLedgerMapping"("tenantId", "ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "TdsTransaction_paymentId_key" ON "TdsTransaction"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "TdsTransaction_purchaseOrderId_key" ON "TdsTransaction"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "TdsTransaction_journalEntryId_key" ON "TdsTransaction"("journalEntryId");

-- CreateIndex
CREATE INDEX "TdsTransaction_tenantId_supplierId_idx" ON "TdsTransaction"("tenantId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_customerId_key" ON "Patient"("customerId");

-- CreateIndex
CREATE INDEX "Patient_tenantId_idx" ON "Patient"("tenantId");

-- CreateIndex
CREATE INDEX "PharmacyBatch_expiryDate_idx" ON "PharmacyBatch"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyBatch_tenantId_productId_batchNumber_key" ON "PharmacyBatch"("tenantId", "productId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BOQ_projectId_key" ON "BOQ"("projectId");

-- CreateIndex
CREATE INDEX "BOQ_correlationId_idx" ON "BOQ"("correlationId");

-- CreateIndex
CREATE INDEX "BOQItem_correlationId_idx" ON "BOQItem"("correlationId");

-- CreateIndex
CREATE INDEX "SiteInventory_correlationId_idx" ON "SiteInventory"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteInventory_tenantId_projectId_productId_key" ON "SiteInventory"("tenantId", "projectId", "productId");

-- CreateIndex
CREATE INDEX "RetentionSchedule_projectId_idx" ON "RetentionSchedule"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNo_key" ON "Vehicle"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "FuelLog_journalEntryId_key" ON "FuelLog"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteLog_lrNumber_key" ON "RouteLog"("lrNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RouteBenchmark_tenantId_origin_destination_key" ON "RouteBenchmark"("tenantId", "origin", "destination");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_journalEntryId_key" ON "Loan"("journalEntryId");

-- CreateIndex
CREATE INDEX "Loan_correlationId_idx" ON "Loan"("correlationId");

-- CreateIndex
CREATE INDEX "LoanInterestSlab_loanId_idx" ON "LoanInterestSlab"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "EMISchedule_paymentId_key" ON "EMISchedule"("paymentId");

-- CreateIndex
CREATE INDEX "EMISchedule_correlationId_idx" ON "EMISchedule"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestAccrual_journalEntryId_key" ON "InterestAccrual"("journalEntryId");

-- CreateIndex
CREATE INDEX "InterestAccrual_correlationId_idx" ON "InterestAccrual"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "KYCRecord_loanId_key" ON "KYCRecord"("loanId");

-- CreateIndex
CREATE INDEX "BankStatement_tenantId_accountId_idx" ON "BankStatement"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "BankStatementLine_tenantId_statementId_idx" ON "BankStatementLine"("tenantId", "statementId");

-- CreateIndex
CREATE INDEX "BankStatementLine_date_amount_idx" ON "BankStatementLine"("date", "amount");

-- CreateIndex
CREATE INDEX "BankReconciliation_tenantId_transactionId_idx" ON "BankReconciliation"("tenantId", "transactionId");

-- CreateIndex
CREATE INDEX "BankReconciliation_tenantId_statementLineId_idx" ON "BankReconciliation"("tenantId", "statementLineId");

-- CreateIndex
CREATE UNIQUE INDEX "BankReconciliation_tenantId_transactionId_statementLineId_key" ON "BankReconciliation"("tenantId", "transactionId", "statementLineId");

-- CreateIndex
CREATE INDEX "HsnMaster_tenantId_idx" ON "HsnMaster"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "HsnMaster_tenantId_hsnCode_key" ON "HsnMaster"("tenantId", "hsnCode");

-- AddForeignKey
ALTER TABLE "PeriodLock" ADD CONSTRAINT "PeriodLock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterial" ADD CONSTRAINT "BillOfMaterial_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterial" ADD CONSTRAINT "BillOfMaterial_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMItem" ADD CONSTRAINT "BOMItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMItem" ADD CONSTRAINT "BOMItem_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "BillOfMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOMItem" ADD CONSTRAINT "BOMItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "BillOfMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOpeningBalance" ADD CONSTRAINT "CustomerOpeningBalance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOpeningBalance" ADD CONSTRAINT "CustomerOpeningBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOpeningBalance" ADD CONSTRAINT "SupplierOpeningBalance_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOpeningBalance" ADD CONSTRAINT "SupplierOpeningBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteItem" ADD CONSTRAINT "CreditNoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteItem" ADD CONSTRAINT "CreditNoteItem_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNoteItem" ADD CONSTRAINT "CreditNoteItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNoteItem" ADD CONSTRAINT "DebitNoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNoteItem" ADD CONSTRAINT "DebitNoteItem_debitNoteId_fkey" FOREIGN KEY ("debitNoteId") REFERENCES "DebitNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebitNoteItem" ADD CONSTRAINT "DebitNoteItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePrice" ADD CONSTRAINT "WarehousePrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePrice" ADD CONSTRAINT "WarehousePrice_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePrice" ADD CONSTRAINT "WarehousePrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepreciationLog" ADD CONSTRAINT "DepreciationLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldDefinition" ADD CONSTRAINT "FieldDefinition_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRight" ADD CONSTRAINT "AccessRight_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNode" ADD CONSTRAINT "WorkflowNode_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsRule" ADD CONSTRAINT "TdsRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsLedgerMapping" ADD CONSTRAINT "TdsLedgerMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsLedgerMapping" ADD CONSTRAINT "TdsLedgerMapping_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "TdsRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsLedgerMapping" ADD CONSTRAINT "TdsLedgerMapping_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsTransaction" ADD CONSTRAINT "TdsTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsTransaction" ADD CONSTRAINT "TdsTransaction_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsTransaction" ADD CONSTRAINT "TdsTransaction_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsTransaction" ADD CONSTRAINT "TdsTransaction_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "TdsRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsTransaction" ADD CONSTRAINT "TdsTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TdsTransaction" ADD CONSTRAINT "TdsTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyBatch" ADD CONSTRAINT "PharmacyBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyBatch" ADD CONSTRAINT "PharmacyBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQ" ADD CONSTRAINT "BOQ_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQ" ADD CONSTRAINT "BOQ_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BOQItem" ADD CONSTRAINT "BOQItem_boqId_fkey" FOREIGN KEY ("boqId") REFERENCES "BOQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInventory" ADD CONSTRAINT "SiteInventory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInventory" ADD CONSTRAINT "SiteInventory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInventory" ADD CONSTRAINT "SiteInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInventory" ADD CONSTRAINT "SiteInventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionSchedule" ADD CONSTRAINT "RetentionSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionSchedule" ADD CONSTRAINT "RetentionSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteLog" ADD CONSTRAINT "RouteLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteLog" ADD CONSTRAINT "RouteLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSchedule" ADD CONSTRAINT "MaintenanceSchedule_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteBenchmark" ADD CONSTRAINT "RouteBenchmark_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanInterestSlab" ADD CONSTRAINT "LoanInterestSlab_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanInterestSlab" ADD CONSTRAINT "LoanInterestSlab_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EMISchedule" ADD CONSTRAINT "EMISchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EMISchedule" ADD CONSTRAINT "EMISchedule_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EMISchedule" ADD CONSTRAINT "EMISchedule_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestAccrual" ADD CONSTRAINT "InterestAccrual_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestAccrual" ADD CONSTRAINT "InterestAccrual_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestAccrual" ADD CONSTRAINT "InterestAccrual_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KYCRecord" ADD CONSTRAINT "KYCRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KYCRecord" ADD CONSTRAINT "KYCRecord_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementLine" ADD CONSTRAINT "BankStatementLine_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "BankStatement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES "BankStatementLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HsnMaster" ADD CONSTRAINT "HsnMaster_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

