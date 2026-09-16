import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { DonationService } from './donation.service';
import { CreateDonationDto } from './dto/create-donation.dto';

import { CurrentUser } from '../auth/current-user.decorator';

@Controller('donations')
export class DonationController {
  constructor(
    private readonly donationService: DonationService,
  ) {}

  /**
   * CREATE DONATION
   *
   * Guest donor is allowed.
   * Logged-in donor can also create donation.
   */
  @Post()
  create(
    @Body() dto: CreateDonationDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.donationService.create(
      dto,
      user?.id,
    );
  }

  /**
   * GET ALL DONATIONS
   */
  @Get()
  findAll() {
    return this.donationService.findAll();
  }

  /**
   * GET DONATIONS BY CAMPAIGN
   *
   * Must be declared before /:id.
   */
  @Get('campaign/:campaignId')
  findByCampaign(
    @Param('campaignId') campaignId: string,
  ) {
    return this.donationService.findByCampaign(
      campaignId,
    );
  }

  /**
   * GET DONATIONS BY DONOR
   */
  @Get('donor/:donorId')
  findByDonor(
    @Param('donorId') donorId: string,
  ) {
    return this.donationService.findByDonor(
      donorId,
    );
  }

  /**
   * GET DONATION DETAIL
   */
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.donationService.findOne(id);
  }
}
