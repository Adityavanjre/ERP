import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { loggerConfig } from './common/logger.config';
import { ClusterService } from './system/services/cluster.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: loggerConfig,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Security Headers
  app.use(require('helmet')());

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

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Enterprise ERP API')
    .setDescription('Full API documentation for ERP modules')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port ${port} with API Docs at /api/docs`);
}

// ClusterService.clusterize(bootstrap);
bootstrap().catch(err => {
  console.error('CRITICAL_STARTUP_FAILURE: Nexus Backend failed to initialize');
  console.error(err);
  process.exit(1);
});
