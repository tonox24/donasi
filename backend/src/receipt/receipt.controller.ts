import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ReceiptService } from './receipt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('receipts')
export class ReceiptController {
  constructor(
    private readonly receiptService: ReceiptService,
  ) {}

  /**
   * GET /api/receipts
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.receiptService.findAll();
  }

  /**
   * GET /api/receipts/donation/:donationId
   */
  @Get('donation/:donationId')
  @UseGuards(JwtAuthGuard)
  findByDonation(
    @Param(
      'donationId',
      new ParseUUIDPipe(),
    )
    donationId: string,
  ) {
    return this.receiptService.findByDonation(
      donationId,
    );
  }

  /**
   * GET /api/receipts/search?receiptNumber=...
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  findByReceiptNumber(
    @Query('receiptNumber')
    receiptNumber: string,
  ) {
    if (!receiptNumber?.trim()) {
      throw new BadRequestException(
        'receiptNumber query parameter is required',
      );
    }

    return this.receiptService.findByReceiptNumber(
      receiptNumber,
    );
  }

  /**
   * GET /api/receipts/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    id: string,
  ) {
    return this.receiptService.findOne(id);
  }
}
