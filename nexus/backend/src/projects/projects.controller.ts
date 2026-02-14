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
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ProjectStatus, TaskStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly collaboration: CollaborationService,
  ) {}

  @Post()
  createProject(@Req() req: any, @Body() dto: any) {
    return this.projectService.createProject(req.user.tenantId, dto);
  }

  @Get()
  getProjects(@Req() req: any) {
    return this.projectService.getProjects(req.user.tenantId);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.projectService.getProjectStats(req.user.tenantId);
  }

  @Get(':id')
  getProjectById(@Req() req: any, @Param('id') id: string) {
    return this.projectService.getProjectById(req.user.tenantId, id);
  }

  @Patch(':id')
  updateProject(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.projectService.updateProject(req.user.tenantId, id, dto);
  }

  // Tasks
  @Post('tasks')
  createTask(@Req() req: any, @Body() dto: any) {
    return this.projectService.createTask(req.user.tenantId, dto);
  }

  @Get('tasks/all')
  getTasks(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.projectService.getTasks(req.user.tenantId, projectId);
  }

  @Patch('tasks/:id/status')
  updateTaskStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: TaskStatus,
  ) {
    return this.projectService.updateTaskStatus(req.user.tenantId, id, status);
  }

  @Delete(':id')
  async deleteProject(@Req() req: any, @Param('id') id: string) {
    // 1. Cascade Deletion for Project Discussion
    await this.collaboration.deleteCommentsByResource(req.user.tenantId, 'Project', id);
    
    // 2. Perform actual deletion
    return (this.projectService as any).deleteProject(req.user.tenantId, id);
  }
}
