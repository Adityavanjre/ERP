import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkflowService } from '../services/workflow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { WorkflowDto, WorkflowNodeDto } from '../dto/system.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get(':modelName')
  @Roles(Role.Owner)
  getWorkflows(
    @Param('modelName') modelName: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.workflowService.getWorkflowsByModel(
      req.user.tenantId as string,
      modelName,
    );
  }

  @Post()
  @Roles(Role.Owner, Role.Manager)
  createWorkflow(@Body() data: WorkflowDto, @Req() req: AuthenticatedRequest) {
    return this.workflowService.createWorkflow(
      req.user.tenantId as string,
      data,
    );
  }

  @Post(':id/nodes')
  @Roles(Role.Owner, Role.Manager)
  addNode(
    @Param('id') id: string,
    @Body() node: WorkflowNodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.workflowService.addNode(req.user.tenantId as string, id, node);
  }

  @Post(':id/transitions')
  @Roles(Role.Owner, Role.Manager)
  addTransition(
    @Param('id') id: string,
    @Body() transition: any,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.workflowService.addTransition(
      req.user.tenantId as string,
      id,
      transition,
    );
  }
}
