import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../system/services/audit.service';
import { AccountingService } from '../accounting/accounting.service';
import { EmployeeStatus, LeaveStatus, PayrollStatus } from '@prisma/client';

@Injectable()
export class HrService {
  private readonly logger = new Logger(HrService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private accounting: AccountingService,
  ) {}

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
      data,
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
    if (!employee) throw new Error('Employee not found in this tenant context');

    const netPay = Number(basicSalary) + Number(bonuses) - Number(deductions);

    const payroll = await this.prisma.payroll.create({
      data: {
        ...data,
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

    // Post journal entry: Salary Expense Dr / Cash (or Bank) Cr
    try {
      const salaryAccount = await this.prisma.account.findFirst({
        where: { tenantId, name: { in: ['Salary Expense', 'Wages Expense', 'Payroll Expense'] } },
      });
      const cashAccount = await this.prisma.account.findFirst({
        where: { tenantId, name: { in: ['Cash', 'Bank'] } },
      });

      if (salaryAccount && cashAccount) {
        await this.accounting.createJournalEntry(tenantId, {
          date: new Date().toISOString(),
          description: `Payroll: ${employee.firstName} ${employee.lastName} - ${data.periodStart} to ${data.periodEnd}`,
          reference: payroll.id,
          transactions: [
            { accountId: salaryAccount.id, type: 'Debit', amount: netPay, description: 'Salary Disbursement' },
            { accountId: cashAccount.id, type: 'Credit', amount: netPay, description: 'Salary Disbursement' },
          ],
        });
      } else {
        this.logger.warn(`Payroll journal skipped for tenant ${tenantId}: Salary Expense or Cash account not found in COA.`);
      }
    } catch (journalErr) {
      this.logger.error(`Failed to post payroll journal for payroll ${payroll.id}`, journalErr);
      // Do NOT fail payroll creation if journal fails - log and continue
    }

    return payroll;
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
