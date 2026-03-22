import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CurrentTenant, CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Reviews')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review (customer)' })
  create(
    @Body() dto: { orderId: string; rating: number; comment?: string },
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.reviewService.create(customerId, tenantId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List reviews (admin)' })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @Query('rating') rating?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.getByTenant(tenantId, {
      rating: rating ? parseInt(rating) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get review stats (admin)' })
  getStats(@CurrentTenant('id') tenantId: string) {
    return this.reviewService.getStats(tenantId);
  }

  @Get('product-ratings')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get product ratings (admin)' })
  getProductRatings(@CurrentTenant('id') tenantId: string) {
    return this.reviewService.getProductRatings(tenantId);
  }

  @Get('can-review/:orderId')
  @ApiOperation({ summary: 'Check if customer can review an order' })
  canReview(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser('id') customerId: string,
  ) {
    return this.reviewService.canReview(customerId, orderId);
  }

  @Get('my-reviews')
  @ApiOperation({ summary: 'Get my reviews (customer)' })
  getMyReviews(
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.reviewService.getMyReviews(customerId, tenantId);
  }

  @Put(':id/reply')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:update')
  @ApiOperation({ summary: 'Reply to a review (admin)' })
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { reply: string },
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.reviewService.reply(tenantId, id, dto.reply);
  }
}
