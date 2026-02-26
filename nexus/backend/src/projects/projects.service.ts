import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../system/services/audit.service';
import { ProjectStatus, TaskStatus, Priority } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService, private audit: AuditService) { }

  // --- Projects ---
  async createProject(tenantId: string, data: any) {
    const project = await this.prisma.project.create({
      data: { ...data, tenantId },
    });
    await this.audit.log({
      tenantId,
      action: 'CREATE',
      resource: 'Project',
      details: { id: project.id, name: project.name },
    });
    return project;
  }

  async getProjects(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProjectById(tenantId: string, id: string) {
    return this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async updateProject(tenantId: string, id: string, data: any) {
    return this.prisma.project.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  // --- Tasks ---
  async createTask(tenantId: string, data: any) {
    const task = await this.prisma.task.create({
      data: { ...data, tenantId },
    });
    await this.audit.log({
      tenantId,
      action: 'CREATE',
      resource: 'Task',
      details: { id: task.id, title: task.title, projectId: task.projectId },
    });
    return task;
  }

  async getTasks(tenantId: string, projectId?: string) {
    return this.prisma.task.findMany({
      where: {
        tenantId,
        ...(projectId ? { projectId } : {}),
      },
      include: { project: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTaskStatus(tenantId: string, id: string, status: TaskStatus) {
    const result = await this.prisma.task.updateMany({
      where: { id, tenantId },
      data: { status },
    });
    await this.audit.log({
      tenantId,
      action: 'UPDATE_STATUS',
      resource: 'Task',
      details: { id, status },
    });
    return result;
  }

  async getProjectStats(tenantId: string) {
    const [projectCount, taskCount, activeProjects] = await Promise.all([
      this.prisma.project.count({ where: { tenantId } }),
      this.prisma.task.count({ where: { tenantId } }),
      this.prisma.project.count({
        where: { tenantId, status: ProjectStatus.Active },
      }),
    ]);

    return {
      projectCount,
      taskCount,
      activeProjects,
    };
  }
  async deleteProject(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!project) throw new Error('Project not found');

    await this.audit.log({
      tenantId,
      action: 'DELETE',
      resource: 'Project',
      details: { id, name: project.name },
    });

    return this.prisma.project.updateMany({
      where: { id, tenantId },
      data: { status: 'Cancelled' as ProjectStatus },
    });
  }
}
