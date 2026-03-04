import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { LeaveStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { Module } from '../common/decorators/module.decorator';
import { MobileAction } from '../common/decorators/mobile-action.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
@Module('hr')
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) { }

  // Departments
  @Post('departments')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  createDept(@CurrentUser() user: any, @Body() dto: any) {
    return this.hrService.createDepartment(user.tenantId, dto);
  }

  @Get('departments')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS) // General operational view
  getDepts(@CurrentUser() user: any) {
    return this.hrService.getDepartments(user.tenantId);
  }

  // Employees
  @Post('employees')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  createEmployee(@CurrentUser() user: any, @Body() dto: any) {
    return this.hrService.createEmployee(user.tenantId, dto);
  }

  @Get('employees')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  getEmployees(@CurrentUser() user: any) {
    return this.hrService.getEmployees(user.tenantId);
  }

  @Post('import')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  importEmployees(@CurrentUser() user: any, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.hrService.importEmployees(
      user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  // Leaves
  @Post('leaves')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  requestLeave(@CurrentUser() user: any, @Body() dto: any) {
    return this.hrService.requestLeave(user.tenantId, dto);
  }

  @Get('leaves')
  @Roles(Role.Owner, Role.Manager, Role.Biller, Role.Storekeeper, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_PRODUCTS)
  @MobileAction('VIEW_LEAVES')
  getLeaves(@CurrentUser() user: any) {
    return this.hrService.getLeaves(user.tenantId);
  }

  @Patch('leaves/:id/status')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  @MobileAction('APPROVE_LEAVE')
  updateLeaveStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: any,
  ) {
    return this.hrService.updateLeaveStatus(user.tenantId, id, status);
  }

  // Payroll
  @Post('payroll')
  @Roles(Role.Owner, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  generatePayroll(@CurrentUser() user: any, @Body() dto: any) {
    return this.hrService.generatePayroll(user.tenantId, dto);
  }

  @Get('payroll')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getPayrolls(@CurrentUser() user: any) {
    return this.hrService.getPayrolls(user.tenantId);
  }

  @Get('stats')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@CurrentUser() user: any) {
    return this.hrService.getHrStats(user.tenantId);
  }
}
