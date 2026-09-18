import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

@Injectable()
export class ReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate receipt number:
   *
   * INV-YRII/YYMMDD/YYYY/000001
   *
   * Example:
   * INV-YRII/260918/2026/000001
   */
  private async generateReceiptNumber(
    tx: TransactionClient,
    issuedAt: Date,
  ): Promise<string> {
    const dateParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(issuedAt);

    const year = Number(
      dateParts.find((part) => part.type === 'year')?.value,
    );

    const month =
      dateParts.find((part) => part.type === 'month')?.value ?? '01';

    const day =
      dateParts.find((part) => part.type === 'day')?.value ?? '01';

    /**
     * Atomic PostgreSQL upsert.
     *
     * If the year does not exist:
     *   create year with lastNumber = 1
     *
     * If the year already exists:
     *   increment lastNumber atomically
     */
    const result = await tx.$queryRaw<Array<{ lastNumber: number }>>(
      Prisma.sql`
        INSERT INTO "ReceiptSequence" ("year", "lastNumber", "updatedAt")
        VALUES (${year}, 1, NOW())
        ON CONFLICT ("year")
        DO UPDATE SET
          "lastNumber" = "ReceiptSequence"."lastNumber" + 1,
          "updatedAt" = NOW()
        RETURNING "lastNumber";
      `,
    );

    const sequence = result[0]?.lastNumber;

    if (!sequence) {
      throw new BadRequestException(
        'Failed to generate receipt sequence',
      );
    }

    const sequenceNumber = String(sequence).padStart(6, '0');

    return `INV-YRII/${String(year).slice(-2)}${month}${day}/${year}/${sequenceNumber}`;
  }

  /**
   * Create receipt for a PAID donation.
   *
   * This method is intended to be called inside
   * the same database transaction as payment settlement.
   */
  async createForPaidDonation(
    donationId: string,
    tx: TransactionClient = this.prisma,
  ) {
    const donation = await tx.donation.findUnique({
      where: {
        id: donationId,
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    if (donation.status !== 'PAID') {
      throw new BadRequestException(
        `Receipt can only be created for PAID donations. Current status: ${donation.status}`,
      );
    }

    /**
     * Prevent duplicate receipt.
     */
    const existingReceipt = await tx.receipt.findFirst({
      where: {
        donationId,
      },
    });

    if (existingReceipt) {
      return existingReceipt;
    }

    const issuedAt = donation.paidAt ?? new Date();

    const receiptNumber = await this.generateReceiptNumber(
      tx,
      issuedAt,
    );

    const receipt = await tx.receipt.create({
      data: {
        donationId: donation.id,
        receiptNumber,
        issuedAt,

        donorName: donation.donorName,
        donorEmail: donation.donorEmail,

        amount: donation.amount,
        currency: donation.currency,

        campaignId: donation.campaign.id,
        campaignTitle: donation.campaign.title,
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'RECEIPT_CREATED',
        entity: 'Receipt',
        entityId: receipt.id,
        metadata: {
          receiptNumber: receipt.receiptNumber,
          donationId: donation.id,
          campaignId: donation.campaign.id,
          amount: donation.amount.toString(),
          currency: donation.currency,
        },
      },
    });

    return receipt;
  }

  async findAll() {
    return this.prisma.receipt.findMany({
      orderBy: {
        issuedAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const receipt = await this.prisma.receipt.findUnique({
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
                slug: true,
              },
            },
            donorProfile: true,
            payments: {
              orderBy: {
                createdAt: 'desc',
              },
            },
            impacts: {
              include: {
                campaignImpact: true,
              },
            },
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return receipt;
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

    return this.prisma.receipt.findMany({
      where: {
        donationId,
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });
  }

  async findByReceiptNumber(receiptNumber: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: {
        receiptNumber,
      },
      include: {
        donation: {
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
            donorProfile: true,
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return receipt;
  }
}
