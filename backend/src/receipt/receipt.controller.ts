import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { ReceiptService } from './receipt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('receipts')
export class ReceiptController {
  constructor(
    private readonly receiptService: ReceiptService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.receiptService.findAll();
  }

  @Get('donation/:donationId')
  @UseGuards(JwtAuthGuard)
  findByDonation(
    @Param('donationId', new ParseUUIDPipe())
    donationId: string,
  ) {
    return this.receiptService.findByDonation(donationId);
  }

  @Get('number/:receiptNumber')
  @UseGuards(JwtAuthGuard)
  findByReceiptNumber(
    @Param('receiptNumber')
    receiptNumber: string,
  ) {
    return this.receiptService.findByReceiptNumber(
      receiptNumber,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,
  ) {
    return this.receiptService.findOne(id);
  }
}
