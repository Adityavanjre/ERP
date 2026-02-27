import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WorkflowService } from '../services/workflow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkflowDto, WorkflowNodeDto } from '../dto/system.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('system/workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) { }

  @Get(':modelName')
  getWorkflows(@Param('modelName') modelName: string) {
    return this.workflowService.getWorkflowsByModel(modelName);
  }

  @Post()
  createWorkflow(@Body() data: WorkflowDto) {
    return this.workflowService.createWorkflow(data);
  }

  @Post(':id/nodes')
  addNode(@Param('id') id: string, @Body() node: WorkflowNodeDto) {
    return this.workflowService.addNode(id, node);
  }

  @Post(':id/transitions')
  addTransition(@Param('id') id: string, @Body() transition: any) {
    return this.workflowService.addTransition(id, transition);
  }
}
