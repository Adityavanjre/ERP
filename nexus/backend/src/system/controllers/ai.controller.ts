import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AiService } from '../services/ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('analyze/:modelName')
  analyze(@Param('modelName') modelName: string) {
    return this.aiService.analyzeModel(modelName);
  }

  @Get('inventory-forecast')
  getInventoryForecast(@Req() req: any) {
    return this.aiService.getInventoryForecast(req.user.tenantId);
  }
}
