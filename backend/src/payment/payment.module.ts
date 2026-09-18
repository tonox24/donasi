import { Module } from '@nestjs/common';

import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ReceiptModule } from '../receipt/receipt.module';

@Module({
  imports: [
    ReceiptModule,
  ],
  controllers: [
    PaymentController,
  ],
  providers: [
    PaymentService,
  ],
  exports: [
    PaymentService,
  ],
})
export class PaymentModule {}
