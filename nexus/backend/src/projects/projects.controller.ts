import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ProjectService } from './projects.service';
import { CollaborationService } from '../system/services/collaboration.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permission } from '../common/constants/permissions';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { TaskStatus, Role } from '@prisma/client';
import { Module } from '../common/decorators/module.decorator';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateTaskDto,
} from './dto/projects.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
@Module('project')
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly collaboration: CollaborationService,
  ) {}

  @Post()
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  create(@Req() req: AuthenticatedRequest, @Body() data: CreateProjectDto) {
    return this.projectService.createProject(req.user.tenantId as string, data);
  }

  @Get()
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  @Permissions(Permission.VIEW_PRODUCTS)
  findAll(@Req() req: AuthenticatedRequest) {
    return this.projectService.getProjects(req.user.tenantId as string);
  }

  @Get('stats')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.CA)
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@Req() req: AuthenticatedRequest) {
    return this.projectService.getProjectStats(req.user.tenantId as string);
  }

  @Get(':id')
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  @Permissions(Permission.VIEW_PRODUCTS)
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectService.getProjectById(req.user.tenantId as string, id);
  }

  @Patch(':id')
  @Roles(Role.Owner, Role.Manager)
  @Permissions(Permission.MANAGE_USERS)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(
      req.user.tenantId as string,
      id,
      data,
    );
  }

  @Post(':id/tasks')
  @Roles(Role.Owner, Role.Manager, Role.Biller)
  @Permissions(Permission.ADJUST_STOCK)
  createTask(
    @Req() req: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.projectService.createTask(req.user.tenantId as string, {
      ...dto,
      projectId,
    });
  }

  @Get('tasks/all')
  @Roles(
    Role.Owner,
    Role.Manager,
    Role.Biller,
    Role.Storekeeper,
    Role.Accountant,
    Role.CA,
  )
  @Permissions(Permission.VIEW_PRODUCTS)
  getTasks(
    @Req() req: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ) {
    return this.projectService.getTasks(req.user.tenantId as string, projectId);
  }

  @Patch('tasks/:taskId/status')
  @Roles(Role.Owner, Role.Manager, Role.Biller)
  @Permissions(Permission.ADJUST_STOCK)
  updateTaskStatus(
    @Req() req: AuthenticatedRequest,
    @Param('taskId') taskId: string,
    @Body('status') status: TaskStatus,
  ) {
    return this.projectService.updateTaskStatus(
      req.user.tenantId as string,
      taskId,
      status,
    );
  }

  @Delete(':id')
  @Roles(Role.Owner, Role.Manager)
  async deleteProject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.collaboration.deleteCommentsByResource(
      req.user.tenantId as string,
      'Project',
      id,
    );
    return this.projectService.deleteProject(req.user.tenantId as string, id);
  }
}
