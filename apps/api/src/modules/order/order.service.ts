import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OrderStatus, PaymentStatus, ORDER_STATUS_TRANSITIONS } from '@menufacil/shared';
import { OrderRepository } from './order.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { ProductVariation } from '../product/entities/product-variation.entity';
import { DeliveryZoneService } from '../delivery-zone/delivery-zone.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariation)
    private readonly variationRepo: Repository<ProductVariation>,
    private readonly deliveryZoneService: DeliveryZoneService,
  ) {}

  async create(dto: CreateOrderDto, customerId: string, tenantId: string): Promise<Order> {
    const orderNumber = await this.orderRepository.getNextOrderNumber(tenantId);

    // Resolve products from DB
    const productIds = dto.items.map((i) => i.product_id);
    const products = await this.productRepo.find({
      where: { id: In(productIds), tenant_id: tenantId },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Resolve variations if any
    const variationIds = dto.items.map((i) => i.variation_id).filter(Boolean) as string[];
    let variationMap = new Map<string, ProductVariation>();
    if (variationIds.length > 0) {
      const variations = await this.variationRepo.find({
        where: { id: In(variationIds) },
      });
      variationMap = new Map(variations.map((v) => [v.id, v]));
    }

    // Calculate delivery fee from neighborhood
    let deliveryFee = 0;
    if (dto.address?.neighborhood) {
      const result = await this.deliveryZoneService.findByNeighborhood(dto.address.neighborhood, tenantId);
      if (result.zone) {
        deliveryFee = result.fee;
      }
    }

    // Build items with resolved data
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new BadRequestException(`Produto nao encontrado: ${item.product_id}`);
      }

      const variation = item.variation_id ? variationMap.get(item.variation_id) : null;
      const unitPrice = variation ? Number(variation.price) : Number(product.base_price);
      const productName = product.name;
      const variationName = variation ? variation.name : null;

      return {
        product_id: item.product_id,
        variation_id: item.variation_id || null,
        product_name: productName,
        variation_name: variationName,
        unit_price: unitPrice,
        quantity: item.quantity,
        extras: item.extras?.map((e) => ({
          extra_name: e.name,
          extra_price: e.price,
        })) || [],
      };
    });

    const subtotal = orderItems.reduce((sum, item) => {
      const extrasTotal = item.extras.reduce((s, e) => s + Number(e.extra_price), 0);
      return sum + (item.unit_price + extrasTotal) * item.quantity;
    }, 0);

    const total = subtotal + deliveryFee;

    const order = this.orderRepository.create({
      tenant_id: tenantId,
      customer_id: customerId,
      order_number: orderNumber,
      status: OrderStatus.PENDING,
      payment_method: dto.payment_method,
      payment_status: PaymentStatus.PENDING,
      subtotal,
      delivery_fee: deliveryFee,
      discount: 0,
      total,
      address_snapshot: dto.address as any,
      notes: dto.notes,
      items: orderItems as any,
    });

    const savedOrder = await this.orderRepository.save(order);
    return this.findById(savedOrder.id, tenantId);
  }

  async findByTenant(tenantId: string): Promise<Order[]> {
    return this.orderRepository.findByTenant(tenantId);
  }

  async findByCustomer(customerId: string, tenantId: string): Promise<Order[]> {
    return this.orderRepository.findByCustomer(customerId, tenantId);
  }

  async findById(id: string, tenantId: string): Promise<Order> {
    const order = await this.orderRepository.findById(id, tenantId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateStatus(id: string, status: OrderStatus, tenantId: string): Promise<Order> {
    const order = await this.findById(id, tenantId);

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from "${order.status}" to "${status}"`,
      );
    }

    await this.orderRepository.updateStatus(id, tenantId, { status });
    return this.findById(id, tenantId);
  }
}
