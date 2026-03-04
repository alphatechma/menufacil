import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { UserRole } from '@menufacil/shared';
import { CustomerService } from './customer.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CurrentTenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Customers')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('customers')
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all customers (admin)' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.service.findAllByTenant(tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a customer (admin)' })
  create(@Body() dto: CreateCustomerDto, @CurrentTenant('id') tenantId: string) {
    return this.service.create(dto, tenantId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my profile (customer)' })
  getMyProfile(@CurrentUser('id') id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.findById(id, tenantId);
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get customer by ID (admin)' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.findById(id, tenantId);
  }
}
