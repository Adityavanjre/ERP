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
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { LeaveStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // Departments
  @Post('departments')
  createDept(@Req() req: any, @Body() dto: any) {
    return this.hrService.createDepartment(req.user.tenantId, dto);
  }

  @Get('departments')
  getDepts(@Req() req: any) {
    return this.hrService.getDepartments(req.user.tenantId);
  }

  // Employees
  @Post('employees')
  createEmployee(@Req() req: any, @Body() dto: any) {
    return this.hrService.createEmployee(req.user.tenantId, dto);
  }

  @Get('employees')
  getEmployees(@Req() req: any) {
    return this.hrService.getEmployees(req.user.tenantId);
  }

  // Leaves
  @Post('leaves')
  requestLeave(@Body() dto: any) {
    return this.hrService.requestLeave(dto);
  }

  @Get('leaves')
  getLeaves(@Req() req: any) {
    return this.hrService.getLeaves(req.user.tenantId);
  }

  @Patch('leaves/:id/status')
  updateLeaveStatus(
    @Param('id') id: string,
    @Body('status') status: LeaveStatus,
  ) {
    return this.hrService.updateLeaveStatus(id, status);
  }

  // Payroll
  @Post('payroll')
  generatePayroll(@Body() dto: any) {
    return this.hrService.generatePayroll(dto);
  }

  @Get('payroll')
  getPayrolls(@Req() req: any) {
    return this.hrService.getPayrolls(req.user.tenantId);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.hrService.getHrStats(req.user.tenantId);
  }
}
