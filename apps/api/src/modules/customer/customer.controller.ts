import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CurrentTenant, CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Customers')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('customers')
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List all customers (admin)' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.service.findAllByTenant(tenantId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:create')
  @ApiOperation({ summary: 'Create a customer (admin)' })
  create(@Body() dto: CreateCustomerDto, @CurrentTenant('id') tenantId: string) {
    return this.service.create(dto, tenantId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my profile (customer)' })
  getMyProfile(@CurrentUser('id') id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.findById(id, tenantId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update my profile (customer)' })
  updateMyProfile(
    @CurrentUser('id') id: string,
    @CurrentTenant('id') tenantId: string,
    @Body() body: { name?: string; email?: string; password?: string; birth_date?: string; gender?: string; cpf?: string },
  ) {
    return this.service.updateProfile(id, tenantId, body);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Get my addresses' })
  getMyAddresses(@CurrentUser('id') id: string) {
    return this.service.getAddresses(id);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Add a new address' })
  addAddress(@CurrentUser('id') id: string, @Body() dto: CreateAddressDto) {
    return this.service.addAddress(id, dto);
  }

  @Delete('me/addresses/:addressId')
  @ApiOperation({ summary: 'Remove an address' })
  removeAddress(
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @CurrentUser('id') id: string,
  ) {
    return this.service.removeAddress(addressId, id);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get customer by ID (admin)' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.findById(id, tenantId);
  }
}
