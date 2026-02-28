import { otracing } from './tracing';
otracing.start();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { loggerConfig } from './common/logger.config';
import { ClusterService } from './system/services/cluster.service';
import cookieParser from 'cookie-parser';

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 0 — FAIL-FAST ENVIRONMENT VALIDATION
// The application refuses to start if any critical secret is absent.
// This prevents accidental deployment with missing credentials.
// ─────────────────────────────────────────────────────────────────────────────
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL', 'AUDIT_HMAC_SECRET', 'CLOUDINARY_URL'];

function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`FATAL_STARTUP_ERROR: The following required environment variables are not set: ${missing.join(', ')}`);
    console.error('The application cannot start in an insecure or misconfigured state. Exiting.');
    process.exit(1);
  }
}

async function bootstrap() {
  // Must validate BEFORE creating the NestJS app so secrets are guaranteed
  // to exist before any module (especially AuthModule) attempts to read them.
  validateEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: loggerConfig,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.use(cookieParser());
  app.use(require('hpp')());

  // Security Headers with explicit CSP and HSTS
  app.use(require('helmet')({
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
  app.use(require('compression')());

  app.enableCors({
    origin: ['https://klypso.in', 'https://www.klypso.in', 'https://nexus.klypso.in', 'https://klypso-gateway.onrender.com', 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api');

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
  console.log(`Server running on port ${port}`);
}

// ClusterService.clusterize(bootstrap);
bootstrap().catch(err => {
  console.error('CRITICAL_STARTUP_FAILURE: Nexus Backend failed to initialize');
  console.error(err);
  process.exit(1);
});
