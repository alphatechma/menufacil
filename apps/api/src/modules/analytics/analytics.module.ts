import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CustomerSegmentationService } from './customer-segmentation.service';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { Customer } from '../customer/entities/customer.entity';
import { Product } from '../product/entities/product.entity';
import { Category } from '../category/entities/category.entity';
import { DeliveryPerson } from '../delivery-person/entities/delivery-person.entity';
import { DeliveryZone } from '../delivery-zone/entities/delivery-zone.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { ProductRecipe } from '../inventory/entities/product-recipe.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Customer,
      Product,
      Category,
      DeliveryPerson,
      DeliveryZone,
      InventoryItem,
      ProductRecipe,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, CustomerSegmentationService],
  exports: [AnalyticsService, CustomerSegmentationService],
})
export class AnalyticsModule {}
