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
  Req,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../common/interfaces/request.interface';
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
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.Owner, Role.Manager)
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.usersService.findAll(req.user.tenantId as string);
  }

  @Post()
  @Roles(Role.Owner, Role.Manager)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(req.user.tenantId as string, createUserDto);
  }

  @Patch(':id/role')
  @Roles(Role.Owner)
  async updateRole(
    @Req() req: AuthenticatedRequest,
    @Param('id') userId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(
      req.user.tenantId as string,
      userId,
      updateRoleDto,
    );
  }

  @Post(':id/reset-password')
  @Roles(Role.Owner)
  async resetPassword(
    @Req() req: AuthenticatedRequest,
    @Param('id') userId: string,
  ) {
    return this.usersService.resetPassword(req.user.tenantId as string, userId);
  }

  @Delete(':id')
  @Roles(Role.Owner)
  async remove(@Req() req: AuthenticatedRequest, @Param('id') userId: string) {
    return this.usersService.remove(req.user.tenantId as string, userId);
  }
}
