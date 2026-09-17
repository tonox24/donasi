import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MarkPaymentPaidDto } from './dto/mark-payment-paid.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';



@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.paymentService.findAll();
  }

  @Get('donation/:donationId')
  @UseGuards(JwtAuthGuard)
  findByDonation(
    @Param('donationId', new ParseUUIDPipe()) donationId: string,
  ) {
    return this.paymentService.findByDonation(donationId);
  }
  @Post(':id/mark-paid')
  @UseGuards(JwtAuthGuard)
  markAsPaid(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MarkPaymentPaidDto,
  ) {
    return this.paymentService.markAsPaid(
      id,
      dto.providerTransactionId,
      dto.rawResponse,
    );
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.paymentService.findOne(id);
  }
}
