import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RegistryService } from '../services/registry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kernel/apps')
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  @Get()
  getAllApps() {
    return this.registryService.getAllApps();
  }

  @Get('installed')
  getInstalledApps() {
    return this.registryService.getInstalledApps();
  }

  @Post(':name/install')
  installApp(@Param('name') name: string) {
    return this.registryService.installApp(name);
  }

  @Post(':name/uninstall')
  uninstallApp(@Param('name') name: string) {
    return this.registryService.uninstallApp(name);
  }

  @Post('preset')
  applyPreset(@Body('type') type: string) {
    return this.registryService.applyIndustryPreset(type);
  }
}
