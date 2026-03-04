import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULES_KEY } from '../decorators/require-modules.decorator';
import { DataSource } from 'typeorm';
import { UserRole } from '@menufacil/shared';

@Injectable()
export class ModulesGuard implements CanActivate {
  constructor(private reflector: Reflector, private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModules = this.reflector.getAllAndOverride<string[]>(MODULES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModules || requiredModules.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (!user.tenant_id) {
      return false;
    }

    try {
      const tenantModules = await this.dataSource.query(
        `
        SELECT sm.key 
        FROM tenants t
        JOIN plan_modules pm ON t.plan_id = pm.plan_id
        JOIN system_modules sm ON pm.module_id = sm.id
        WHERE t.id = $1
        `,
        [user.tenant_id]
      );

      const activeModules = tenantModules.map((m: any) => m.key);

      return requiredModules.some((mod) => activeModules.includes(mod));
    } catch (e) {
      console.error('Error fetching modules:', e);
      return false;
    }
  }
}
