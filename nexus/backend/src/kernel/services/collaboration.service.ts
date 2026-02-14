import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getComments(resourceType: string, resourceId: string) {
    return this.prisma.comment.findMany({
      where: { resourceType, resourceId },
      orderBy: { createdAt: 'desc' },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        }
      }
    });
  }

  async addComment(
    tenantId: string,
    userId: string,
    data: { resourceType: string; resourceId: string; content: string; parentId?: string },
  ) {
    this.logger.log(`Klypso Ion: Adding comment to [${data.resourceType}:${data.resourceId}]`);
    const comment = await this.prisma.comment.create({
      data: {
        tenantId,
        userId,
        content: data.content,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        parentId: data.parentId,
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'COMMENT_ADDED',
      resource: `${data.resourceType}:${data.resourceId}`,
      details: { commentId: comment.id, hasParent: !!data.parentId },
    });

    return comment;
  }

  async deleteComment(id: string, tenantId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id, tenantId },
      select: { resourceType: true, resourceId: true },
    });

    if (comment) {
      await this.audit.log({
        tenantId,
        action: 'COMMENT_DELETED',
        resource: `${comment.resourceType}:${comment.resourceId}`,
        details: { commentId: id },
      });
    }

    return this.prisma.comment.delete({
      where: { id, tenantId },
    });
  }

  async deleteCommentsByResource(tenantId: string, resourceType: string, resourceId: string) {
    this.logger.log(`Klypso Ion: Cleaning up discussion for [${resourceType}:${resourceId}]`);
    return this.prisma.comment.deleteMany({
      where: { tenantId, resourceType, resourceId },
    });
  }
}
