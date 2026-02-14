import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CollaborationService } from '../services/collaboration.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('kernel/collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get('comments/:type/:id')
  async getComments(@Param('type') type: string, @Param('id') id: string) {
    return this.collaborationService.getComments(type, id);
  }

  @Post('comments')
  async addComment(@Request() req: any, @Body() body: any) {
    return this.collaborationService.addComment(req.user.tenantId, req.user.userId, body);
  }

  @Delete('comments/:id')
  async deleteComment(@Request() req: any, @Param('id') id: string) {
    return this.collaborationService.deleteComment(id, req.user.tenantId);
  }
}
