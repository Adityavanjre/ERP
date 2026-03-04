import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) { }

  async globalSearch(tenantId: string, query: string) {
    if (!query || query.length < 2) return [];

    const [products, customers, invoices, employees, machines] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          tenantId,
          isDeleted: false,
          OR: [{ name: { contains: query } }, { sku: { contains: query } }],
        },
        take: 10,
        select: { id: true, name: true, sku: true },
      }),
      this.prisma.customer.findMany({
        where: {
          tenantId,
          isDeleted: false,
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { company: { contains: query } },
          ],
        },
        take: 10,
        select: { id: true, firstName: true, lastName: true, company: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          tenantId,
          invoiceNumber: { contains: query },
        },
        take: 10,
        select: { id: true, invoiceNumber: true, totalAmount: true },
      }),
      this.prisma.employee.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { employeeId: { contains: query } },
          ],
        },
        take: 10,
        select: { id: true, firstName: true, lastName: true, employeeId: true },
      }),
      this.prisma.machine.findMany({
        where: {
          tenantId,
          OR: [{ name: { contains: query } }, { code: { contains: query } }],
        },
        take: 10,
        select: { id: true, name: true, code: true },
      }),
    ]);

    const results: any[] = [];

    products.forEach((p) =>
      results.push({
        type: 'Product',
        title: p.name,
        subtitle: `SKU: ${p.sku}`,
        path: `/inventory?search=${p.sku}`,
        icon: 'Package',
      }),
    );

    customers.forEach((c) =>
      results.push({
        type: 'Customer',
        title: `${c.firstName} ${c.lastName || ''}`.trim() || c.company,
        subtitle: c.company || 'Individual',
        path: `/crm/${c.id}`,
        icon: 'Users',
      }),
    );

    invoices.forEach((i) =>
      results.push({
        type: 'Invoice',
        title: `Invoice #${i.invoiceNumber}`,
        subtitle: `Amount: ₹${Number(i.totalAmount).toLocaleString()}`,
        path: `/invoice/${i.id}`,
        icon: 'FileText',
      }),
    );

    employees.forEach((e) =>
      results.push({
        type: 'Employee',
        title: `${e.firstName} ${e.lastName}`,
        subtitle: `ID: ${e.employeeId}`,
        path: `/hr/employees/${e.id}`,
        icon: 'UserCheck',
      }),
    );

    machines.forEach((m) =>
      results.push({
        type: 'Machine',
        title: m.name,
        subtitle: `Code: ${m.code}`,
        path: `/manufacturing/machines/${m.id}`,
        icon: 'Settings',
      }),
    );

    return results;
  }
}
