import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AiService } from '../services/ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('analyze/:modelName')
  @Roles(Role.Owner)
  analyze(@Param('modelName') modelName: string) {
    return this.aiService.analyzeModel(modelName);
  }

  @Get('inventory-forecast')
  @Roles(Role.Owner)
  getInventoryForecast(@Req() req: AuthenticatedRequest) {
    return this.aiService.getInventoryForecast(req.user.tenantId as string);
  }
}
