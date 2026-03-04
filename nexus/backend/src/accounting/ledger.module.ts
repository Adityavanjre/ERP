import { Module, Global } from '@nestjs/common';
import { LedgerService } from './services/ledger.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [LedgerService],
    exports: [LedgerService],
})
export class LedgerModule { }
