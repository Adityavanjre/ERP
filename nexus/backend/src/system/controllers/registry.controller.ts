import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { RegistryService } from '../services/registry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@UseGuards(JwtAuthGuard)
@Controller(['system/apps', 'kernel/apps'])
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  @Get()
  getAllApps(@Req() req: AuthenticatedRequest) {
    return this.registryService.getAllApps(req.user.tenantId as string);
  }

  @Get('installed')
  getInstalledApps(@Req() req: AuthenticatedRequest) {
    return this.registryService.getInstalledApps(req.user.tenantId as string);
  }

  @Post(':name/install')
  installApp(
    @Param('name') name: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.registryService.installApp(name, req.user.tenantId as string);
  }

  @Post(':name/uninstall')
  uninstallApp(
    @Param('name') name: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.registryService.uninstallApp(name, req.user.tenantId as string);
  }

  @Post('preset')
  applyPreset(
    @Body('type') type: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.registryService.applyIndustryPreset(type, req.user.tenantId as string);
  }
}
