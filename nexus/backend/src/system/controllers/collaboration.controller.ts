import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CollaborationService } from '../services/collaboration.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { validateFileMagicBytes, validateFileSize, ALLOWED_MIME_TYPES } from '../../common/utils/file-magic.util';

@Controller('collaboration')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollaborationController {
  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post('upload')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.Biller, Role.Storekeeper, Role.CA)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB hard limit at transport layer
  }))
  async uploadFile(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // SECURITY: Validate file by its actual binary content (magic bytes), not its filename.
    // A malicious actor can rename any executable to .jpg to bypass extension checks.
    validateFileSize(file, 5 * 1024 * 1024);
    validateFileMagicBytes(file, ALLOWED_MIME_TYPES.ALL);

    const result = await this.cloudinaryService.uploadFile(file);

    return {
      url: result.secure_url,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  @Get('comments/:type/:id')
  @Roles(Role.Owner)
  async getComments(@Request() req: any, @Param('type') type: string, @Param('id') id: string) {
    return this.collaborationService.getComments(req.user.tenantId, type, id);
  }

  @Post('comments')
  @Roles(Role.Owner, Role.Manager, Role.Accountant, Role.Biller, Role.Storekeeper, Role.CA)
  async addComment(@Request() req: any, @Body() body: any) {
    return this.collaborationService.addComment(req.user.tenantId, req.user.userId, body);
  }

  @Delete('comments/:id')
  @Roles(Role.Owner, Role.Manager)
  async deleteComment(@Request() req: any, @Param('id') id: string) {
    return this.collaborationService.deleteComment(id, req.user.tenantId);
  }
}
