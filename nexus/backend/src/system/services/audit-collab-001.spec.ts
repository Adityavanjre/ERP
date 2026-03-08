
import { Test, TestingModule } from '@nestjs/testing';
import { CollaborationService } from './collaboration.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';
import { NotFoundException } from '@nestjs/common';
import { CollaborationGateway } from '../gateways/collaboration.gateway';

describe('CollaborationService: TEN-001 Audit', () => {
  let service: CollaborationService;
  let prisma: PrismaService;

  const mockPrisma = {
    comment: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAudit = {
    log: jest.fn(),
  };

  const mockGateway = {
    broadcastCommentAdded: jest.fn(),
    broadcastCommentDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: CollaborationGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<CollaborationService>(CollaborationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('deleteComment', () => {
    it('should throw NotFoundException if comment belongs to another tenant', async () => {
      const myTenantId = 'T-MINE';
      const commentId = 'C-OTHERS';

      // Simulate comment not found for THIS tenant
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      try {
        await service.deleteComment(commentId, myTenantId);
        throw new Error('Expected to throw but did not');
      } catch (e: any) {
        console.log('ACTUAL_ERROR_MESSAGE:', e.message);
        expect(e.message).toContain('not found or access denied');
      }
      
      expect(mockPrisma.comment.findFirst).toHaveBeenCalledWith({
        where: { id: commentId, tenantId: myTenantId },
        select: expect.any(Object),
      });
      expect(mockPrisma.comment.delete).not.toHaveBeenCalled();
    });

    it('should allow deletion if comment belongs to the same tenant', async () => {
      const tenantId = 'T-SAME';
      const commentId = 'C-ID';
      
      mockPrisma.comment.findFirst.mockResolvedValue({ 
        id: commentId, 
        tenantId,
        resourceType: 'Order',
        resourceId: 'O-1'
      });
      mockPrisma.comment.delete.mockResolvedValue({ id: commentId });

      await service.deleteComment(commentId, tenantId);

      expect(mockPrisma.comment.findFirst).toHaveBeenCalledWith({
        where: { id: commentId, tenantId },
        select: expect.any(Object),
      });
      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({
        where: { id: commentId },
      });
    });
  });
});
