import { Module, Global } from '@nestjs/common';
import { RegistryService } from './services/registry.service';
import { AiService } from './services/ai.service';
import { AuditService } from './services/audit.service';
import { AuditVerificationService } from './services/audit-verification.service';
import { BillingService } from './services/billing.service';
import { RegistryController } from './controllers/registry.controller';
import { AiController } from './controllers/ai.controller';
import { BillingController } from './controllers/billing.controller';
import { HealthController } from './controllers/health.controller';
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

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [
    RegistryController,
    AiController,
    BillingController,
    HealthController,
    SystemController,
    SearchController,
    CollaborationController,
    ApiKeyController,
    B2BController,
    PluginController,
  ],
  providers: [
    RegistryService,
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
    CloudinaryService,
    SystemAuditService,
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
  ],
})
export class SystemModule { }
