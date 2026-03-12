import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { SuperAdminService } from '../services/super-admin.service';
import { AllowIdentity } from '../../common/decorators/allow-identity.decorator';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@AllowIdentity() // Super Admin operates without tenant context
export class SuperAdminController {
  constructor(private readonly superAdmin: SuperAdminService) {}

  // ──────────────────── Tenant Management ────────────────────

  @Get('tenants')
  async listTenants(
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.superAdmin.listAllTenants({ plan, status, search });
  }

  @Get('tenants/:id')
  async getTenantDetail(@Param('id') id: string) {
    return this.superAdmin.getTenantDetail(id);
  }

  @Patch('tenants/:id/plan')
  async updatePlan(@Param('id') id: string, @Body('plan') plan: string) {
    return this.superAdmin.updateTenantPlan(id, plan);
  }

  @Patch('tenants/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    return this.superAdmin.updateTenantStatus(id, status, reason);
  }

  @Delete('tenants/:id')
  async deleteTenant(@Param('id') id: string) {
    // Soft-delete: suspend instead of hard delete
    return this.superAdmin.updateTenantStatus(
      id,
      'Suspended',
      'Deleted by Super Admin',
    );
  }

  // ──────────────────── User Management ────────────────────

  @Patch('users/:id/profile')
  async updateUserProfile(
    @Param('id') id: string,
    @Body() body: { fullName?: string; email?: string },
  ) {
    return this.superAdmin.updateUserProfile(id, body);
  }

  @Post('users/:id/reset-password')
  async resetPassword(@Param('id') id: string) {
    return this.superAdmin.resetUserPassword(id);
  }

  @Patch('users/:id/block')
  async toggleUserBlock(
    @Param('id') id: string,
    @Body('block') block: boolean,
  ) {
    return this.superAdmin.toggleUserBlock(id, block);
  }

  // ──────────────────── Plan Stats ────────────────────

  @Get('stats')
  async getStats() {
    return this.superAdmin.getPlanStats();
  }

  // ──────────────────── Module Access Control ────────────────────

  @Get('tenants/:id/modules')
  async getTenantModules(@Param('id') id: string) {
    return this.superAdmin.getTenantModules(id);
  }

  @Patch('tenants/:id/modules')
  async updateTenantModules(
    @Param('id') id: string,
    @Body('modules') modules: string[],
  ) {
    return this.superAdmin.updateTenantModules(id, modules);
  }
}
