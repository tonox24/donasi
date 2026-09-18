import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate receipt number.
   *
   * Format:
   *
   * INV-YRII/YYMMDD/YYYY/000001
   *
   * Example:
   *
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
   * Atomic yearly sequence.
   *
   * First receipt of the year:
   *   1
   *
   * Next receipt:
   *   2
   *
   * The increment is performed by PostgreSQL through
   * Prisma's atomic increment operation.
   */
  const sequence = await tx.receiptSequence.upsert({
    where: {
      year,
    },
    create: {
      year,
      lastNumber: 1,
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
  });

  const sequenceNumber = String(sequence.lastNumber).padStart(
    6,
    '0',
  );

  return `INV-YRII/${String(year).slice(-2)}${month}${day}/${year}/${sequenceNumber}`;
}
  /**
   * Create receipt for a PAID donation.
   *
   * This method is called from the same
   * database transaction as payment settlement.
   */
  async createForPaidDonation(
    donationId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const donation =
      await tx.donation.findUnique({
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
      throw new NotFoundException(
        'Donation not found',
      );
    }

    /**
     * Receipt only for PAID donation.
     */
    if (donation.status !== 'PAID') {
      throw new BadRequestException(
        `Receipt can only be created for PAID donations. Current status: ${donation.status}`,
      );
    }

    /**
     * One donation = one receipt.
     *
     * donationId is UNIQUE in database.
     */
    const existingReceipt =
      await tx.receipt.findUnique({
        where: {
          donationId,
        },
      });

    if (existingReceipt) {
      return existingReceipt;
    }

    const issuedAt =
      donation.paidAt ?? new Date();

    const receiptNumber =
      await this.generateReceiptNumber(
        tx,
        issuedAt,
      );

    const receipt =
      await tx.receipt.create({
        data: {
          donationId:
            donation.id,

          receiptNumber,

          issuedAt,

          donorName:
            donation.donorName,

          donorEmail:
            donation.donorEmail,

          amount:
            donation.amount,

          currency:
            donation.currency,

          campaignId:
            donation.campaign.id,

          campaignTitle:
            donation.campaign.title,
        },
      });

    /**
     * Audit log.
     */
    await tx.auditLog.create({
      data: {
        action:
          'RECEIPT_CREATED',

        entity:
          'Receipt',

        entityId:
          receipt.id,

        metadata: {
          receiptNumber:
            receipt.receiptNumber,

          donationId:
            donation.id,

          campaignId:
            donation.campaign.id,

          amount:
            donation.amount.toString(),

          currency:
            donation.currency,
        },
      },
    });

    return receipt;
  }

  /**
   * Get all receipts.
   */
  async findAll() {
    return this.prisma.receipt.findMany({
      orderBy: {
        issuedAt: 'desc',
      },
    });
  }

  /**
   * Get receipt by ID.
   */
  async findOne(id: string) {
    const receipt =
      await this.prisma.receipt.findUnique({
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
                  status: true,
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
      throw new NotFoundException(
        'Receipt not found',
      );
    }

    return receipt;
  }

  /**
   * Get receipt by donation.
   */
  async findByDonation(
    donationId: string,
  ) {
    const donation =
      await this.prisma.donation.findUnique({
        where: {
          id: donationId,
        },
      });

    if (!donation) {
      throw new NotFoundException(
        'Donation not found',
      );
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

  /**
   * Get receipt by receipt number.
   */
  async findByReceiptNumber(
    receiptNumber: string,
  ) {
    if (!receiptNumber?.trim()) {
      throw new BadRequestException(
        'Receipt number is required',
      );
    }

    const receipt =
      await this.prisma.receipt.findUnique({
        where: {
          receiptNumber:
            receiptNumber.trim(),
        },

        include: {
          donation: {
            include: {
              campaign: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  status: true,
                },
              },

              donorProfile: true,
            },
          },
        },
      });

    if (!receipt) {
      throw new NotFoundException(
        'Receipt not found',
      );
    }

    return receipt;
  }
}
