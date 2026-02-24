import { Module } from '@nestjs/common';
import { ConstructionService } from './construction.service';
import { ConstructionController } from './construction.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
    imports: [PrismaModule, AccountingModule],
    controllers: [ConstructionController],
    providers: [ConstructionService],
    exports: [ConstructionService],
})
export class ConstructionModule { }
