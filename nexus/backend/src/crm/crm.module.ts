import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KernelModule } from '../kernel/kernel.module';

@Module({
  imports: [PrismaModule, KernelModule],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
