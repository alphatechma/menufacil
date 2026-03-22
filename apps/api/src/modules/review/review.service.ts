import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { Order } from '../order/entities/order.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async create(
    customerId: string,
    tenantId: string,
    dto: { orderId: string; rating: number; comment?: string },
  ) {
    // Validate rating
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check order exists and belongs to customer
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId, customer_id: customerId, tenant_id: tenantId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check order is delivered/picked_up/served
    const completedStatuses = ['delivered', 'picked_up', 'served'];
    if (!completedStatuses.includes(order.status)) {
      throw new BadRequestException('You can only review completed orders');
    }

    // Check if already reviewed
    const existing = await this.reviewRepo.findOne({
      where: { order_id: dto.orderId, customer_id: customerId },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this order');
    }

    const review = this.reviewRepo.create({
      order_id: dto.orderId,
      customer_id: customerId,
      tenant_id: tenantId,
      rating: dto.rating,
      comment: dto.comment || null,
    });

    return this.reviewRepo.save(review);
  }

  async getByTenant(
    tenantId: string,
    filters?: { rating?: number; page?: number; limit?: number },
  ) {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.customer', 'customer')
      .leftJoinAndSelect('review.order', 'order')
      .where('review.tenant_id = :tenantId', { tenantId })
      .orderBy('review.created_at', 'DESC');

    if (filters?.rating) {
      qb.andWhere('review.rating = :rating', { rating: filters.rating });
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [reviews, total] = await qb.getManyAndCount();

    return {
      data: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        reply: r.reply,
        replied_at: r.replied_at,
        created_at: r.created_at,
        customer_name: r.customer?.name || 'Cliente',
        order_number: r.order?.order_number || '',
        order_id: r.order_id,
      })),
      total,
      page,
      limit,
    };
  }

  async reply(tenantId: string, reviewId: string, replyText: string) {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId, tenant_id: tenantId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.reply = replyText;
    review.replied_at = new Date();

    return this.reviewRepo.save(review);
  }

  async getStats(tenantId: string) {
    const reviews = await this.reviewRepo.find({
      where: { tenant_id: tenantId },
    });

    const total = reviews.length;
    if (total === 0) {
      return {
        average_rating: 0,
        total_reviews: 0,
        by_star: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        nps_score: 0,
      };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;

    const byStar = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      byStar[r.rating as keyof typeof byStar]++;
    });

    // NPS: promoters (4-5) - detractors (1-2) / total * 100
    const promoters = byStar[4] + byStar[5];
    const detractors = byStar[1] + byStar[2];
    const nps = Math.round(((promoters - detractors) / total) * 100);

    return {
      average_rating: Math.round(average * 10) / 10,
      total_reviews: total,
      by_star: byStar,
      nps_score: nps,
    };
  }

  async getProductRatings(tenantId: string) {
    const result = await this.reviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.order', 'order')
      .innerJoin('order.items', 'item')
      .where('review.tenant_id = :tenantId', { tenantId })
      .select('item.product_id', 'product_id')
      .addSelect('item.product_name', 'product_name')
      .addSelect('AVG(review.rating)', 'avg_rating')
      .addSelect('COUNT(review.id)', 'review_count')
      .groupBy('item.product_id')
      .addGroupBy('item.product_name')
      .orderBy('avg_rating', 'DESC')
      .getRawMany();

    return result.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      avg_rating: Math.round(parseFloat(r.avg_rating) * 10) / 10,
      review_count: parseInt(r.review_count),
    }));
  }

  async canReview(customerId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customer_id: customerId },
    });

    if (!order) {
      return { can_review: false, reason: 'Order not found' };
    }

    const completedStatuses = ['delivered', 'picked_up', 'served'];
    if (!completedStatuses.includes(order.status)) {
      return { can_review: false, reason: 'Order not completed yet' };
    }

    const existing = await this.reviewRepo.findOne({
      where: { order_id: orderId, customer_id: customerId },
    });

    if (existing) {
      return { can_review: false, reason: 'Already reviewed' };
    }

    return { can_review: true };
  }

  async getMyReviews(customerId: string, tenantId: string) {
    return this.reviewRepo.find({
      where: { customer_id: customerId, tenant_id: tenantId },
      relations: ['order'],
      order: { created_at: 'DESC' },
    });
  }
}
