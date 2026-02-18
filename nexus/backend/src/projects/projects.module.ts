import { Module } from '@nestjs/common';
import { ProjectService } from './projects.service';
import { ProjectController } from './projects.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [PrismaModule, SystemModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
