import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Scopes } from '../../common/decorators/scopes.decorator';

@Controller('system/api')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) { }

  @Get('keys')
  @Roles(Role.Owner)
  @Scopes('read:nexus')
  async getKeys(@Request() req: any) {
    return this.apiKeyService.getKeys(req.user.tenantId);
  }

  @Post('keys')
  @Roles(Role.Owner)
  @Scopes('write:nexus')
  async generateKey(@Request() req: any, @Body() body: { name: string; scopes: string[]; quotaLimit?: number }) {
    return this.apiKeyService.generateKey(req.user.tenantId, body.name, body.scopes, { quotaLimit: body.quotaLimit });
  }

  @Delete('keys/:id')
  @Roles(Role.Owner)
  @Scopes('admin:nexus')
  async revokeKey(@Request() req: any, @Param('id') id: string) {
    return this.apiKeyService.revokeKey(id, req.user.tenantId);
  }
}
