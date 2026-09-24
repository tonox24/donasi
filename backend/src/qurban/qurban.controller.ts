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

import { CreateQurbanSavingDto } from './dto/create-qurban-saving.dto';
import { UpdateQurbanSavingDto } from './dto/update-qurban-saving.dto';
import { CreateQurbanContributionDto } from './dto/create-qurban-contribution.dto';
import { CreateQurbanPaymentDto } from './dto/create-qurban-payment.dto';
import { CreateQurbanPriceAdjustmentDto } from './dto/create-qurban-price-adjustment.dto';

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
  // MANAGEMENT - CREATE PACKAGE
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
  // MANAGEMENT - UPDATE PACKAGE
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
  // MANAGEMENT - DELETE PACKAGE
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

// =========================================================
// QURBAN ORDER - CREATE
// =========================================================

@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Permissions('qurban.manage')
@Post('orders')
createOrder(
  @Body() dto: CreateQurbanOrderDto,
  @CurrentUser() user: { id: string },
) {
  return this.qurbanService.createOrder(
    dto,
    user.id,
  );
}
  

  // =========================================================
  // TABUNGAN QURBAN - CREATE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Post('savings')
  createSaving(
    @Body() dto: CreateQurbanSavingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.createSaving(
      dto,
      user.id,
    );
  }

  // =========================================================
  // TABUNGAN QURBAN - LIST
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.view')
  @Get('savings')
  findAllSavings() {
    return this.qurbanService.findAllSavings();
  }

  // =========================================================
  // TABUNGAN QURBAN - DETAIL
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.view')
  @Get('savings/:id')
  findOneSaving(
    @Param('id') id: string,
  ) {
    return this.qurbanService.findOneSaving(id);
  }

  // =========================================================
  // TABUNGAN QURBAN - UPDATE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Patch('savings/:id')
  updateSaving(
    @Param('id') id: string,
    @Body() dto: UpdateQurbanSavingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.updateSaving(
      id,
      dto,
      user.id,
    );
  }

  // =========================================================
  // QURBAN PRICE ADJUSTMENT
  // =========================================================
  //
  // Example:
  //
  // Estimated price : Rp4.000.000
  // Final price     : Rp4.800.000
  // Difference      : Rp800.000
  // Shortfall       : Rp800.000
  //
  // Existing contributions are NOT modified.
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Post('savings/:id/price-adjustment')
  createPriceAdjustment(
    @Param('id') id: string,
    @Body() dto: CreateQurbanPriceAdjustmentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.createPriceAdjustment(
      id,
      dto,
      user.id,
    );
  }

  // =========================================================
  // QURBAN PRICE LOCK
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Post('savings/:id/price-lock')
  lockPrice(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.lockPrice(
      id,
      user.id,
    );
  }
  
  // =========================================================
  // SAVING PROGRESS
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.view')
  @Get('savings/:id/progress')
  getSavingProgress(
    @Param('id') id: string,
  ) {
    return this.qurbanService.getSavingProgress(id);
  }

  // =========================================================
  // CONTRIBUTIONS - CREATE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Post('savings/:id/contributions')
  createContribution(
    @Param('id') id: string,
    @Body() dto: CreateQurbanContributionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.createContribution(
      id,
      dto,
      user.id,
    );
  }

  // =========================================================
  // CONTRIBUTIONS - LIST
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.view')
  @Get('savings/:id/contributions')
  findContributions(
    @Param('id') id: string,
  ) {
    return this.qurbanService.findContributions(id);
  }

  // =========================================================
  // CREATE QURBAN PAYMENT
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Post(
    'savings/:id/contributions/:contributionId/payment',
  )
  createContributionPayment(
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
    @Body() dto: CreateQurbanPaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.createContributionPayment(
      id,
      contributionId,
      dto,
      user.id,
    );
  }

  // =========================================================
  // PAYMENT RECONCILIATION - PAID
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Post(
    'savings/:id/contributions/:contributionId/mark-paid',
  )
  markContributionPaid(
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.markContributionPaid(
      id,
      contributionId,
      user.id,
    );
  }

  // =========================================================
  // PAYMENT RECONCILIATION - FAILED
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('qurban.manage')
  @Post(
    'savings/:id/contributions/:contributionId/mark-failed',
  )
  markContributionFailed(
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.qurbanService.markContributionFailed(
      id,
      contributionId,
      user.id,
    );
  }
}
