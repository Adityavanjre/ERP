import 'dotenv/config';
import 'reflect-metadata';
import { otracing } from './tracing';
// Force resolution of critical validation packages before NestJS starts
import 'class-validator';
import 'class-transformer';

import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { loggerConfig } from './common/logger.config';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import helmet from 'helmet';
import compression from 'compression';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PHASE 0 â€” FAIL-FAST ENVIRONMENT VALIDATION
// The application refuses to start if any critical secret is absent.
// This prevents accidental deployment with missing credentials.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CRITICAL_VARS = [
  'JWT_SECRET',
  'DATABASE_URL',
  'MFA_ENCRYPTION_KEY',
  'ADMIN_PASSWORD',
  'ADMIN_EMAIL',
];
const OPTIONAL_VARS = [
  'AUDIT_HMAC_SECRET',
  'CLOUDINARY_API_KEY',
  'RESEND_API_KEY',
];

function validateEnvironment(): void {
  const isProd = process.env.NODE_ENV === 'production';
  console.log(`[BOOT] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[BOOT] Checking Critical Environment Variables...`);

  // Masked logging for debugging on Render
  CRITICAL_VARS.forEach((v) => {
    const val = process.env[v];
    console.log(`[BOOT] ${v}: ${val ? 'SET (********)' : 'MISSING âŒ'}`);
  });

  const missingCritical = CRITICAL_VARS.filter((key) => !process.env[key]);

  // PROD-002: Always treat Audit HMAC as critical in production to ensure forensic integrity.
  const auditSecret = process.env.AUDIT_HMAC_SECRET;
  console.log(
    `[BOOT] AUDIT_HMAC_SECRET: ${auditSecret ? 'SET (********)' : 'MISSING âš ï¸'}`,
  );
  if (isProd && !auditSecret) {
    missingCritical.push('AUDIT_HMAC_SECRET');
  }

  // SEC-014: Fail-fast for Cloudinary in production.
  // Silent media failures lead to data corruption in Sales/Healthcare modules.
  if (
    isProd &&
    !process.env.CLOUDINARY_URL &&
    !process.env.CLOUDINARY_API_KEY
  ) {
    console.error(
      '[FATAL_CONFIG] Production requires CLOUDINARY for media persistence.',
    );
    missingCritical.push('CLOUDINARY');
  }

  // OPS-005: Protect against Render-IPv6 routing failure with Supabase
  const dbUrl = process.env.DATABASE_URL || '';
  if (isProd && dbUrl.includes('db.') && dbUrl.includes('.supabase.co')) {
    console.error(
      '[FATAL_CONFIG] Production DATABASE_URL appears to be a Supabase IPv6 domain. Render does not support IPv6. Please update to an IPv4 direct connection or connection pool string.',
    );
    missingCritical.push('DATABASE_URL (Requires IPv4)');
  }

  if (missingCritical.length > 0) {
    console.error(
      `[FATAL_CONFIG] Missing Critical Environment Variables: ${missingCritical.join(', ')}`,
    );
    console.error(
      'The application refuses to start to prevent data corruption or insecurity. Exiting with Status 1.',
    );
    process.exit(1);
  }

  const missingOptional = OPTIONAL_VARS.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(
      `[WARN] Missing Optional Environment Variables: ${missingOptional.join(', ')}`,
    );
  }
}

async function bootstrap() {
  console.log('--- [BOOTSTRAP ENGINE STARTING] ---');

  // Safe Tracing Initialization & MON-001 Readiness Check
  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (otelEndpoint) {
    try {
      console.log(
        `[BOOT] Initializing OpenTelemetry Tracing (Endpoint: ${otelEndpoint})...`,
      );

      // MON-001: Pinging the OTEL collector to ensure observability is actually draining.
      // We do a non-blocking check to avoid delaying startup, but it logs a critical warning on failure.
      import('axios')
        .then(async (axios) => {
          try {
            // Collector base endpoint (e.g. Jaeger/OTel-Collector) usually responds to a health probe
            await axios.default.head(otelEndpoint.replace('/v1/traces', ''), {
              timeout: 3000,
            });
            console.log(
              '[BOOT] â—‹ OTEL Collector is REACHABLE. Tracing pipeline active.',
            );
          } catch (e) {
            console.warn(
              `[BOOT] â—‹ OTEL Collector UNREACHABLE at ${otelEndpoint}. Observability Gap detected!`,
            );
          }
        })
        .catch(() => void 0);

      otracing.start();
    } catch (otelErr) {
      console.warn(
        '[BOOT] Tracing failed to start. Continuing without tracing:',
        otelErr,
      );
    }
  }

  // Must validate BEFORE creating the NestJS app
  validateEnvironment();

  // DEV-004 / SEC-014: Configure Sentry explicitly for unhandled crashes
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      environment: process.env.NODE_ENV || 'development',
    });
    console.log('[BOOT] Sentry initialized successfully.');
  } else if (process.env.NODE_ENV === 'production') {
    // SEC-014: Sentry is mandatory in production for forensic triage
    console.warn(
      '[WARN_CONFIG] SENTRY_DSN is missing. Proceeding without error tracking in production.',
    );
  }

  console.log('[BOOT] Initializing NestJS App Instance...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: loggerConfig,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Intercept Render's port-binding HEAD / probe at the Express level
  // before NestJS routing picks it up and throws a NotFoundException.
  // Intercept Render's port-binding HEAD / probe at the Express level
  // before NestJS routing picks it up and throws a NotFoundException.
  expressApp.all('/', (_req: any, res: any) =>
    res.status(200).json({
      status: 'online',
      service: 'Nexus Enterprise API',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    }),
  );

  // RED-001: Manual Liveness Probe for Render / Port-scanner
  // This bypasses NestJS Guards/Interceptors to ensure Render gets a 200 OK
  // during the critical boot-up window when the router might be slow.
  expressApp.get('/api/v1/health/liveness', (_req: any, res: any) =>
    res.status(200).json({ status: 'up', source: 'express-direct' }),
  );
  expressApp.get('/api/health/liveness', (_req: any, res: any) =>
    res.status(200).json({ status: 'up', source: 'express-direct' }),
  );

  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-App-Version', process.env.APP_VERSION || '2.0.0');
    next();
  });

  app.use(cookieParser());
  app.use(hpp());

  // Security Headers with explicit CSP and HSTS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      // HSTS: forces HTTPS for 1 year, including all subdomains.
      // Prevents protocol downgrade attacks (MITM token theft on insecure networks).
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true, // Apply to all subdomains
        preload: true, // Eligible for browser HSTS preload list
      },
    }),
  );

  // Compression for performance
  app.use(compression());

  // PRD-002: Production-Grade CORS Strategy (Gateway-First)
  // In our Proxy model, the browser on klypso.in calls /portal/api (Same-Origin).
  // This bypasses CORS entirely for browser users. We only keep these for
  // specific Cross-Origin scenarios (like landing pages on separate subdomains).
  const allowedOrigins: (string | RegExp)[] = [
    'https://klypso.in',
    'https://www.klypso.in',
    /\.klypso\.in$/, // Trust all klypso.in subdomains
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
  ];

  // BUG-FIX: Previously only KLYPSO_FRONTEND_URL was added.
  // On Render, the frontend URL is set as NEXUS_FRONTEND_URL, so CORS was
  // blocking all authenticated requests from the deployed frontend.
  const extraOrigins = [
    process.env.NEXUS_FRONTEND_URL, // Primary -- set this in Render env vars
    process.env.KLYPSO_FRONTEND_URL, // Legacy key (backwards compat)
    process.env.CORS_ORIGIN, // Escape hatch for additional origins
  ];
  for (const o of extraOrigins) {
    if (o && !allowedOrigins.includes(o)) allowedOrigins.push(o);
  }

  console.log(
    '[BOOT] CORS origins: ' +
      allowedOrigins
        .map((o) => (o instanceof RegExp ? o.source : o))
        .join(' | '),
  );

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
    ],
  });

  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Timeouts (15s limit)
  app.useGlobalInterceptors(new TimeoutInterceptor());

  // Swagger Documentation â€” DISABLED IN PRODUCTION
  // Internal API blueprint must not be publicly accessible.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Enterprise ERP API')
      .setDescription('Full API documentation for ERP modules')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(
      'Swagger documentation available at /api/docs (development only)',
    );
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(
    `[BOOT] Scaling Strategy: Single Process (Vertical) â€” Node.js runtime active on instance.`,
  );
  console.log(`[BOOT] Nexus Backend successfully listening on port ${port}`);
}

import { ClusterService } from './system/services/cluster.service';

/**
 * PROD-004: Scaling Strategy Selection.
 * Avoid clustering on standard 512MB free tiers to prevent OOM.
 * Allow multi-process expansion only on high-scale infra (RAM_TIER > 512MB).
 */
const RAM_TIER = parseInt(process.env.RAM_TIER || '512', 10);
const SHOULD_CLUSTER = process.env.NODE_ENV === 'production' && RAM_TIER > 512;

if (SHOULD_CLUSTER) {
  ClusterService.clusterize(() => {
    bootstrap().catch((err) => {
      console.error('CRITICAL_BOOT_EXIT (Worker):', err.message);
      process.exit(1);
    });
  });
} else {
  console.log(
    `[BOOT] Scaling Strategy: Single Process (Vertical) â€” ${RAM_TIER}MB Tier Baseline.`,
  );
  bootstrap().catch((err) => {
    console.error('CRITICAL_BOOT_EXIT (Primary):', err.message);
    process.exit(1);
  });
}
