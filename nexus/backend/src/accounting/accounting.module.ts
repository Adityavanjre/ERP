import { Module, forwardRef } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemModule } from '../system/system.module';
import { LedgerModule } from './ledger.module';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { TallyService } from './services/tally-export.service';
import { CreditNoteService } from './services/credit-note.service';
import { DebitNoteService } from './services/debit-note.service';
import { FixedAssetService } from './services/fixed-asset.service';
import { TdsService } from './services/tds.service';
import { TdsController } from './controllers/tds.controller';
import { BrsService } from './services/brs.service';
import { BrsController } from './controllers/brs.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { EWayBillService } from './services/eway-bill.service';
import { Gstr1ExportService } from './services/gstr1-export.service';
import { OnboardingService } from './services/onboarding.service';
import { ReportingService } from './services/reporting.service';


@Module({
  imports: [PrismaModule, SystemModule, LedgerModule, forwardRef(() => InventoryModule)],
  controllers: [AccountingController, TdsController, BrsController],
  providers: [
    AccountingService,
    InvoiceService,
    PaymentService,
    TallyService,
    CreditNoteService,
    DebitNoteService,
    FixedAssetService,
    TdsService,
    BrsService,
    EWayBillService,
    Gstr1ExportService,
    OnboardingService,
    ReportingService,
  ],

  exports: [
    AccountingService,
    InvoiceService,
    PaymentService,
    TallyService,
    CreditNoteService,
    DebitNoteService,
    FixedAssetService,
    TdsService,
    BrsService,
    EWayBillService,
    Gstr1ExportService,
    OnboardingService,
    ReportingService,
  ],

})
export class AccountingModule { }
