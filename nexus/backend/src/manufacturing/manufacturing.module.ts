import { Module } from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service';
import { ManufacturingController } from './manufacturing.controller';
import { MachineService } from './machine.service';
import { MachineController } from './machine.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KernelModule } from '../kernel/kernel.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, KernelModule, AccountingModule],
  controllers: [ManufacturingController, MachineController],
  providers: [ManufacturingService, MachineService],
})
export class ManufacturingModule {}
