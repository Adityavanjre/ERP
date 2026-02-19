import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CollaborationService } from '../services/collaboration.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(), // Store in memory to stream to Cloudinary
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|csv|txt)$/)) {
        return callback(new BadRequestException('Only image, PDF, and office document files are allowed!'), false);
      }
      callback(null, true);
    },
  }))
  async uploadFile(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    // Upload to Cloudinary
    const result = await this.cloudinaryService.uploadFile(file);
    
    return {
      url: result.secure_url,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  @Get('comments/:type/:id')
  async getComments(@Request() req: any, @Param('type') type: string, @Param('id') id: string) {
    return this.collaborationService.getComments(req.user.tenantId, type, id);
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
