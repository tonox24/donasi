import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('rbac-test')
export class RbacTestController {
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('user.view')
  @Get('user-view')
  testUserViewPermission() {
    return {
      success: true,
      message: 'user.view permission granted',
    };
  }
}
