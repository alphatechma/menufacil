import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, ILike } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

interface LogParams {
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

interface FindAllFilters {
  action?: string;
  entity_type?: string;
  user_id?: string;
  user_email?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(params: LogParams): Promise<AuditLog> {
    const entry = this.auditLogRepository.create({
      user_id: params.userId,
      user_email: params.userEmail,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      details: params.details,
      ip_address: params.ipAddress,
    });
    return this.auditLogRepository.save(entry);
  }

  async findAll(filters: FindAllFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (filters.action) {
      where.action = filters.action;
    }
    if (filters.entity_type) {
      where.entity_type = filters.entity_type;
    }
    if (filters.user_id) {
      where.user_id = filters.user_id;
    }
    if (filters.user_email) {
      where.user_email = ILike(`%${filters.user_email}%`);
    }
    if (filters.from && filters.to) {
      where.created_at = Between(new Date(filters.from), new Date(filters.to));
    } else if (filters.from) {
      where.created_at = Between(new Date(filters.from), new Date());
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const actionCounts = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)::int', 'count')
      .where('log.created_at >= :from', { from: thirtyDaysAgo })
      .groupBy('log.action')
      .orderBy('count', 'DESC')
      .getRawMany();

    const entityCounts = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.entity_type', 'entity_type')
      .addSelect('COUNT(*)::int', 'count')
      .where('log.created_at >= :from', { from: thirtyDaysAgo })
      .groupBy('log.entity_type')
      .orderBy('count', 'DESC')
      .getRawMany();

    const dailyCounts = await this.auditLogRepository
      .createQueryBuilder('log')
      .select("TO_CHAR(log.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)::int', 'count')
      .where('log.created_at >= :from', { from: thirtyDaysAgo })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      action_counts: actionCounts,
      entity_counts: entityCounts,
      daily_counts: dailyCounts,
    };
  }
}
