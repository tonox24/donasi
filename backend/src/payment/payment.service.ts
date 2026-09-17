import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    const payment = await this.prisma.paymentTransaction.findUnique({
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
