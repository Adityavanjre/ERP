import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class SecurityStorageService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async blacklistToken(jti: string, exp: number) {
        const ttl = Math.max(0, exp - Math.floor(Date.now() / 1000));
        if (ttl > 0) {
            await this.cacheManager.set(`blacklist:${jti}`, true, ttl * 1000);
        }
    }

    async isTokenBlacklisted(jti: string): Promise<boolean> {
        if (!jti) return false;
        const isBlacklisted = await this.cacheManager.get(`blacklist:${jti}`);
        return !!isBlacklisted;
    }
}
