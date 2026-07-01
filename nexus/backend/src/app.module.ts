import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { InventoryModule } from './inventory/inventory.module';
import { ManufacturingModule } from './manufacturing/manufacturing.module';
import { AccountingModule } from './accounting/accounting.module';
import { SalesModule } from './sales/sales.module';
import { HrModule } from './hr/hr.module';
import { PurchasesModule } from './purchases/purchases.module';
import { CommonModule } from './common/common.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ProjectModule } from './projects/projects.module';
import { SystemModule } from './system/system.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthcareModule } from './healthcare/healthcare.module';
import { ConstructionModule } from './construction/construction.module';
import { LogisticsModule } from './logistics/logistics.module';
import { NbfcModule } from './nbfc/nbfc.module';
import { SyncModule } from './sync/sync.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { OnboardingGuard } from './common/guards/onboarding.guard';
import { ModuleGuard } from './common/guards/module.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { MobileWhitelistGuard } from './common/guards/mobile-whitelist.guard';
import { RoleThrottlerGuard } from './common/guards/role-throttler.guard';
import { TraceMiddleware } from './common/services/trace.middleware';
import { CsrfGuard } from './common/guards/csrf.guard';
// REMOVED: PlanGuard - subscription system removed

import { TenantMembershipGuard } from './common/guards/tenant-membership.guard';
import { HttpCacheInterceptor } from './common/interceptors/cache.interceptor';

import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { DiscoveryModule } from '@nestjs/core';
import { ScheduleRootModule } from './schedule/schedule-root.module';

@Module({
  imports: [
    DiscoveryModule,
    InfrastructureModule,
    ScheduleRootModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CrmModule,
    InventoryModule,
    ManufacturingModule,
    AccountingModule,
    SalesModule,
    HrModule,
    PurchasesModule,
    ProjectModule,
    SystemModule,
    AnalyticsModule,
    HealthcareModule,
    ConstructionModule,
    LogisticsModule,
    NbfcModule,
    SyncModule,
    CommonModule,
    HealthModule,
    CacheModule.register({ isGlobal: true, ttl: 60 * 1000, max: 1000 }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute in milliseconds (v6+)
        limit: 30000,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 1st: Authenticate — populates req.user. Nothing else can run without this.
    },
    {
      provide: APP_GUARD,
      useClass: TenantMembershipGuard, // 2nd: Membership/Subscription verification — Rule B & S. Refetches role from DB.
    },
    {
      provide: APP_GUARD,
      useClass: OnboardingGuard, // 3rd: Tenant state check — requires req.user.
    },
    {
      provide: APP_GUARD,
      useClass: ModuleGuard, // 4th: Module enable/disable — requires req.user.tenantId.
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard, // 6th: Mobile Safety Contract — fine-grained permission checks within a role.
    },
    {
      provide: APP_GUARD,
      useClass: MobileWhitelistGuard, // 7th: Channel whitelist — prevents unauthorized mobile access.
    },
    // REMOVED: PlanGuard - subscription system removed
    // {
    //   provide: APP_GUARD,
    //   useClass: PlanGuard, // 8th: Subscription enforcement
    // },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard, // 9th: CSRF validation — runs after auth session is verified.
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    /*
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
    */
  ],
})
export class AppModule {}
