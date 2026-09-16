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

import { BeneficiaryService } from './beneficiary.service';

import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { Permissions } from '../rbac/permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

@Controller('beneficiaries')
export class BeneficiaryController {
  constructor(
    private readonly beneficiaryService: BeneficiaryService,
  ) {}

  // =========================================================
  // GET ALL
  // =========================================================

  @Get()
  findAll() {
    return this.beneficiaryService.findAll();
  }

  // =========================================================
  // GET ONE
  // =========================================================

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.beneficiaryService.findOne(id);
  }

  // =========================================================
  // CREATE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('beneficiary.create')
  @Post()
  create(
    @Body() dto: CreateBeneficiaryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.beneficiaryService.create(
      dto,
      user.id,
    );
  }

  // =========================================================
  // UPDATE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('beneficiary.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBeneficiaryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.beneficiaryService.update(
      id,
      dto,
      user.id,
    );
  }

  // =========================================================
  // DELETE
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('beneficiary.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.beneficiaryService.remove(
      id,
      user.id,
    );
  }
}
