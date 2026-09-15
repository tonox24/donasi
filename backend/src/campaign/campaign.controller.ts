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

import { CampaignService } from './campaign.service';

import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { Permissions } from '../rbac/permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
  ) {}

  @Get()
  findAll() {
    return this.campaignService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.campaignService.findOne(id);
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.create')
  @Post()
  create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.create(
      dto,
      user.id,
    );
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.update(
      id,
      dto,
      user.id,
    );
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.remove(
      id,
      user.id,
    );
  }
}
