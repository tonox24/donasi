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

import { CampaignCategoryService } from './campaign-category.service';

import { CreateCampaignCategoryDto } from './dto/create-campaign-category.dto';
import { UpdateCampaignCategoryDto } from './dto/update-campaign-category.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { Permissions } from '../rbac/permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

@Controller('campaign-categories')
export class CampaignCategoryController {
  constructor(
    private readonly campaignCategoryService: CampaignCategoryService,
  ) {}

  @Get()
  findAll() {
    return this.campaignCategoryService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.campaignCategoryService.findOne(id);
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign-category.create')
  @Post()
  create(
    @Body() dto: CreateCampaignCategoryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignCategoryService.create(
      dto,
      user.id,
    );
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign-category.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignCategoryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignCategoryService.update(
      id,
      dto,
      user.id,
    );
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign-category.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignCategoryService.remove(
      id,
      user.id,
    );
  }
}
