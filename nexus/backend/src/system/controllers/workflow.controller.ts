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



import { WorkflowDto, WorkflowNodeDto } from '../dto/system.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@UseGuards(JwtAuthGuard, )
@Controller('system/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get(':modelName')
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
  createWorkflow(@Body() data: WorkflowDto, @Req() req: AuthenticatedRequest) {
    return this.workflowService.createWorkflow(
      req.user.tenantId as string,
      data,
    );
  }

  @Post(':id/nodes')
  addNode(
    @Param('id') id: string,
    @Body() node: WorkflowNodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.workflowService.addNode(req.user.tenantId as string, id, node);
  }

  @Post(':id/transitions')
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
