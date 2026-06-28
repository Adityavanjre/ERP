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

import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { LeaveStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { Module } from '../common/decorators/module.decorator';
import { MobileAction } from '../common/decorators/mobile-action.decorator';



@UseGuards(JwtAuthGuard,  PermissionsGuard)
@UseInterceptors(AuditInterceptor)
@Module('hr')
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // Departments
  @Post('departments')
  @Permissions(Permission.MANAGE_EMPLOYEES)
  createDept(@CurrentUser() user: any, @Body() dto: any) {
    return this.hrService.createDepartment(user.tenantId, dto);
  }

  @Get('departments')
  @Permissions(Permission.MANAGE_EMPLOYEES)
  getDepts(@CurrentUser() user: any) {
    return this.hrService.getDepartments(user.tenantId);
  }

  // Employees
  @Post('employees')
  @Permissions(Permission.MANAGE_EMPLOYEES)
  createEmployee(@CurrentUser() user: any, @Body() dto: any) {
    return this.hrService.createEmployee(user.tenantId, dto);
  }

  @Get('employees')
  @Permissions(Permission.MANAGE_EMPLOYEES)
  getEmployees(@CurrentUser() user: any) {
    return this.hrService.getEmployees(user.tenantId);
  }

  @Patch('employees/:id')
  @Permissions(Permission.MANAGE_EMPLOYEES)
  updateEmployee(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateEmployee(user.tenantId, id, dto);
  }

  @Post('import')
  @Permissions(Permission.MANAGE_EMPLOYEES)
  importEmployees(@CurrentUser() user: any, @Body() body: any) {
    const csvContent = body.csv || body;
    return this.hrService.importEmployees(
      user.tenantId,
      typeof csvContent === 'string' ? csvContent : '',
    );
  }

  // Leaves
  @Post('leaves')
  @Permissions(Permission.VIEW_PRODUCTS)
  requestLeave(@CurrentUser() user: any, @Body() dto: any) {
    return this.hrService.requestLeave(user.tenantId, dto);
  }

  @Get('leaves')
  @Permissions(Permission.MANAGE_EMPLOYEES)
  @MobileAction('VIEW_LEAVES')
  getLeaves(@CurrentUser() user: any) {
    return this.hrService.getLeaves(user.tenantId);
  }

  @Patch('leaves/:id/status')
  @Permissions(Permission.MANAGE_EMPLOYEES)
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
  @Permissions(Permission.VIEW_REPORTS)
  generatePayroll(@CurrentUser() user: any, @Body() dto: any) {
    return this.hrService.generatePayroll(user.tenantId, dto);
  }

  @Get('payroll')
  @Permissions(Permission.VIEW_REPORTS)
  getPayrolls(@CurrentUser() user: any) {
    return this.hrService.getPayrolls(user.tenantId);
  }

  @Get('stats')
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@CurrentUser() user: any) {
    return this.hrService.getHrStats(user.tenantId);
  }
}
