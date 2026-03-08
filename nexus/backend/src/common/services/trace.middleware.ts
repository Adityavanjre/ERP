import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { TraceService } from './trace.service';
import { randomUUID } from 'crypto';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  constructor(private readonly traceService: TraceService) {}

  use(req: any, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-correlation-id'] as string) || randomUUID();

    // Attach to request object for legacy/compatibility
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    this.traceService.run(correlationId, () => {
      next();
    });
  }
}
