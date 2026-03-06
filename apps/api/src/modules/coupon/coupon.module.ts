import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { CouponRepository } from './coupon.repository';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon]), LoyaltyModule],
  controllers: [CouponController],
  providers: [CouponService, CouponRepository],
  exports: [CouponService],
})
export class CouponModule {}
