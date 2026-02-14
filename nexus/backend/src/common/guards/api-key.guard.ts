import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../../kernel/services/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API Key missing');
    }

    try {
      const keyRecord = await this.apiKeyService.validateKey(apiKey);
      
      // 1. Attach metadata to request
      request.user = {
        userId: 'API_CONSUMER',
        tenantId: keyRecord.tenantId,
        isApiKey: true,
        scopes: keyRecord.scopes as string[],
      };

      // 2. Verify Scopes
      const requiredScopes = this.reflector.getAllAndOverride<string[]>('scopes', [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!requiredScopes || requiredScopes.length === 0) {
        return true;
      }

      const hasScope = requiredScopes.every((scope) =>
        request.user.scopes.includes(scope),
      );

      if (!hasScope) {
        throw new ForbiddenException('Insufficient Scopes');
      }

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid or Expired API Key');
    }
  }
}
