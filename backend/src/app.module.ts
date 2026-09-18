import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';
import { RbacModule } from './rbac/rbac.module';
import { RbacTestModule } from './rbac-test/rbac-test.module';
import { ProgramModule } from './program/program.module';
import { CampaignModule } from './campaign/campaign.module';
import { CampaignCategoryModule } from './campaign-category/campaign-category.module';
import { BeneficiaryModule } from './beneficiary/beneficiary.module';
import { DonationModule } from './donation/donation.module';
import { PaymentModule } from './payment/payment.module';
import { ReceiptModule } from './receipt/receipt.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    RbacModule,

    AuthModule,

    RbacTestModule,

    ProgramModule,

    CampaignModule,
    CampaignCategoryModule,
    BeneficiaryModule,
    DonationModule,
    PaymentModule,
    ReceiptModule,

  ],

  controllers: [
    HealthController,
  ],
})
export class AppModule {}

