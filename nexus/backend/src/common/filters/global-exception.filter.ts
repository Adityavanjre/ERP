import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object =
      'An internal system error occurred. Please contact support.';

    const isHttpException = exception instanceof HttpException || (exception && typeof (exception as any).getStatus === 'function');
    
    if (isHttpException) {
      const httpException = exception as HttpException;
      status = httpException.getStatus();
      const res = httpException.getResponse();
      message =
        typeof res === 'object' && res !== null
          ? (res as any).message || res
          : res;
    } else if (
      exception &&
      (exception as any).constructor?.name === 'PrismaClientKnownRequestError'
    ) {
      const prismaErr = exception as any;
      switch (prismaErr.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = `Duplicate entry: a record with this ${prismaErr.meta?.target || 'value'} already exists.`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message =
            'Invalid reference: the related record does not exist or is constrained by another entity.';
          break;
        case 'P2014':
          status = HttpStatus.BAD_REQUEST;
          message =
            'Relation violation: the change would break a required relation.';
          break;
        case 'P2024':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message =
            'Database connection timeout. The server is currently overloaded. Please try again in a few seconds.';
          break;
        case 'P2028':
          status = HttpStatus.REQUEST_TIMEOUT;
          message =
            'Database transaction timeout. The operation took too long to complete.';
          break;
        case 'P2022':
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          const missingColumn = prismaErr.meta?.column_name || 'unknown';
          message = `Database error (P2022): The column '${missingColumn}' does not exist in the current database. Please contact support.`;
          this.logger.error(
            `P2022 Missing column: ${missingColumn}`,
            prismaErr.message,
          );
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          // Distinguish between critical infra errors (500s/503s) and client errors (400s)
          if (prismaErr.code?.startsWith('P1')) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
          } else if (prismaErr.code?.startsWith('P202')) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
          } else {
            status = HttpStatus.BAD_REQUEST;
          }
          message = `Database error (${prismaErr.code}). Please try again or contact support.`;
          this.logger.error(
            `Unhandled Prisma error: ${prismaErr.code}`,
            prismaErr.message,
          );
      }
    } else if (
      exception &&
      (exception as any).constructor?.name === 'PrismaClientValidationError'
    ) {
      status = HttpStatus.BAD_REQUEST;
      const rawMessage = (exception as any).message || '';
      // Extract the human-readable part of the Prisma validation error
      // Usually starts after "Invocation:\n" or contains "Unknown arg", "missing arg"
      const lines = rawMessage.split('\n');
      const cleanLine = lines.find(
        (l: string) =>
          l.includes('Argument') ||
          l.includes('Unknown') ||
          l.includes('input'),
      );
      message = cleanLine
        ? cleanLine.trim()
        : 'Data validation failed. Please check the provided fields.';
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
      // Expose message for known business logic errors, hide for anything else
      message =
        exception.message?.length < 200
          ? exception.message
          : 'An internal system error occurred. Please contact support.';
    }

    const sanitizedBody = this.scrubSensitiveData(request.body);
    let eventId: string | undefined;
    const reqRequestUrlOrHeaderArray = request.headers['x-request-id'];
    const trackingId =
      (Array.isArray(reqRequestUrlOrHeaderArray)
        ? reqRequestUrlOrHeaderArray[0]
        : reqRequestUrlOrHeaderArray) ||
      `TRK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Only log actual crashes (500s) as errors.
    // 4xx errors (Bad Request, Unauthorized, Not Found) are normal client behavior.
    if (status >= 500) {
      this.logger.error(`[CRASH_REPORT] URL: ${request.url}`);
      this.logger.error(
        `[CRASH_REPORT] Body: ${JSON.stringify(sanitizedBody)}`,
      );
      this.logger.error(
        `[CRASH_REPORT] UserId: ${(request as any).user?.id || 'none'}`,
      );
      this.logger.error(
        `[CRASH_REPORT] Exception: ${exception instanceof Error ? exception.message : 'Unknown'}`,
      );
      if (exception instanceof Error) {
        this.logger.error(`[CRASH_REPORT] Stack: ${exception.stack}`);
      }
      if (exception instanceof (Prisma as any).PrismaClientKnownRequestError) {
        this.logger.error(
          `[CRASH_REPORT] Prisma Code: ${(exception as any).code}`,
        );
      }

      // DEV-004: Explict Sentry tracing for generic 500 combinations without leaking PII
      Sentry.withScope((scope) => {
        scope.setTag('status_code', status);
        scope.setTag('path', request.url);
        scope.setUser({ id: (request as any).user?.id || 'anonymous' });
        scope.setExtra('body', sanitizedBody);
        scope.setTag('tracking_id', trackingId);
        eventId = Sentry.captureException(exception);
      });
    } else {
      this.logger.warn(
        `[CLIENT_ERR] ${status} ${request.method} ${request.url} - ${JSON.stringify(message)}`,
      );
    }

    const responseBody = {
      statusCode: status,
      message,
      error: status >= 500 && exception instanceof Error ? exception.constructor.name : undefined,
      path: request.url,
      timestamp: new Date().toISOString(),
      traceId: eventId || trackingId,
    };

    response.status(status).json(responseBody);
  }

  private scrubSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj))
      return obj.map((item) => this.scrubSensitiveData(item));

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'jwt',
      'creditCard',
      'cvv',
      'mfaSecret',
      'totp',
      'apiKey',
      'authorization',
      'signature',
    ];
    const scrubbed: any = {};
    for (const key in obj) {
      if (
        sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))
      ) {
        scrubbed[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        scrubbed[key] = this.scrubSensitiveData(obj[key]);
      } else {
        scrubbed[key] = obj[key];
      }
    }
    return scrubbed;
  }
}
