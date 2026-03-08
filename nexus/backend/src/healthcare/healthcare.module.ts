import { Module } from '@nestjs/common';
import { HealthcareService } from './healthcare.service';
import { HealthcareController } from './healthcare.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [HealthcareController],
  providers: [HealthcareService],
  exports: [HealthcareService],
})
export class HealthcareModule {}
