import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CustomerLoginDto, CustomerRegisterDto } from './dto/customer-login.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { CurrentTenant, CurrentUser } from '../../common/decorators';

@ApiTags('Auth')
@ApiSecurity('tenant-slug')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('super-admin/login')
  @ApiOperation({ summary: 'Super Admin login' })
  loginSuperAdmin(@Body() dto: SuperAdminLoginDto) {
    return this.authService.loginSuperAdmin(dto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login (no tenant slug required)' })
  loginAdmin(@Body() dto: LoginDto) {
    return this.authService.loginAdmin(dto);
  }

  @Post('register-tenant')
  @ApiOperation({ summary: 'Register a new tenant with admin user (7-day trial)' })
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Post('staff/login')
  @ApiOperation({ summary: 'Staff login' })
  loginStaff(@Body() dto: LoginDto, @CurrentTenant('id') tenantId: string) {
    return this.authService.loginStaff(dto, tenantId);
  }

  @Post('staff/register')
  @ApiOperation({ summary: 'Register new staff member' })
  registerStaff(@Body() dto: RegisterDto, @CurrentTenant('id') tenantId: string) {
    return this.authService.registerStaff(dto, tenantId);
  }

  @Post('customer/login')
  @ApiOperation({ summary: 'Customer login' })
  loginCustomer(@Body() dto: CustomerLoginDto, @CurrentTenant('id') tenantId: string) {
    return this.authService.loginCustomer(dto, tenantId);
  }

  @Post('customer/register')
  @ApiOperation({ summary: 'Register new customer' })
  registerCustomer(@Body() dto: CustomerRegisterDto, @CurrentTenant('id') tenantId: string) {
    return this.authService.registerCustomer(dto, tenantId);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
