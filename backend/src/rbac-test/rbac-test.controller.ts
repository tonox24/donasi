import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';

@Controller('rbac-test')
export class RbacTestController {
  /**
   * TEST 1
   *
   * Requires authentication +
   * user.view permission.
   */
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('user.view')
  @Get('user-view')
  testUserViewPermission() {
    return {
      success: true,
      message:
        'user.view permission granted',
    };
  }

  /**
   * TEST 2
   *
   * Requires authentication +
   * SUPER_ADMIN role.
   */
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles('SUPER_ADMIN')
  @Get('admin-only')
  testAdminOnly() {
    return {
      success: true,
      message:
        'SUPER_ADMIN role granted',
    };
  }

  /**
   * TEST 3
   *
   * Requires authentication +
   * either ADMIN or FINANCE role.
   */
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    'ADMIN',
    'FINANCE',
  )
  @Get('admin-finance')
  testAdminFinanceRole() {
    return {
      success: true,
      message:
        'ADMIN or FINANCE role granted',
    };
  }
}
