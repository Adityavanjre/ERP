import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../kernel/services/audit.service';
import { EmployeeStatus, LeaveStatus, PayrollStatus } from '@prisma/client';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

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
  async requestLeave(data: any) {
    const leave = await this.prisma.leave.create({
      data,
      include: { employee: true },
    });
    await this.audit.log({
      tenantId: leave.employee.tenantId,
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

  async updateLeaveStatus(id: string, status: LeaveStatus) {
    const leave = await this.prisma.leave.update({
      where: { id },
      data: { status },
      include: { employee: true },
    });
    await this.audit.log({
      tenantId: leave.employee.tenantId,
      action: 'UPDATE_STATUS',
      resource: 'Leave',
      details: { id, status, employeeId: leave.employeeId },
    });
    return leave;
  }

  // --- Payroll ---
  async generatePayroll(data: any) {
    const { employeeId, bonuses, deductions, basicSalary } = data;
    const netPay = Number(basicSalary) + Number(bonuses) - Number(deductions);

    const payroll = await this.prisma.payroll.create({
      data: {
        ...data,
        netPay,
      },
      include: { employee: true },
    });

    await this.audit.log({
      tenantId: payroll.employee.tenantId,
      action: 'GENERATE',
      resource: 'Payroll',
      details: { id: payroll.id, employeeId, netPay },
    });

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
