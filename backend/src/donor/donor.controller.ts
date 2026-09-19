import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  DonorStatus,
  DonorType,
} from '@prisma/client';

import { DonorService } from './donor.service';

import { CreateDonorDto } from './dto/create-donor.dto';
import { UpdateDonorDto } from './dto/update-donor.dto';
import { UpdateDonorStatusDto } from './dto/update-donor-status.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { Permissions } from '../rbac/permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

@Controller('donors')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class DonorController {
  constructor(
    private readonly donorService: DonorService,
  ) {}

  // =========================================================
  // GET ALL DONORS
  // =========================================================

  @Get()
  @Permissions('donor.view')
  findAll(
    @Query('search') search?: string,
    @Query('donorType') donorType?: DonorType,
    @Query('status') status?: DonorStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.donorService.findAll({
      search,
      donorType,
      status,
      page,
      limit,
    });
  }

  // =========================================================
  // GET DONOR
  // =========================================================

  @Get(':id')
  @Permissions('donor.view')
  findOne(
    @Param('id') id: string,
  ) {
    return this.donorService.findOne(id);
  }

  // =========================================================
  // DONATION HISTORY
  // =========================================================

  @Get(':id/donations')
  @Permissions('donor.view')
  findDonations(
    @Param('id') id: string,
  ) {
    return this.donorService.findDonations(id);
  }

  // =========================================================
  // DONOR SUMMARY
  // =========================================================

  @Get(':id/summary')
  @Permissions('donor.view')
  getSummary(
    @Param('id') id: string,
  ) {
    return this.donorService.getSummary(id);
  }

  // =========================================================
  // CREATE
  // =========================================================

  @Post()
  @Permissions('donor.create')
  create(
    @Body() dto: CreateDonorDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.donorService.create(
      dto,
      user.id,
    );
  }

  // =========================================================
  // UPDATE
  // =========================================================

  @Patch(':id')
  @Permissions('donor.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDonorDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.donorService.update(
      id,
      dto,
      user.id,
    );
  }

  // =========================================================
  // UPDATE STATUS
  // =========================================================

  @Patch(':id/status')
  @Permissions('donor.update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDonorStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.donorService.updateStatus(
      id,
      dto.status,
      user.id,
    );
  }

  // =========================================================
  // DELETE
  // =========================================================

  @Delete(':id')
  @Permissions('donor.delete')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.donorService.remove(
      id,
      user.id,
    );
  }
}
