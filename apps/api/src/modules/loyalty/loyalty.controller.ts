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
import { LoyaltyService } from './loyalty.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { CurrentTenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Loyalty')
@ApiSecurity('tenant-slug')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get('rewards')
  @ApiOperation({ summary: 'List available rewards' })
  findRewards(@CurrentTenant('id') tenantId: string) {
    return this.service.findRewards(tenantId);
  }

  @Post('rewards')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a reward' })
  createReward(@Body() dto: CreateRewardDto, @CurrentTenant('id') tenantId: string) {
    return this.service.createReward(dto, tenantId);
  }

  @Delete('rewards/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a reward' })
  removeReward(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.removeReward(id, tenantId);
  }

  @Post('redeem/:rewardId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem a reward (customer)' })
  redeem(
    @Param('rewardId', ParseUUIDPipe) rewardId: string,
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.redeemReward(customerId, rewardId, tenantId);
  }
}
