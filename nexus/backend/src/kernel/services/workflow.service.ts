import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(private prisma: PrismaService) {}

  async createWorkflow(data: { name: string; modelName: string }) {
    return this.prisma.workflowDefinition.create({
      data: {
        name: data.name,
        modelName: data.modelName,
        isActive: true,
      },
    });
  }

  async getWorkflowsByModel(modelName: string) {
    return this.prisma.workflowDefinition.findMany({
      where: { modelName },
      include: { nodes: true, transitions: true },
    });
  }

  async addNode(
    workflowId: string,
    node: { name: string; type: string; config?: any },
  ) {
    return this.prisma.workflowNode.create({
      data: {
        workflowId,
        name: node.name,
        type: node.type,
        config: node.config || {},
      },
    });
  }

  async addTransition(
    workflowId: string,
    transition: {
      fromNodeId: string;
      toNodeId: string;
      triggerType: string;
      label?: string;
      condition?: string;
    },
  ) {
    return this.prisma.workflowTransition.create({
      data: {
        workflowId,
        fromNodeId: transition.fromNodeId,
        toNodeId: transition.toNodeId,
        triggerType: transition.triggerType,
        label: transition.label,
        condition: transition.condition,
      },
    });
  }

  /**
   * Executes workflow logic for a specific record.
   * This would be called by the ORM service or an Event Interceptor.
   */
  async processTrigger(recordId: string, signal: string) {
    this.logger.log(
      `Processing workflow signal [${signal}] for record [${recordId}]`,
    );
    // Logic to find current state of record and find outgoing transitions that match signal
  }
}
