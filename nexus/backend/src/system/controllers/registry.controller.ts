import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RegistryService } from '../services/registry.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system/apps')
export class RegistryController {
  constructor(private readonly registryService: RegistryService) { }

  @Get()
  @Roles(Role.Owner)
  getAllApps() {
    return this.registryService.getAllApps();
  }

  @Get('installed')
  @Roles(Role.Owner)
  getInstalledApps() {
    return this.registryService.getInstalledApps();
  }

  @Post(':name/install')
  @Roles(Role.Owner)
  installApp(@Param('name') name: string) {
    return this.registryService.installApp(name);
  }

  @Post(':name/uninstall')
  @Roles(Role.Owner)
  uninstallApp(@Param('name') name: string) {
    return this.registryService.uninstallApp(name);
  }

  @Post('preset')
  @Roles(Role.Owner)
  applyPreset(@Body('type') type: string) {
    return this.registryService.applyIndustryPreset(type);
  }
}
