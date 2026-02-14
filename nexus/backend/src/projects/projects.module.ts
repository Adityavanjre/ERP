import { Module } from '@nestjs/common';
import { ProjectService } from './projects.service';
import { ProjectController } from './projects.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KernelModule } from '../kernel/kernel.module';

@Module({
  imports: [PrismaModule, KernelModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
