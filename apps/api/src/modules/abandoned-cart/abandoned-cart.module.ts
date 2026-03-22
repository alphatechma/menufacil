import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbandonedCart } from './abandoned-cart.entity';
import { AbandonedCartController } from './abandoned-cart.controller';
import { AbandonedCartService } from './abandoned-cart.service';

@Module({
  imports: [TypeOrmModule.forFeature([AbandonedCart])],
  controllers: [AbandonedCartController],
  providers: [AbandonedCartService],
  exports: [AbandonedCartService],
})
export class AbandonedCartModule {}
