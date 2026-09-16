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
import { AssignBeneficiaryDto } from './dto/assign-beneficiary.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { Permissions } from '../rbac/permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
  ) {}

  // =========================================================
  // GET ALL CAMPAIGNS
  // =========================================================

  @Get()
  findAll() {
    return this.campaignService.findAll();
  }

  // =========================================================
  // GET ONE CAMPAIGN
  // =========================================================

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.campaignService.findOne(id);
  }

  // =========================================================
  // GET CAMPAIGN BENEFICIARIES
  // =========================================================

  @Get(':id/beneficiaries')
  findBeneficiaries(
    @Param('id') id: string,
  ) {
    return this.campaignService.findBeneficiaries(id);
  }

  // =========================================================
  // CREATE CAMPAIGN
  // =========================================================

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

  // =========================================================
  // ASSIGN BENEFICIARY TO CAMPAIGN
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.update')
  @Post(':id/beneficiaries')
  assignBeneficiary(
    @Param('id') campaignId: string,
    @Body() dto: AssignBeneficiaryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.assignBeneficiary(
      campaignId,
      dto.beneficiaryId,
      user.id,
    );
  }

  // =========================================================
  // REMOVE BENEFICIARY FROM CAMPAIGN
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.update')
  @Delete(':id/beneficiaries/:beneficiaryId')
  removeBeneficiary(
    @Param('id') campaignId: string,
    @Param('beneficiaryId') beneficiaryId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.removeBeneficiary(
      campaignId,
      beneficiaryId,
      user.id,
    );
  }

  // =========================================================
  // UPDATE CAMPAIGN
  // =========================================================

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

  // =========================================================
  // SUBMIT CAMPAIGN FOR REVIEW
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.update')
  @Post(':id/submit-review')
  submitForReview(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.submitForReview(
      id,
      user.id,
    );
  }

  // =========================================================
  // APPROVE / PUBLISH CAMPAIGN
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.approve')
  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.approve(
      id,
      user.id,
    );
  }

  // =========================================================
  // PAUSE CAMPAIGN
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.update')
  @Post(':id/pause')
  pause(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.pause(
      id,
      user.id,
    );
  }

  // =========================================================
  // RESUME CAMPAIGN
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.update')
  @Post(':id/resume')
  resume(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.resume(
      id,
      user.id,
    );
  }

  // =========================================================
  // COMPLETE CAMPAIGN
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.update')
  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.complete(
      id,
      user.id,
    );
  }

  // =========================================================
  // CANCEL CAMPAIGN
  // =========================================================

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('campaign.update')
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignService.cancel(
      id,
      user.id,
    );
  }

  // =========================================================
  // DELETE CAMPAIGN
  // =========================================================

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
