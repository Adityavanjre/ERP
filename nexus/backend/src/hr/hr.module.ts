import { Module } from '@nestjs/common';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [PrismaModule, SystemModule],
  controllers: [HrController],
  providers: [HrService],
})
export class HrModule {}
