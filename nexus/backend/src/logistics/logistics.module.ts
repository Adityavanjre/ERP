import { Module } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { LogisticsController } from './logistics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
    imports: [PrismaModule, AccountingModule],
    controllers: [LogisticsController],
    providers: [LogisticsService],
    exports: [LogisticsService],
})
export class LogisticsModule { }
