import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemExtra } from './entities/order-item-extra.entity';
import { Product } from '../product/entities/product.entity';
import { ProductVariation } from '../product/entities/product-variation.entity';
import { CustomerAddress } from '../customer/entities/customer-address.entity';
import { RestaurantTable } from '../table/entities/table.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { DeliveryZoneModule } from '../delivery-zone/delivery-zone.module';
import { CouponModule } from '../coupon/coupon.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderItemExtra, Product, ProductVariation, CustomerAddress, RestaurantTable]),
    DeliveryZoneModule,
    CouponModule,
    LoyaltyModule,
    WhatsappModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService],
})
export class OrderModule {}
