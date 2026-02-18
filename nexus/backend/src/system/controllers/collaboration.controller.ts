import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CollaborationService } from '../services/collaboration.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('system/collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
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
    const fileUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/${file.filename}`;
    return { url: fileUrl, filename: file.filename, originalName: file.originalname, mimetype: file.mimetype };
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
