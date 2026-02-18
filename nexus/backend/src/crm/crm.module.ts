import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [PrismaModule, SystemModule],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
