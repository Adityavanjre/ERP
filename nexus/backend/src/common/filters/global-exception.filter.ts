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

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'An internal system error occurred. Please contact support.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'object' && res !== null
          ? (res as any).message || res
          : res;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = `Duplicate entry: a record with this ${(exception.meta?.target as string[])?.join(', ') || 'value'} already exists.`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid reference: the related record does not exist.';
          break;
        case 'P2014':
          status = HttpStatus.BAD_REQUEST;
          message = 'Relation violation: the change would break a required relation.';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = `Database error (${exception.code}). Please try again or contact support.`;
          this.logger.error(`Unhandled Prisma error: ${exception.code}`, exception.message);
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided. Please check your input and try again.';
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      // Expose message for known business logic errors, hide for anything else
      message = exception.message?.length < 200
        ? exception.message
        : 'An internal system error occurred. Please contact support.';
    }

    const responseBody = {
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(`[${status}] ${request.method} ${request.url} - ${JSON.stringify(message)}`);
    response.status(status).json(responseBody);
  }
}
