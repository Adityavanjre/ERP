import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrmService } from '../services/orm.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DefineModelDto } from '../dto/system.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Owner, Role.Manager)
@Controller('system/studio')
export class StudioController {
  constructor(private readonly ormService: OrmService) { }

  @Post('models')
  defineModel(@Body() dto: DefineModelDto) {
    // Expected DTO: { appName, name, label, fields: [...] }
    return this.ormService.defineModel(dto.appName, dto);
  }

  @Get('records/:modelName')
  getRecords(@Req() req: any, @Param('modelName') modelName: string) {
    return this.ormService.findRecords(req.user.tenantId, modelName);
  }

  @Post('records/:modelName')
  createRecord(
    @Req() req: any,
    @Param('modelName') modelName: string,
    @Body() data: Record<string, any>,
  ) {
    return this.ormService.createRecord(req.user.tenantId, modelName, data);
  }

  @Get('records/:modelName/:id')
  getRecord(
    @Req() req: any,
    @Param('modelName') modelName: string,
    @Param('id') id: string,
  ) {
    return this.ormService.getRecord(req.user.tenantId, modelName, id);
  }

  @Post('records/:modelName/:id')
  updateRecord(
    @Req() req: any,
    @Param('modelName') modelName: string,
    @Param('id') id: string,
    @Body() data: Record<string, any>,
  ) {
    return this.ormService.updateRecord(req.user.tenantId, modelName, id, data);
  }
}
