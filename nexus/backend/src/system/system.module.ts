import { Module, Global } from '@nestjs/common';
import { RegistryService } from './services/registry.service';
import { AutomationWorkerService } from './services/automation-worker.service';
import { AiService } from './services/ai.service';
import { AuditService } from './services/audit.service';
import { AuditVerificationService } from './services/audit-verification.service';
import { BillingService } from './services/billing.service';
import { RegistryController } from './controllers/registry.controller';
import { AiController } from './controllers/ai.controller';
import { BillingController } from './controllers/billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SaasAnalyticsService } from './services/saas-analytics.service';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';
import { CollaborationService } from './services/collaboration.service';
import { CloudinaryService } from './services/cloudinary.service';
import { CollaborationController } from './controllers/collaboration.controller';
import { ApiKeyService } from './services/api-key.service';
import { ApiKeyController } from './controllers/api-key.controller';
import { ForecastingService } from './services/forecasting.service';
import { B2BController } from './controllers/b2b.controller';
import { PluginManager } from './services/plugin.manager';
import { PluginController } from './controllers/plugin.controller';
import { MailService } from './services/mail.service';
import { SystemAuditService } from './services/system-audit.service';
import { SystemController } from './system.controller';
import { AnomalyAlertService } from '../common/services/anomaly-alert.service';
import { WebhookController } from './controllers/webhook.controller';
import { OrmService } from './services/orm.service';
import { StudioController } from './controllers/studio.controller';
import { WorkflowService } from './services/workflow.service';
import { WorkflowController } from './controllers/workflow.controller';
import { ConfigModule } from '@nestjs/config';
import { WebhookSecretRotationService } from './services/webhook-secret-rotation.service';

import { JwtModule } from '@nestjs/jwt';
import { CollaborationGateway } from './gateways/collaboration.gateway';
import { BullModule } from '@nestjs/bullmq';
import {
  QUEUE_WEBHOOK_DLQ,
  QUEUE_BULK_IMPORT,
  QUEUE_YEAR_CLOSE,
} from '../infrastructure/queue/queue.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    BullModule.registerQueue(
      { name: QUEUE_WEBHOOK_DLQ },
      { name: QUEUE_BULK_IMPORT },
      { name: QUEUE_YEAR_CLOSE },
    ),
  ],
  controllers: [
    RegistryController,
    AiController,
    BillingController,
    SystemController,
    SearchController,
    CollaborationController,
    ApiKeyController,
    B2BController,
    PluginController,
    WebhookController,
    StudioController,
    WorkflowController,
  ],
  providers: [
    RegistryService,
    AiService,
    AuditService,
    AuditVerificationService,
    BillingService,
    SearchService,
    CollaborationService,
    ApiKeyService,
    ForecastingService,
    SaasAnalyticsService,
    CollaborationGateway,
    PluginManager,
    MailService,
    CloudinaryService,
    SystemAuditService,
    AnomalyAlertService,
    AutomationWorkerService,
    OrmService,
    WorkflowService,
    WebhookSecretRotationService,
  ],
  exports: [
    RegistryService,
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
    CloudinaryService,
    SystemAuditService,
    AnomalyAlertService,
    CollaborationGateway,
    WebhookSecretRotationService,
  ],
})
export class SystemModule {}
