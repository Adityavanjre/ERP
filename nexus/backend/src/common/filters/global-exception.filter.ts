import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default to strict 500 so we dont leak internal errors
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProd = process.env.NODE_ENV === 'production';
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal Server Error';

    const responseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'object' && message !== null
          ? (message as any).message || message
          : message,
    };

    // ZENITH: Additional Sanitization for internal 500s
    if (status === 500 && isProd) {
       responseBody.message = 'An internal system error occurred. Please contact Klypso Support.';
    }

    response.status(status).json(responseBody);
  }
}
