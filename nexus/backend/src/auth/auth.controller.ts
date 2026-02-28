import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, GoogleLoginDto, OnboardingDto, MfaVerifyDto, MfaSetupDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AllowUnboarded } from '../common/decorators/allow-unboarded.decorator';
import { AllowIdentity } from '../common/decorators/allow-identity.decorator';
import { Public } from '../common/decorators/public.decorator';
import { MobileAction } from '../common/decorators/mobile-action.decorator';
import { Module } from '../common/decorators/module.decorator';
import { AccessChannel } from '@nexus/shared';
import { Throttle } from '@nestjs/throttler';
import { SecurityStorageService } from '../common/services/security-storage.service';

@Module('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private security: SecurityStorageService,
  ) { }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('login/web')
  async loginWeb(@Request() req: any, @Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result: any = await this.authService.login(loginDto, 'WEB', req.ip || req.get('X-Forwarded-For'));
    if (result && result.accessToken) {
      this.setAuthCookie(res, result.accessToken);
    }
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('login/mobile')
  async loginMobile(@Request() req: any, @Body() loginDto: LoginDto) {
    return this.authService.login(loginDto, 'MOBILE', req.ip || req.get('X-Forwarded-For'));
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 attempts per 15 minutes
  @Public()
  @Post('login/admin')
  async loginAdmin(@Request() req: any, @Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result: any = await this.authService.adminLogin(loginDto, req.ip || req.get('X-Forwarded-For'));
    if (result && result.accessToken) {
      this.setAuthCookie(res, result.accessToken);
    }
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('google-login/web')
  async googleLoginWeb(@Body() googleLoginDto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    const result: any = await this.authService.googleLogin(googleLoginDto, 'WEB');
    if (result && result.accessToken) {
      this.setAuthCookie(res, result.accessToken);
    }
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('google-login/mobile')
  async googleLoginMobile(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.googleLogin(googleLoginDto, 'MOBILE');
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AllowUnboarded()
  @MobileAction('SELECT_TENANT')
  @Post('select-tenant')
  async selectTenant(@Request() req: any, @Body('tenantId') tenantId: string, @Res({ passthrough: true }) res: Response) {
    // SECURITY: The 'channel' is inherited from the existing Identity token, which was anchored at login.
    const channel = (req.user as any).channel || 'MOBILE'; // Default to Mobile if missing (Safety First)
    const result: any = await this.authService.selectTenant(req.user.sub, tenantId, req.user.isMfaVerified, channel);
    if (result && result.accessToken && channel === 'WEB') {
      this.setAuthCookie(res, result.accessToken);
    }
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @MobileAction('VIEW_TENANTS')
  @Get('tenants')
  async getTenants(@Request() req: any) {
    return this.authService.getTenants(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AllowIdentity()
  @AllowUnboarded()
  @MobileAction('ONBOARDING')
  @Post('onboarding')
  async onboarding(@Request() req: any, @Body() dto: OnboardingDto) {
    return this.authService.onboarding(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('security-logs')
  async getSecurityLogs(@Request() req: any) {
    // Only allow for tenant-scoped tokens
    if (!req.user.tenantId) {
      throw new ForbiddenException('A company context is required to view security logs.');
    }
    return this.authService.getTenantSecurityLogs(req.user.sub, req.user.tenantId);
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @AllowIdentity()
  @MobileAction('CREATE_WORKSPACE')
  @Post('create-workspace')
  async createWorkspace(@Request() req: any, @Body() dto: any) {
    return this.authService.createWorkspace(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @AllowUnboarded()
  @MobileAction('VIEW_PROFILE')
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // --- MFA Endpoints ---

  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @Post('mfa/setup')
  async setupMfa(@Request() req: any) {
    return this.authService.setupMfa(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @Post('mfa/verify-setup')
  async verifyMfaSetup(@Request() req: any, @Body() dto: MfaSetupDto, @Res({ passthrough: true }) res: Response) {
    const result: any = await this.authService.verifyMfaSetup(req.user.sub, dto.totpCode);
    const channel = (req.user as any).channel || 'WEB';
    if (result && result.accessToken && channel === 'WEB') {
      this.setAuthCookie(res, result.accessToken);
    }
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('mfa/verify-login')
  async verifyMfaLogin(@Body() dto: MfaVerifyDto, @Res({ passthrough: true }) res: Response) {
    const result: any = await this.authService.verifyMfaLogin(dto.token, dto.totpCode);
    // Note: We don't have request context here for channel, but verifyMfaLogin 
    // result should ideally tell us if it's a web session.
    // For now, if we have an accessToken and isMfaVerified is true, we set the cookie.
    if (result && result.accessToken) {
      this.setAuthCookie(res, result.accessToken);
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGOUT — Server-side token revocation via JTI blacklist
  // The token's JTI is blacklisted in cache until its natural expiry time.
  // This makes logout deterministic regardless of client-side token deletion.
  // ─────────────────────────────────────────────────────────────────────────
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @AllowUnboarded()
  @Post('logout')
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const { jti, exp } = req.user;
    if (jti && exp) {
      await this.security.blacklistToken(jti, exp);
    }
    res.clearCookie('nexus_token');
    return { success: true, message: 'Session terminated. Token revoked.' };
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie('nexus_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
    });

    // CSRF Secret Cookie (Double-Submit Pattern)
    // Non-httpOnly so frontend can read it to send X-CSRF-Token header.
    const csrfToken = require('crypto').randomBytes(32).toString('hex');
    res.cookie('nexus-csrf', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
