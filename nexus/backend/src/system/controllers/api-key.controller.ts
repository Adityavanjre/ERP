import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiKeyService } from '../services/api-key.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

@Controller('system/api')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get('keys')
  @Scopes('read:nexus')
  async getKeys(@Request() req: any) {
    return this.apiKeyService.getKeys(req.user.tenantId);
  }

  @Post('keys')
  @Scopes('write:nexus')
  async generateKey(@Request() req: any, @Body() body: { name: string; scopes: string[]; quotaLimit?: number }) {
    return this.apiKeyService.generateKey(req.user.tenantId, body.name, body.scopes, { quotaLimit: body.quotaLimit });
  }

  @Delete('keys/:id')
  @Scopes('admin:nexus')
  async revokeKey(@Request() req: any, @Param('id') id: string) {
    return this.apiKeyService.revokeKey(id, req.user.tenantId);
  }
}
