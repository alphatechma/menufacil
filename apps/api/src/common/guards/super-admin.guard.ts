import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@menufacil/shared';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Access restricted to super administrators');
    }

    return true;
  }
}
