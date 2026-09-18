import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
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

  @Get('search')
  @UseGuards(JwtAuthGuard)
  findByReceiptNumber(
    @Query('receiptNumber') receiptNumber: string,
  ) {
    if (!receiptNumber?.trim()) {
      throw new BadRequestException(
        'receiptNumber query parameter is required',
      );
    }

    return this.receiptService.findByReceiptNumber(
      receiptNumber.trim(),
    );
  }

    @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'application/pdf')
  getPdf(
    @Param(
      'id',
      new ParseUUIDPipe(),
    )
    id: string,
  ) {
    return this.receiptService
      .generatePdf(id)
      .then(
        (pdfBuffer) =>
          new StreamableFile(pdfBuffer, {
            type: 'application/pdf',
            disposition: 'attachment',
          }),
      );
  }

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
