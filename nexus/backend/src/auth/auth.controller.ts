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
  UnauthorizedException,
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
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AnomalyAlertService } from '../common/services/anomaly-alert.service';

@Module('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private security: SecurityStorageService,
    private anomalyAlert: AnomalyAlertService,
  ) { }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('login/web')
  async loginWeb(@Request() req: any, @Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result: any = await this.authService.login(loginDto, 'WEB', req.ip || req.get('X-Forwarded-For'));
    if (result && result.accessToken) {
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
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
  @Throttle({ default: { limit: 30, ttl: 300000 } }) // Relaxed: 30 attempts per 5 minutes for setup
  @Public()
  @Post('login/admin')
  async loginAdmin(@Request() req: any, @Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result: any = await this.authService.adminLogin(loginDto, req.ip || req.get('X-Forwarded-For'));
    if (result && result.accessToken) {
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
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
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
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
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // OPS-003: Prevent tenant ID enumeration via repeated select-tenant calls
  @AllowIdentity()
  @AllowUnboarded()
  @MobileAction('SELECT_TENANT')
  @Post('select-tenant')
  async selectTenant(@Request() req: any, @Body('tenantId') tenantId: string, @Res({ passthrough: true }) res: Response) {
    // SECURITY: The 'channel' is inherited from the existing Identity token, which was anchored at login.
    const channel = (req.user as any).channel || 'MOBILE'; // Default to Mobile if missing (Safety First)
    const result: any = await this.authService.selectTenant(req.user.sub, tenantId, req.user.isMfaVerified, channel);
    if (result && result.accessToken && channel === 'WEB') {
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
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
  @Roles(Role.Owner)
  async getSecurityLogs(@Request() req: any) {
    if (!req.user.tenantId) {
      throw new ForbiddenException('A company context is required to view security logs.');
    }
    return this.authService.getTenantSecurityLogs(req.user.sub, req.user.tenantId);
  }

  // MON-002: Client-side Browser Telemetry Ingestion
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AllowUnboarded()
  @AllowIdentity()
  @Post('client-telemetry')
  async reportClientTelemetry(
    @Request() req: any,
    @Body('eventType') eventType: string,
    @Body('details') details: Record<string, unknown> = {},
  ) {
    if (!eventType) return { received: false, reason: 'eventType is required' };
    this.anomalyAlert
      .reportClientTelemetry(
        req.user.sub,
        req.user.tenantId || 'unknown',
        eventType,
        details,
        req.ip || req.get('X-Forwarded-For') || 'unknown',
      )
      .catch(() => void 0);
    return { received: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AllowIdentity()
  @AllowUnboarded()
  @Post('push-token')
  async updatePushToken(@Request() req: any, @Body('token') token: string) {
    return this.authService.updatePushToken(req.user.sub, token);
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

  // MOB-008: GET /auth/me — returns full DB-backed user profile.
  // Called by mobile AuthContext.loginWithToken() after TOTP verification
  // to hydrate the user object without doing a full re-login.
  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @AllowUnboarded()
  @Get('me')
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.sub);
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
    return this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
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
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
    }
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('mfa/verify-login')
  async verifyMfaLogin(@Body() dto: MfaVerifyDto, @Res({ passthrough: true }) res: Response) {
    const result: any = await this.authService.verifyMfaLogin(dto.token, dto.totpCode);
    // SEC-006: Only set cookies if the original session was a web session.
    // The channel is embedded in the MFA challenge token and propagated through
    // generateAuthResponse back to the result — use it to decide cookie behaviour.
    if (result && result.accessToken && result.channel === 'WEB') {
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
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
    res.clearCookie('nexus_refresh');
    return { success: true, message: 'Session terminated. Token revoked.' };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @AllowUnboarded()
  @Post('logout-all')
  async logoutAll(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(req.user.sub);
    res.clearCookie('nexus_token');
    res.clearCookie('nexus_refresh');
    return { success: true, message: 'All active sessions have been invalidated.' };
  }


  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('refresh')
  async refresh(@Request() req: any, @Body('refreshToken') bodyToken: string, @Res({ passthrough: true }) res: Response) {
    let token = bodyToken;
    if (!token && req.cookies && req.cookies['nexus_refresh']) {
      token = req.cookies['nexus_refresh'];
    }
    if (!token) throw new UnauthorizedException('No refresh token provided');

    const result: any = await this.authService.refreshSession(token);

    // Auto-update web cookies if it was a web session
    if (result && result.accessToken) {
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
    }
    return result;
  }

  private setAuthCookies(res: Response, token: string, refreshToken?: string) {
    res.cookie('nexus_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
    });

    if (refreshToken) {
      res.cookie('nexus_refresh', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    // FIX-AUTH-08: sameSite changed from 'strict' to 'lax'.
    // 'strict' blocked the CSRF cookie on top-level navigations from external origins
    // (e.g., clicking a link from an email). 'lax' allows it on top-level GET navigations
    // while still blocking cross-site POST/PUT/PATCH/DELETE — which is the correct threat model.
    // Non-httpOnly so frontend can read it to send X-CSRF-Token header.
    const csrfToken = require('crypto').randomBytes(32).toString('hex');
    res.cookie('nexus-csrf', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
