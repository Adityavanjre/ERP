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
  Req,
} from '@nestjs/common';
import { Response, Request as ExpressRequest } from 'express';
import { AuthenticatedRequest } from '../common/interfaces/request.interface';
import { AuthResponse } from './interfaces/auth-response.interface';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  GoogleLoginDto,
  OnboardingDto,
  MfaVerifyDto,
  MfaSetupDto,
  CreateWorkspaceDto,
} from './dto/auth.dto';
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
  async loginWeb(
    @Req() req: ExpressRequest,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(
      loginDto,
      'WEB',
      req.ip || (req.get('X-Forwarded-For') as string),
    );
    const authResult = result as AuthResponse;
    if (authResult && authResult.accessToken && authResult.refreshToken) {
      this.setAuthCookies(res, authResult.accessToken, authResult.refreshToken);
    }
    return authResult;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('login/mobile')
  async loginMobile(@Req() req: ExpressRequest, @Body() loginDto: LoginDto) {
    return this.authService.login(
      loginDto,
      'MOBILE',
      req.ip || (req.get('X-Forwarded-For') as string),
    );
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 300000 } }) // Relaxed: 30 attempts per 5 minutes for setup
  @Public()
  @Post('login/admin')
  async loginAdmin(
    @Req() req: ExpressRequest,
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.adminLogin(
      loginDto,
      req.ip || (req.get('X-Forwarded-For') as string),
    );
    const authResult = result as AuthResponse;
    if (authResult && authResult.accessToken && authResult.refreshToken) {
      this.setAuthCookies(res, authResult.accessToken, authResult.refreshToken);
    }
    return authResult;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('google-login/web')
  async googleLoginWeb(
    @Body() googleLoginDto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.googleLogin(googleLoginDto, 'WEB');
    const authResult = result as AuthResponse;
    if (authResult && authResult.accessToken && authResult.refreshToken) {
      this.setAuthCookies(res, authResult.accessToken, authResult.refreshToken);
    }
    return authResult;
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
  async selectTenant(
    @Req() req: AuthenticatedRequest,
    @Body('tenantId') tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    // SECURITY: The 'channel' is inherited from the existing Identity token, which was anchored at login.
    const channel = req.user.channel || 'MOBILE'; // Default to Mobile if missing (Safety First)
    const result = await this.authService.selectTenant(
      req.user.sub,
      tenantId,
      req.user.isMfaVerified,
      channel,
    );
    const authResult = result as AuthResponse;
    if (
      authResult &&
      authResult.accessToken &&
      authResult.refreshToken &&
      channel === 'WEB'
    ) {
      this.setAuthCookies(res, authResult.accessToken, authResult.refreshToken);
    }
    return authResult;
  }

  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @MobileAction('VIEW_TENANTS')
  @Get('tenants')
  async getTenants(@Req() req: AuthenticatedRequest) {
    return this.authService.getTenants(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AllowIdentity()
  @AllowUnboarded()
  @MobileAction('ONBOARDING')
  @Post('onboarding')
  async onboarding(
    @Req() req: AuthenticatedRequest,
    @Body() dto: OnboardingDto,
  ) {
    return this.authService.onboarding(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('security-logs')
  @Roles(Role.Owner)
  async getSecurityLogs(@Req() req: AuthenticatedRequest) {
    if (!req.user.tenantId) {
      throw new ForbiddenException(
        'A company context is required to view security logs.',
      );
    }
    return this.authService.getTenantSecurityLogs(
      req.user.sub,
      req.user.tenantId,
    );
  }

  // MON-002: Client-side Browser Telemetry Ingestion
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AllowUnboarded()
  @AllowIdentity()
  @Post('client-telemetry')
  async reportClientTelemetry(
    @Req() req: AuthenticatedRequest,
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
        req.ip || (req.get('X-Forwarded-For') as string) || 'unknown',
      )
      .catch(() => void 0);
    return { received: true };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AllowIdentity()
  @AllowUnboarded()
  @Post('push-token')
  async updatePushToken(
    @Req() req: AuthenticatedRequest,
    @Body('token') token: string,
  ) {
    return this.authService.updatePushToken(req.user.sub, token);
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = (await this.authService.register(
      registerDto,
    )) as AuthResponse;
    if (result && result.accessToken && result.refreshToken) {
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
    }
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @AllowIdentity()
  @MobileAction('CREATE_WORKSPACE')
  @Post('create-workspace')
  async createWorkspace(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.authService.createWorkspace(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @AllowUnboarded()
  @MobileAction('VIEW_PROFILE')
  @Get('profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  // MOB-008: GET /auth/me — returns full DB-backed user profile.
  // Called by mobile AuthContext.loginWithToken() after TOTP verification
  // to hydrate the user object without doing a full re-login.
  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @AllowUnboarded()
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest) {
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
    return this.authService.resetPassword(
      dto.email,
      dto.token,
      dto.newPassword,
    );
  }

  // --- MFA Endpoints ---

  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @Post('mfa/setup')
  async setupMfa(@Request() req: AuthenticatedRequest) {
    return this.authService.setupMfa(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @Post('mfa/verify-setup')
  async verifyMfaSetup(
    @Request() req: AuthenticatedRequest,
    @Body() dto: MfaSetupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = (await this.authService.verifyMfaSetup(
      req.user.sub,
      dto.totpCode,
    )) as AuthResponse;
    const channel = req.user.channel || 'WEB';
    if (
      result &&
      result.accessToken &&
      result.refreshToken &&
      channel === 'WEB'
    ) {
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
    }
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('mfa/verify-login')
  async verifyMfaLogin(
    @Body() dto: MfaVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = (await this.authService.verifyMfaLogin(
      dto.token,
      dto.totpCode,
    )) as AuthResponse;
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
  async logout(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // SECURITY BUG-010: Blacklisting the AT's jti leaves the RT fully functional since RT lacks jti.
    // Instead of maintaining complex blacklist states, we forcibly increment the user's tokenVersion.
    // This instantly invalidates ALL active tokens (both AT and RT) for this user across all devices.
    await this.authService.logoutAll(req.user.sub);
    res.clearCookie('nexus_token');
    res.clearCookie('nexus_refresh');
    return { success: true, message: 'Session terminated. Token revoked.' };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @AllowIdentity()
  @AllowUnboarded()
  @Post('logout-all')
  async logoutAll(
    @Request() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(req.user.sub);
    res.clearCookie('nexus_token');
    res.clearCookie('nexus_refresh');
    return {
      success: true,
      message: 'All active sessions have been invalidated.',
    };
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('refresh')
  async refresh(
    @Request() req: ExpressRequest,
    @Body('refreshToken') bodyToken: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    let token = bodyToken;
    if (!token && req.cookies && req.cookies['nexus_refresh']) {
      token = req.cookies['nexus_refresh'];
    }
    if (!token) throw new UnauthorizedException('No refresh token provided');

    const authResult = (await this.authService.refreshSession(
      token,
    )) as AuthResponse;

    // Auto-update web cookies if it was a web session
    if (authResult && authResult.accessToken && authResult.refreshToken) {
      this.setAuthCookies(res, authResult.accessToken, authResult.refreshToken);
    }
    return authResult;
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
