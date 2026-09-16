import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { DonationService } from './donation.service';
import { CreateDonationDto } from './dto/create-donation.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
   *
   * If Authorization Bearer token is provided,
   * the donation will be associated with the logged-in user.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateDonationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.donationService.create(
      dto,
      user.id,
    );
  }

  /**
   * GET ALL DONATIONS
   *
   * Temporary endpoint for MVP development.
   *
   * Later this endpoint should be protected
   * using donation.view permission.
   */
  @Get()
  findAll() {
    return this.donationService.findAll();
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

  /**
   * GET DONATIONS BY CAMPAIGN
   *
   * IMPORTANT:
   * This route must be declared before /:id
   * to make the route intention explicit.
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
}
