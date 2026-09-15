import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    /**
     * Endpoint does not require role.
     */
    if (
      !requiredRoles ||
      requiredRoles.length === 0
    ) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'Authentication is required',
      );
    }

    const userRoles: string[] =
      user.roles ?? [];

    /**
     * User only needs ONE of the
     * required roles.
     */
    const hasRole =
      requiredRoles.some(
        (role) =>
          userRoles.includes(role),
      );

    if (!hasRole) {
      throw new ForbiddenException(
        'Insufficient role',
      );
    }

    return true;
  }
}
