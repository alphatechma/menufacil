import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AddCreditDto } from './dto/add-credit.dto';
import { CurrentTenant, CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Wallet')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallet')
export class WalletController {
  constructor(private readonly service: WalletService) {}

  // --- Customer endpoints ---

  @Get('balance')
  @ApiOperation({ summary: 'Get my wallet balance (customer)' })
  getBalance(
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getBalance(customerId, tenantId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get my wallet transactions (customer)' })
  getTransactions(
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getTransactions(customerId, tenantId);
  }

  // --- Admin endpoints ---

  @Post('admin/credit')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:update')
  @ApiOperation({ summary: 'Add credit to a customer wallet (admin)' })
  addCredit(
    @Body() dto: AddCreditDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.addCredit(
      dto.customerId,
      tenantId,
      dto.amount,
      dto.description,
      dto.orderId,
    );
  }

  @Get('admin/:customerId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get customer wallet info (admin)' })
  getCustomerWallet(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getWalletInfo(customerId, tenantId);
  }
}
