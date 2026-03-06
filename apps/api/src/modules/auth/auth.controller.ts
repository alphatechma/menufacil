import { Controller, Post, Body, UseGuards, Get, Res, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CustomerLoginDto, CustomerRegisterDto } from './dto/customer-login.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { CurrentTenant, CurrentUser } from '../../common/decorators';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@ApiTags('Auth')
@ApiSecurity('tenant-slug')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('super-admin/login')
  @ApiOperation({ summary: 'Super Admin login' })
  async loginSuperAdmin(@Body() dto: SuperAdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginSuperAdmin(dto);
    res.cookie('accessToken', result.access_token, COOKIE_OPTIONS);
    res.cookie('refreshToken', result.refresh_token, COOKIE_OPTIONS);
    return result;
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login (no tenant slug required)' })
  async loginAdmin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginAdmin(dto);
    res.cookie('accessToken', result.access_token, COOKIE_OPTIONS);
    res.cookie('refreshToken', result.refresh_token, COOKIE_OPTIONS);
    return result;
  }

  @Post('register-tenant')
  @ApiOperation({ summary: 'Register a new tenant with admin user (7-day trial)' })
  async registerTenant(@Body() dto: RegisterTenantDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerTenant(dto);
    res.cookie('accessToken', result.access_token, COOKIE_OPTIONS);
    res.cookie('refreshToken', result.refresh_token, COOKIE_OPTIONS);
    return result;
  }

  @Post('staff/login')
  @ApiOperation({ summary: 'Staff login' })
  async loginStaff(@Body() dto: LoginDto, @CurrentTenant('id') tenantId: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginStaff(dto, tenantId);
    res.cookie('accessToken', result.access_token, COOKIE_OPTIONS);
    res.cookie('refreshToken', result.refresh_token, COOKIE_OPTIONS);
    return result;
  }

  @Post('staff/register')
  @ApiOperation({ summary: 'Register new staff member' })
  async registerStaff(@Body() dto: RegisterDto, @CurrentTenant('id') tenantId: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerStaff(dto, tenantId);
    res.cookie('accessToken', result.access_token, COOKIE_OPTIONS);
    res.cookie('refreshToken', result.refresh_token, COOKIE_OPTIONS);
    return result;
  }

  @Post('customer/login')
  @ApiOperation({ summary: 'Customer login' })
  async loginCustomer(@Body() dto: CustomerLoginDto, @CurrentTenant('id') tenantId: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginCustomer(dto, tenantId);
    res.cookie('customer_token', result.access_token, COOKIE_OPTIONS);
    res.cookie('customer_refresh_token', result.refresh_token, COOKIE_OPTIONS);
    return result;
  }

  @Post('customer/register')
  @ApiOperation({ summary: 'Register new customer' })
  async registerCustomer(@Body() dto: CustomerRegisterDto, @CurrentTenant('id') tenantId: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerCustomer(dto, tenantId);
    res.cookie('customer_token', result.access_token, COOKIE_OPTIONS);
    res.cookie('customer_refresh_token', result.refresh_token, COOKIE_OPTIONS);
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Try refresh token from body first, then from cookies
    const token = dto.refresh_token || req.cookies?.refreshToken || req.cookies?.customer_refresh_token;
    const result = await this.authService.refreshToken(token);

    // Determine which cookie to set based on which refresh token was used
    if (req.cookies?.customer_refresh_token && !dto.refresh_token) {
      res.cookie('customer_token', result.access_token, COOKIE_OPTIONS);
      res.cookie('customer_refresh_token', result.refresh_token, COOKIE_OPTIONS);
    } else {
      res.cookie('accessToken', result.access_token, COOKIE_OPTIONS);
      res.cookie('refreshToken', result.refresh_token, COOKIE_OPTIONS);
    }

    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (clear cookies)' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('customer_token', { path: '/' });
    res.clearCookie('customer_refresh_token', { path: '/' });
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
