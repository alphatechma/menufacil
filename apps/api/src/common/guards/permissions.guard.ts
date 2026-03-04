import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { DataSource } from 'typeorm';
import { UserRole } from '@menufacil/shared';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // SuperAdmin and general Admin have implicit rights
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      return true;
    }

    try {
      const userEntity = await this.dataSource.query(
        `
        SELECT p.key 
        FROM users u
        JOIN role_permissions rp ON u.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = $1
        `,
        [user.id]
      );

      const userPermissions = userEntity.map((p: any) => p.key);

      return requiredPermissions.some((permission) => userPermissions.includes(permission));
    } catch (e) {
      console.error('Error fetching permissions:', e);
      return false;
    }
  }
}
