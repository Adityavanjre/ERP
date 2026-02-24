
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateRoleDto } from './dto/users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MfaGuard } from '../common/guards/mfa.guard';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, MfaGuard)
@UseInterceptors(AuditInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @Roles(Role.Owner, Role.Manager)
  async findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Post()
  @Roles(Role.Owner, Role.Manager)
  async create(@Request() req: any, @Body() createUserDto: CreateUserDto) {
    return this.usersService.create(req.user.tenantId, createUserDto);
  }

  @Patch(':id/role')
  @Roles(Role.Owner)
  async updateRole(
    @Request() req: any,
    @Param('id') userId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(req.user.tenantId, userId, updateRoleDto);
  }

  @Post(':id/reset-password')
  @Roles(Role.Owner)
  async resetPassword(@Request() req: any, @Param('id') userId: string) {
    return this.usersService.resetPassword(req.user.tenantId, userId);
  }

  @Delete(':id')
  @Roles(Role.Owner)
  async remove(@Request() req: any, @Param('id') userId: string) {
    return this.usersService.remove(req.user.tenantId, userId);
  }
}
