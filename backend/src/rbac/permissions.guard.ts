import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    /**
     * Endpoint does not require permission.
     */
    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const user = request.user;

    /**
     * JwtAuthGuard should normally
     * handle this case first.
     */
    if (!user) {
      throw new ForbiddenException(
        'Authentication is required',
      );
    }

    const userPermissions: string[] =
      user.permissions ?? [];

    /**
     * User must have ALL required permissions.
     */
    const hasAllPermissions =
      requiredPermissions.every(
        (permission) =>
          userPermissions.includes(
            permission,
          ),
      );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'Insufficient permissions',
      );
    }

    return true;
  }
}
