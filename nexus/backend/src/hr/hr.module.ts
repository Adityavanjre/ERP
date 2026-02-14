import { Module } from '@nestjs/common';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KernelModule } from '../kernel/kernel.module';

@Module({
  imports: [PrismaModule, KernelModule],
  controllers: [HrController],
  providers: [HrService],
})
export class HrModule {}
