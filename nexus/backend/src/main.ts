import { otracing } from './tracing';
import { NestFactory } from '@nestjs/core';
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

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 0 — FAIL-FAST ENVIRONMENT VALIDATION
// The application refuses to start if any critical secret is absent.
// This prevents accidental deployment with missing credentials.
// ─────────────────────────────────────────────────────────────────────────────
const CRITICAL_VARS = ['JWT_SECRET', 'DATABASE_URL', 'MFA_ENCRYPTION_KEY'];
const OPTIONAL_VARS = ['AUDIT_HMAC_SECRET', 'CLOUDINARY_API_KEY', 'RESEND_API_KEY'];

function validateEnvironment(): void {
  const isProd = process.env.NODE_ENV === 'production';
  console.log(`[BOOT] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[BOOT] Checking Critical Environment Variables...`);

  // Masked logging for debugging on Render
  CRITICAL_VARS.forEach(v => {
    const val = process.env[v];
    console.log(`[BOOT] ${v}: ${val ? 'SET (********)' : 'MISSING ❌'}`);
  });

  const missingCritical = CRITICAL_VARS.filter((key) => !process.env[key]);

  // PROD-002: Always treat Audit HMAC as critical in production to ensure forensic integrity.
  const auditSecret = process.env.AUDIT_HMAC_SECRET;
  console.log(`[BOOT] AUDIT_HMAC_SECRET: ${auditSecret ? 'SET (********)' : 'MISSING ⚠️'}`);
  if (isProd && !auditSecret) {
    missingCritical.push('AUDIT_HMAC_SECRET');
  }

  if (missingCritical.length > 0) {
    console.error(`[FATAL_CONFIG] Missing Critical Environment Variables: ${missingCritical.join(', ')}`);
    console.error('The application refuses to start to prevent data corruption or insecurity. Exiting with Status 1.');
    process.exit(1);
  }

  const missingOptional = OPTIONAL_VARS.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(`[WARN] Missing Optional Environment Variables: ${missingOptional.join(', ')}`);
  }
}

async function bootstrap() {
  console.log('--- [BOOTSTRAP ENGINE STARTING] ---');

  // Safe Tracing Initialization
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    try {
      console.log('[BOOT] Initializing OpenTelemetry Tracing...');
      otracing.start();
    } catch (otelErr) {
      console.warn('[BOOT] Tracing failed to start. Continuing without tracing:', otelErr);
    }
  }

  // Must validate BEFORE creating the NestJS app
  validateEnvironment();

  console.log('[BOOT] Initializing NestJS App Instance...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: loggerConfig,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Intercept Render's port-binding HEAD / probe at the Express level
  // before NestJS routing picks it up and throws a NotFoundException.
  expressApp.head('/', (_req: any, res: any) => res.status(200).end());

  app.use(cookieParser());
  app.use(hpp());

  // Security Headers with explicit CSP and HSTS
  app.use(helmet({
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
      maxAge: 31536000,        // 1 year in seconds
      includeSubDomains: true, // Apply to all subdomains
      preload: true,           // Eligible for browser HSTS preload list
    },
  }));

  // Compression for performance
  app.use(compression());

  // Build allowed cross-origin list dynamically based on environment
  const allowedOrigins: (string | RegExp)[] = [
    'https://klypso.in',
    'https://www.klypso.in',
    'https://nexus.klypso.in',
    'http://localhost:3000'
  ];

  if (process.env.KLYPSO_FRONTEND_URL) allowedOrigins.push(process.env.KLYPSO_FRONTEND_URL);
  if (process.env.NEXUS_FRONTEND_URL) allowedOrigins.push(process.env.NEXUS_FRONTEND_URL);

  // Fail-safe for Render's dynamic subdomains
  allowedOrigins.push(/\.onrender\.com$/);

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
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

  // Swagger Documentation — DISABLED IN PRODUCTION
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
    console.log('Swagger documentation available at /api/docs (development only)');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`[BOOT] Scaling Strategy: Single Process (Vertical) — Node.js runtime active on instance.`);
  console.log(`[BOOT] Nexus Backend successfully listening on port ${port}`);
}

// PROD-004: Hard-locked to Single Process Mode to prevent OOM on Cloud Free Tiers (512MB RAM).
// Previously, enabling clustering would spawn process per CPU core (e.g. 8 cores = 8x RAM usage), instantly crashing.
bootstrap().catch(err => {
  console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('CRITICAL_STARTUP_FAILURE: Nexus Backend crashed during boot.');
  console.error('Reason:', err.message || 'Unknown Error');
  if (err.stack) console.error('Stack Trace:', err.stack);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
  process.exit(1);
});
