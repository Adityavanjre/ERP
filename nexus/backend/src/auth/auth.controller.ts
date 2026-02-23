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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, GoogleLoginDto, OnboardingDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AllowUnboarded } from '../common/decorators/allow-unboarded.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @HttpCode(HttpStatus.OK)
  // Limit login to 15 attempts per minute
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @HttpCode(HttpStatus.OK)
  // Limit Google login attempts
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('google-login')
  async googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.googleLogin(googleLoginDto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AllowUnboarded()
  @Post('select-tenant')
  async selectTenant(@Request() req: any, @Body('tenantId') tenantId: string) {
    return this.authService.selectTenant(req.user.sub, tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tenants')
  async getTenants(@Request() req: any) {
    return this.authService.getTenants(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AllowUnboarded()
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

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('create-workspace')
  async createWorkspace(@Request() req: any, @Body() dto: any) {
    return this.authService.createWorkspace(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @AllowUnboarded()
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
