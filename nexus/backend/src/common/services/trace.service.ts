import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TraceService {
  private static readonly storage = new AsyncLocalStorage<{
    correlationId: string;
  }>();

  run<T>(correlationId: string, fn: () => T): T {
    return TraceService.storage.run({ correlationId }, fn);
  }

  getCorrelationId(): string | undefined {
    return TraceService.storage.getStore()?.correlationId;
  }
}
