import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    const donation = await this.prisma.donation.findUnique({
      where: {
        id: dto.donationId,
      },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    if (donation.status !== 'PENDING') {
      throw new BadRequestException(
        `Payment can only be created for PENDING donations. Current status: ${donation.status}`,
      );
    }

    const existingPayment =
      await this.prisma.paymentTransaction.findFirst({
        where: {
          donationId: dto.donationId,
          status: {
            in: ['INITIATED', 'PENDING', 'PAID'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    if (existingPayment) {
      throw new BadRequestException(
        'An active payment already exists for this donation',
      );
    }

    const transactionReference = `DON-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.paymentTransaction.create({
        data: {
          donationId: donation.id,
          transactionReference,
          provider: dto.provider,
          paymentMethod: dto.paymentMethod,
          amount: donation.amount,
          currency: donation.currency,
          status: 'INITIATED',
        },
        include: {
          donation: {
            select: {
              id: true,
              amount: true,
              currency: true,
              donorName: true,
              status: true,
              campaignId: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_CREATED',
          entity: 'PaymentTransaction',
          entityId: createdPayment.id,
          metadata: {
            donationId: donation.id,
            transactionReference,
            provider: dto.provider,
            paymentMethod: dto.paymentMethod,
            amount: donation.amount.toString(),
            currency: donation.currency,
          },
        },
      });

      return createdPayment;
    });

    return payment;
  }

  async markAsPaid(
    id: string,
    providerTransactionId: string,
    rawResponse?: Prisma.InputJsonValue,
  ) {
    const payment =
      await this.prisma.paymentTransaction.findUnique({
        where: {
          id,
        },
        include: {
          donation: true,
        },
      });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'PAID') {
      throw new BadRequestException(
        'Payment is already marked as PAID',
      );
    }

    if (!['INITIATED', 'PENDING'].includes(payment.status)) {
      throw new BadRequestException(
        `Payment cannot be marked as PAID from status: ${payment.status}`,
      );
    }

    if (payment.donation.status !== 'PENDING') {
      throw new BadRequestException(
        `Donation cannot be marked as PAID from status: ${payment.donation.status}`,
      );
    }

    const paidAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment =
        await tx.paymentTransaction.update({
          where: {
            id,
          },
          data: {
            status: 'PAID',
            providerTransactionId,
            paidAt,
            rawResponse: rawResponse ?? Prisma.JsonNull,
          },
        });

      const updatedDonation = await tx.donation.update({
        where: {
          id: payment.donationId,
        },
        data: {
          status: 'PAID',
          paidAt,
        },
      });

      const updatedCampaign = await tx.campaign.update({
        where: {
          id: payment.donation.campaignId,
        },
        data: {
          collectedAmount: {
            increment: payment.donation.amount,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_PAID',
          entity: 'PaymentTransaction',
          entityId: payment.id,
          metadata: {
            donationId: payment.donationId,
            campaignId: payment.donation.campaignId,
            providerTransactionId,
            amount: payment.amount.toString(),
            currency: payment.currency,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'DONATION_PAID',
          entity: 'Donation',
          entityId: payment.donationId,
          metadata: {
            paymentId: payment.id,
            campaignId: payment.donation.campaignId,
            amount: payment.donation.amount.toString(),
            currency: payment.donation.currency,
          },
        },
      });

      return {
        payment: updatedPayment,
        donation: updatedDonation,
        campaign: {
          id: updatedCampaign.id,
          collectedAmount: updatedCampaign.collectedAmount,
        },
      };
    });
  }

  async markAsFailed(
    id: string,
    providerTransactionId?: string,
    rawResponse?: Record<string, unknown>,
  ) {
    const payment =
      await this.prisma.paymentTransaction.findUnique({
        where: {
          id,
        },
        include: {
          donation: true,
        },
      });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'PAID') {
      throw new BadRequestException(
        'PAID payment cannot be marked as FAILED',
      );
    }

    if (!['INITIATED', 'PENDING'].includes(payment.status)) {
      throw new BadRequestException(
        `Payment cannot be marked as FAILED from status: ${payment.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment =
        await tx.paymentTransaction.update({
          where: {
            id,
          },
          data: {
            status: 'FAILED',
            providerTransactionId,
            rawResponse: rawResponse
              ? (JSON.parse(
                  JSON.stringify(rawResponse),
                ) as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
        });

      await tx.auditLog.create({
        data: {
          action: 'PAYMENT_FAILED',
          entity: 'PaymentTransaction',
          entityId: payment.id,
          metadata: {
            donationId: payment.donationId,
            campaignId: payment.donation.campaignId,
            providerTransactionId:
              providerTransactionId ?? null,
            amount: payment.amount.toString(),
            currency: payment.currency,
          },
        },
      });

      return {
        payment: updatedPayment,
        donation: {
          id: payment.donation.id,
          status: payment.donation.status,
        },
      };
    });
  }

  async findAll() {
    return this.prisma.paymentTransaction.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        donation: {
          select: {
            id: true,
            amount: true,
            currency: true,
            donorName: true,
            status: true,
            campaignId: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const payment =
      await this.prisma.paymentTransaction.findUnique({
        where: {
          id,
        },
        include: {
          donation: {
            include: {
              campaign: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                },
              },
              donorProfile: true,
              impacts: true,
            },
          },
        },
      });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findByDonation(donationId: string) {
    const donation = await this.prisma.donation.findUnique({
      where: {
        id: donationId,
      },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    return this.prisma.paymentTransaction.findMany({
      where: {
        donationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
