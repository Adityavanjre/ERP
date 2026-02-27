import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../system/services/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { EmployeeStatus, LeaveStatus, PayrollStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountSelectors } from '../accounting/constants/account-names';

@Injectable()
export class HrService {
  private readonly logger = new Logger(HrService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private accounting: AccountingService,
  ) { }

  // --- Departments ---
  async createDepartment(tenantId: string, data: any) {
    const dept = await this.prisma.department.create({
      data: { ...data, tenantId },
    });
    await this.audit.log({
      tenantId,
      action: 'CREATE',
      resource: 'Department',
      details: { id: dept.id, name: dept.name },
    });
    return dept;
  }

  async getDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { _count: { select: { employees: true } } },
    });
  }

  // --- Employees ---
  async createEmployee(tenantId: string, data: any) {
    const emp = await this.prisma.employee.create({
      data: { ...data, tenantId },
      include: { department: true },
    });
    await this.audit.log({
      tenantId,
      action: 'CREATE',
      resource: 'Employee',
      details: { id: emp.id, employeeId: emp.employeeId, name: emp.firstName },
    });
    return emp;
  }

  async getEmployees(tenantId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId },
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Leave Management ---
  async requestLeave(tenantId: string, data: any) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId },
    });
    if (!employee) throw new Error('Employee not found in this tenant context');

    const leave = await this.prisma.leave.create({
      data: { ...data, tenantId },
      include: { employee: true },
    });
    await this.audit.log({
      tenantId,
      action: 'CREATE',
      resource: 'Leave',
      details: { id: leave.id, type: leave.type, employeeId: leave.employeeId },
    });
    return leave;
  }

  async getLeaves(tenantId: string) {
    return this.prisma.leave.findMany({
      where: {
        employee: { tenantId },
      },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLeaveStatus(tenantId: string, id: string, status: LeaveStatus) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, employee: { tenantId } },
      include: { employee: true },
    });
    if (!leave) throw new Error('Leave record not found in this tenant');

    await this.prisma.leave.updateMany({
      where: { id, employee: { tenantId } },
      data: { status },
    });

    await this.audit.log({
      tenantId,
      action: 'UPDATE_STATUS',
      resource: 'Leave',
      details: { id, status, employeeId: leave.employeeId },
    });
    return { ...leave, status };
  }

  // --- Payroll ---
  async generatePayroll(tenantId: string, data: any) {
    const { employeeId, bonuses, deductions, basicSalary } = data;

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) throw new BadRequestException('Employee not found in this tenant context');

    // Verify necessary accounts exist BEFORE creating payroll record to ensure audit trail
    const salaryAccount = await this.prisma.account.findFirst({
      where: { tenantId, name: { in: AccountSelectors.SALARY } },
    });
    const cashAccount = await this.prisma.account.findFirst({
      where: { tenantId, name: { in: AccountSelectors.CASH_BANK } },
    });

    if (!salaryAccount || !cashAccount) {
      throw new BadRequestException(`Audit Block: Payroll cannot be generated because Salary Expense or Cash/Bank account is missing in Chart of Accounts.`);
    }

    // IDEMPOTENCY GUARD: prevent double salary disbursement for the same period.
    // A unique DB constraint (employeeId + periodStart + periodEnd) is the ultimate guard,
    // but this application-layer check provides a meaningful error message.
    const existingPayroll = await this.prisma.payroll.findFirst({
      where: {
        employee: { tenantId },
        employeeId: data.employeeId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
    });
    if (existingPayroll) {
      throw new BadRequestException(
        `Payroll Integrity Block: A payroll record already exists for Employee ${employeeId} ` +
        `for the period ${data.periodStart} – ${data.periodEnd}. ` +
        `Use a reversal entry to correct errors. Reference ID: ${existingPayroll.id}`,
      );
    }

    const netPay = Number(basicSalary) + Number(bonuses) - Number(deductions);

    const payroll = await this.prisma.payroll.create({
      data: {
        ...data,
        tenantId,
        netPay,
      },
      include: { employee: true },
    });

    await this.audit.log({
      tenantId,
      action: 'GENERATE',
      resource: 'Payroll',
      details: { id: payroll.id, employeeId, netPay },
    });

    try {
      await this.accounting.createJournalEntry(tenantId, {
        date: new Date().toISOString(),
        description: `Payroll: ${employee.firstName} ${employee.lastName} - ${data.periodStart} to ${data.periodEnd}`,
        reference: payroll.id,
        transactions: [
          { accountId: salaryAccount.id, type: 'Debit', amount: netPay, description: 'Salary Disbursement' },
          { accountId: cashAccount.id, type: 'Credit', amount: netPay, description: 'Salary Disbursement' },
        ],
      });
    } catch (journalErr) {
      this.logger.error(`Failed to post payroll journal for payroll ${payroll.id}`, journalErr);
      // Re-throw as BadRequest to alert the user even if record was made (or wrap in transaction)
      throw new BadRequestException(`Payroll journal posting failed: ${journalErr.message}. The record was created but financial posting failed.`);
    }

    return payroll;
  }

  async importEmployees(tenantId: string, csvContent: string) {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const results = { total: lines.length - 1, imported: 0, failed: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(',').map(c => c.trim());
      const data: any = {};
      headers.forEach((h, idx) => { data[h] = cols[idx]; });

      try {
        const firstName = data.firstName;
        const lastName = data.lastName || '';
        const email = data.email;
        const employeeId = data.employeeId || `EMP-${Date.now().toString().slice(-4)}-${i}`;

        if (!firstName || !email) throw new Error("First Name and Email are required");

        // Look up department by name if provided
        let departmentId = data.departmentId;
        if (data.departmentName && !departmentId) {
          const dept = await this.prisma.department.findFirst({ where: { tenantId, name: data.departmentName } });
          departmentId = dept?.id;
        }

        const existing = await this.prisma.employee.findFirst({
          where: { tenantId, OR: [{ email }, { employeeId }] }
        });

        if (existing) {
          await this.prisma.employee.update({
            where: { id: existing.id },
            data: {
              firstName,
              lastName,
              phone: data.phone || existing.phone,
              departmentId: departmentId || existing.departmentId,
              jobTitle: data.jobTitle || data.designation || existing.jobTitle,
              salary: data.basicSalary ? new Decimal(data.basicSalary) : existing.salary,
              status: (data.status as EmployeeStatus) || existing.status
            }
          });
        } else {
          await this.prisma.employee.create({
            data: {
              tenantId,
              firstName,
              lastName,
              email,
              phone: data.phone || '',
              employeeId,
              jobTitle: data.jobTitle || data.designation || 'Staff',
              departmentId,
              salary: new Decimal(data.basicSalary || data.salary || 0),
            }
          });
        }
        results.imported++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`Line ${i}: ${e.message}`);
      }
    }
    return results;
  }

  async getPayrolls(tenantId: string) {
    return this.prisma.payroll.findMany({
      where: {
        employee: { tenantId },
      },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHrStats(tenantId: string) {
    const activeEmployees = await this.prisma.employee.count({
      where: { tenantId, status: EmployeeStatus.Active },
    });

    const pendingLeaves = await this.prisma.leave.count({
      where: {
        employee: { tenantId },
        status: LeaveStatus.Pending,
      },
    });

    const totalPayroll = await this.prisma.payroll.aggregate({
      where: {
        employee: { tenantId },
        status: PayrollStatus.Paid,
      },
      _sum: { netPay: true },
    });

    return {
      activeEmployees,
      pendingLeaves,
      totalPayroll: totalPayroll._sum.netPay || 0,
    };
  }
}
