import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { QurbanService } from './qurban.service';

import { CreateQurbanPackageDto } from './dto/create-qurban-package.dto';
import { UpdateQurbanPackageDto } from './dto/update-qurban-package.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { Permissions } from '../rbac/permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

@Controller('qurban')
export class QurbanController {
  constructor(
    private readonly qurbanService: QurbanService,
  ) {}

  // =========================================================
  // PUBLIC - QURBAN PACKAGES
  // =========================================================

  @Get('packages')
  findAllPackages() {
    return this.qurbanService.findAllPackages();
  }

  @Get('packages/:id')
  findOnePackage(
    @Param('id') id: string,
  ) {
    return this.qurbanService.findOnePackage(id);
  }

  // =========================================================
  // MANAGEMENT - CREATE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Post('packages')
  createPackage(
    @Body() dto: CreateQurbanPackageDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.createPackage(
      dto,
      user.id,
    );
  }

  // =========================================================
  // MANAGEMENT - UPDATE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Patch('packages/:id')
  updatePackage(
    @Param('id') id: string,
    @Body() dto: UpdateQurbanPackageDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.updatePackage(
      id,
      dto,
      user.id,
    );
  }

  // =========================================================
  // MANAGEMENT - DELETE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Delete('packages/:id')
  deletePackage(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.deletePackage(
      id,
      user.id,
    );
  }
}
