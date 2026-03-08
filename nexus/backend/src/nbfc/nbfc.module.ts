import { Module } from '@nestjs/common';
import { NbfcService } from './nbfc.service';
import { NbfcController } from './nbfc.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { SystemModule } from '../system/system.module';

@Module({
  imports: [SystemModule, PrismaModule, AccountingModule],
  controllers: [NbfcController],
  providers: [NbfcService],
  exports: [NbfcService],
})
export class NbfcModule {}
