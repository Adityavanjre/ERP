import { Module } from '@nestjs/common';
import { RegistryService } from './services/registry.service';
import { OrmService } from './services/orm.service';
import { WorkflowService } from './services/workflow.service';
import { AiService } from './services/ai.service';
import { AuditService } from './services/audit.service';
import { BillingService } from './services/billing.service';
import { RegistryController } from './controllers/registry.controller';
import { StudioController } from './controllers/studio.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { AiController } from './controllers/ai.controller';
import { BillingController } from './controllers/billing.controller';
import { HealthController } from './controllers/health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SaasAnalyticsService } from './services/saas-analytics.service';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';
import { CollaborationService } from './services/collaboration.service';
import { CollaborationController } from './controllers/collaboration.controller';
import { ApiKeyService } from './services/api-key.service';
import { ApiKeyController } from './controllers/api-key.controller';
import { ForecastingService } from './services/forecasting.service';
import { B2BController } from './controllers/b2b.controller';
import { PluginManager } from './services/plugin.manager';
import { PluginController } from './controllers/plugin.controller';
import { MailService } from './services/mail.service';

import { KernelController } from './kernel.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    RegistryController,
    StudioController,
    WorkflowController,
    AiController,
    BillingController,
    HealthController,
    KernelController,
    SearchController,
    CollaborationController,
    ApiKeyController,
    B2BController,
    PluginController,
  ],
  providers: [
    RegistryService,
    OrmService,
    WorkflowService,
    AiService,
    AuditService,
    BillingService,
    SearchService,
    CollaborationService,
    ApiKeyService,
    ForecastingService,
    SaasAnalyticsService,
    PluginManager,
    MailService,
  ],
  exports: [
    RegistryService,
    OrmService,
    WorkflowService,
    AiService,
    AuditService,
    BillingService,
    SaasAnalyticsService,
    SearchService,
    CollaborationService,
    ApiKeyService,
    ForecastingService,
    PluginManager,
    MailService,
  ],
})
export class KernelModule {}
