import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { OrmService } from '../services/orm.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';



import { DefineModelDto } from '../dto/system.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@UseGuards(JwtAuthGuard, )
@Controller('system/studio')
export class StudioController {
  constructor(private readonly ormService: OrmService) {}

  @Post('models')
  defineModel(@Body() dto: DefineModelDto, @Req() req: AuthenticatedRequest) {
    return this.ormService.defineModel(
      req.user.tenantId as string,
      dto.appName,
      dto,
    );
  }

  @Get('records/:modelName')
  getRecords(
    @Req() req: AuthenticatedRequest,
    @Param('modelName') modelName: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ormService.findRecords(
      req.user.tenantId as string,
      modelName,
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Post('records/:modelName')
  createRecord(
    @Req() req: AuthenticatedRequest,
    @Param('modelName') modelName: string,
    @Body() data: Record<string, any>,
  ) {
    return this.ormService.createRecord(
      req.user.tenantId as string,
      modelName,
      data,
      req.user.isSuperAdmin ? 'SuperAdmin' : '',
    );
  }

  @Get('records/:modelName/:id')
  getRecord(
    @Req() req: AuthenticatedRequest,
    @Param('modelName') modelName: string,
    @Param('id') id: string,
  ) {
    return this.ormService.getRecord(
      req.user.tenantId as string,
      modelName,
      id,
    );
  }

  @Post('records/:modelName/:id')
  updateRecord(
    @Req() req: AuthenticatedRequest,
    @Param('modelName') modelName: string,
    @Param('id') id: string,
    @Body() data: Record<string, any>,
  ) {
    return this.ormService.updateRecord(
      req.user.tenantId as string,
      modelName,
      id,
      data,
      req.user.isSuperAdmin ? 'SuperAdmin' : '',
    );
  }

  @Delete('records/:modelName/:id')
  deleteRecord(
    @Req() req: AuthenticatedRequest,
    @Param('modelName') modelName: string,
    @Param('id') id: string,
  ) {
    return this.ormService.deleteRecord(
      req.user.tenantId as string,
      modelName,
      id,
      req.user.isSuperAdmin ? 'SuperAdmin' : '',
    );
  }
}
