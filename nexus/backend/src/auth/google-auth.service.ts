import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleAuthService {
  private client: OAuth2Client;
  private readonly clientId: string;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    this.client = new OAuth2Client(this.clientId);
  }

  async verifyIdToken(token: string) {
    // 100% Offline Testability Mode: Simulation Bypass
    if (token === 'sim-google-token') {
      return {
        email: 'simulated-user@klypso.in',
        fullName: 'Simulated Google User',
        avatarUrl: 'https://simulation-storage.local/avatar.png',
        providerId: 'google_sim_123',
        emailVerified: true,
      };
    }

    try {
      if (!this.clientId) {
        throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables.');
      }

      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      return {
        email: payload.email,
        fullName: payload.name,
        avatarUrl: payload.picture,
        providerId: payload.sub, // Google unique ID
        emailVerified: payload.email_verified,
      };
    } catch (error) {
      throw new UnauthorizedException(`Google authentication failed: ${error.message}`);
    }
  }
}
