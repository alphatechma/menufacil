import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductVariation } from './entities/product-variation.entity';
import { ExtraGroup } from './entities/extra-group.entity';
import { Extra } from './entities/extra.entity';
import { ProductController, ExtraGroupController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariation, ExtraGroup, Extra])],
  controllers: [ProductController, ExtraGroupController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService],
})
export class ProductModule {}
