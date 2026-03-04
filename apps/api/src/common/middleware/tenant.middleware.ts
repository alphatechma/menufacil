import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../modules/tenant/entities/tenant.entity';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const slug = req.headers['x-tenant-slug'] as string;

    if (!slug) {
      return next();
    }

    const tenant = await this.tenantRepository.findOne({
      where: { slug, is_active: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant "${slug}" not found`);
    }

    (req as any).tenant = tenant;
    next();
  }
}
