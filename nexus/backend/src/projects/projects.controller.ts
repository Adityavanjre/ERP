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
import { CollaborationService } from '../kernel/services/collaboration.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ProjectStatus, TaskStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AuditInterceptor)
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly collaboration: CollaborationService,
  ) {}

  @Post()
  @Permissions(Permission.MANAGE_USERS)
  create(@Req() req: any, @Body() data: any) {
    return this.projectService.createProject(req.user.tenantId, data);
  }

  @Get()
  @Permissions(Permission.VIEW_PRODUCTS)
  findAll(@Req() req: any) {
    return this.projectService.getProjects(req.user.tenantId);
  }

  @Get('stats')
  @Permissions(Permission.VIEW_REPORTS)
  getStats(@Req() req: any) {
    return this.projectService.getProjectStats(req.user.tenantId);
  }

  @Get(':id')
  @Permissions(Permission.VIEW_PRODUCTS)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.projectService.getProjectById(req.user.tenantId, id);
  }

  @Patch(':id')
  @Permissions(Permission.MANAGE_USERS)
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.projectService.updateProject(req.user.tenantId, id, data);
  }

  // Tasks
  @Post(':id/tasks')
  @Permissions(Permission.ADJUST_STOCK) // Operational task management
  createTask(@Req() req: any, @Param('id') projectId: string, @Body() dto: any) {
    return this.projectService.createTask(req.user.tenantId, { ...dto, projectId });
  }

  @Get('tasks/all')
  @Permissions(Permission.VIEW_PRODUCTS)
  getTasks(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.projectService.getTasks(req.user.tenantId, projectId);
  }

  @Patch('tasks/:taskId/status')
  @Permissions(Permission.ADJUST_STOCK)
  updateTaskStatus(
    @Req() req: any,
    @Param('taskId') taskId: string,
    @Body('status') status: TaskStatus,
  ) {
    return this.projectService.updateTaskStatus(req.user.tenantId, taskId, status);
  }

  @Delete(':id')
  async deleteProject(@Req() req: any, @Param('id') id: string) {
    // 1. Cascade Deletion for Project Discussion
    await this.collaboration.deleteCommentsByResource(req.user.tenantId, 'Project', id);
    
    // 2. Perform actual deletion
    return this.projectService.deleteProject(req.user.tenantId, id);
  }
}
