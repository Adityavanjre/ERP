import { Module } from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service';
import { ManufacturingController } from './manufacturing.controller';
import { MachineService } from './machine.service';
import { MachineController } from './machine.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoreDomainModule } from '../core-domain/core-domain.module';

@Module({
  imports: [PrismaModule, CoreDomainModule],
  controllers: [ManufacturingController, MachineController],
  providers: [ManufacturingService, MachineService],
})
export class ManufacturingModule { }
