import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AiService } from '../services/ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';



import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@UseGuards(JwtAuthGuard, )
@Controller('system/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('analyze/:modelName')
  analyze(@Param('modelName') modelName: string) {
    return this.aiService.analyzeModel(modelName);
  }

  @Get('inventory-forecast')
  getInventoryForecast(@Req() req: AuthenticatedRequest) {
    return this.aiService.getInventoryForecast(req.user.tenantId as string);
  }
}
