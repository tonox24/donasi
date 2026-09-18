import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';



type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
private getLogoPath(): string {
  const logoPath = path.join(
    process.cwd(),
    'assets',
    'islamic-relief-logo.png',
  );

  if (!fs.existsSync(logoPath)) {
    throw new Error(
      `Receipt logo not found: ${logoPath}`,
    );
  }

  return logoPath;
}
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
    /**
   * Public receipt verification.
   *
   * This endpoint intentionally returns limited information.
   * It does not expose donor email, phone, payment details,
   * donor profile, or internal database information.
   */
  async verifyReceipt(receiptNumber: string) {
    if (!receiptNumber?.trim()) {
      throw new BadRequestException(
        'Receipt number is required',
      );
    }

    const receipt =
      await this.prisma.receipt.findUnique({
        where: {
          receiptNumber: receiptNumber.trim(),
        },
        select: {
          receiptNumber: true,
          issuedAt: true,
          donorName: true,
          amount: true,
          currency: true,
          campaignTitle: true,
          donation: {
            select: {
              status: true,
              paidAt: true,
            },
          },
        },
      });

    if (!receipt) {
      throw new NotFoundException(
        'Receipt not found',
      );
    }

    return {
      valid: true,
      receiptNumber: receipt.receiptNumber,
      issuedAt: receipt.issuedAt,
      donorName: receipt.donorName,
      amount: receipt.amount,
      currency: receipt.currency,
      campaignTitle: receipt.campaignTitle,
      status: receipt.donation.status,
      paidAt: receipt.donation.paidAt,
    };
  }
    /**
   * Generate PDF receipt.
   *
   * This method only reads an existing receipt.
   * It does not create or modify any receipt.
   */
  async generatePdf(id: string): Promise<Buffer> {
    const receipt = await this.findOne(id);

        const verificationUrl =
      `https://backend-api-production-d0b6.up.railway.app/api/receipts/verify?receiptNumber=${encodeURIComponent(
        receipt.receiptNumber,
      )}`;

    const qrDataUrl =
      await QRCode.toDataURL(
        verificationUrl,
        {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 180,
        },
      );

    const qrBase64 =
      qrDataUrl.replace(
        /^data:image\/png;base64,/,
        '',
      );

    const qrBuffer =
      Buffer.from(qrBase64, 'base64');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Donation Receipt ${receipt.receiptNumber}`,
          Author: 'Islamic Relief Indonesia',
          Subject: 'Donation Receipt',
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', (error) => {
        reject(error);
      });

      const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        }).format(date);
      };

      const formatDateTime = (date: Date) => {
        return new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        }).format(date);
      };

      const formatAmount = (amount: Prisma.Decimal | number | string) => {
        const numericAmount = Number(amount);

        return new Intl.NumberFormat('id-ID', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(numericAmount);
      };

      const drawLine = () => {
        doc
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();
      };

      /*
       * Header
       */
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('ISLAMIC RELIEF INDONESIA', {
          align: 'center',
        });

      doc
        .moveDown(0.3)
        .font('Helvetica')
        .fontSize(10)
        .text('DONATION RECEIPT', {
          align: 'center',
        });

      doc.moveDown(1);

      drawLine();

      /*
       * Receipt information
       */
      doc.moveDown(0.8);

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('RECEIPT INFORMATION');

      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(10);

      doc.text(`Receipt Number : ${receipt.receiptNumber}`);
      doc.text(`Issued Date   : ${formatDate(receipt.issuedAt)}`);

      doc.moveDown(0.8);

      drawLine();

      /*
       * Donor information
       */
      doc.moveDown(0.8);

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('DONOR INFORMATION');

      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(10);

      doc.text(`Name          : ${receipt.donorName}`);

      if (receipt.donorEmail) {
        doc.text(`Email         : ${receipt.donorEmail}`);
      }

      if (receipt.donation?.donorPhone) {
        doc.text(`Phone         : ${receipt.donation.donorPhone}`);
      }

      doc.moveDown(0.8);

      drawLine();

      /*
       * Donation information
       */
      doc.moveDown(0.8);

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('DONATION DETAILS');

            /*
       * Impact information
       */
      if (
        receipt.donation?.impacts &&
        receipt.donation.impacts.length > 0
      ) {
        doc.moveDown(1);

        drawLine();

        doc.moveDown(0.8);

        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('YOUR IMPACT');

        doc.moveDown(0.5);

        doc
          .font('Helvetica')
          .fontSize(9);

        for (
          const impact of receipt.donation.impacts
        ) {
          const impactName =
            impact.campaignImpact.name;

          const unit =
            impact.campaignImpact.unit;

          const quantity =
            Number(impact.quantity);

          const allocated =
            Number(impact.amountAllocated);

          doc
            .font('Helvetica-Bold')
            .text(impactName);

          doc
            .font('Helvetica')
            .text(
              `Contribution: ${quantity} ${unit}`,
            );

          doc.text(
            `Allocated Amount: ${receipt.currency} ${formatAmount(allocated)}`,
          );

          if (
            impact.campaignImpact.description
          ) {
            doc.text(
              impact.campaignImpact.description,
              {
                width: 495,
              },
            );
          }

          if (impact.description) {
            doc.text(
              impact.description,
              {
                width: 495,
              },
            );
          }

          doc.moveDown(0.6);
        }
      }

      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(10);

      doc.text(`Campaign      : ${receipt.campaignTitle}`);

      doc.text(
        `Amount        : ${receipt.currency} ${formatAmount(receipt.amount)}`,
      );

      doc.text(`Status        : ${receipt.donation?.status ?? 'PAID'}`);

      if (receipt.donation?.paidAt) {
        doc.text(
          `Paid Date     : ${formatDateTime(receipt.donation.paidAt)}`,
        );
      } else {
        doc.text(`Paid Date     : ${formatDateTime(receipt.issuedAt)}`);
      }

      if (receipt.donation?.message) {
        doc.moveDown(0.5);

        doc
          .font('Helvetica-Bold')
          .text('Donor Message');

        doc
          .font('Helvetica')
          .text(receipt.donation.message, {
            width: 495,
          });
      }

      doc.moveDown(1);

      drawLine();

      /*
       * Payment confirmation
       */
      doc.moveDown(0.8);

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('PAYMENT CONFIRMATION');

      doc.moveDown(0.5);

      doc
        .font('Helvetica')
        .fontSize(10)
        .text(
          'This receipt confirms that the donation stated above has been successfully received.',
          {
            width: 495,
            align: 'left',
          },
        );

      doc.moveDown(1.5);

      /*
       * Thank you message
       */
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Thank You for Your Generosity', {
          align: 'center',
        });

      doc.moveDown(0.5);

      doc
        .font('Helvetica')
        .fontSize(10)
        .text(
          'Your contribution supports Islamic Relief Indonesia in creating meaningful and sustainable impact for communities in need.',
          {
            width: 495,
            align: 'center',
          },
        );
      /*
       * Verification QR
       */
      doc.moveDown(1);

      drawLine();

      doc.moveDown(0.8);

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('RECEIPT VERIFICATION', {
          align: 'center',
        });

      doc.moveDown(0.4);

      doc
        .font('Helvetica')
        .fontSize(8)
        .text(
          'Scan the QR code to verify this receipt.',
          {
            align: 'center',
          },
        );

      doc.image(
        qrBuffer,
        237,
        doc.y + 8,
        {
          width: 120,
          height: 120,
        },
      );

      doc.moveDown(9);

      doc
        .font('Helvetica')
        .fontSize(7)
        .text(
          verificationUrl,
          {
            align: 'center',
            width: 495,
          },
        );
      /*
       * Footer
       */
      doc.moveDown(2);

      drawLine();

      doc.moveDown(0.5);

      doc
        .font('Helvetica')
        .fontSize(8)
        .text(
          'This document was generated electronically by the Islamic Relief Indonesia Digital Philanthropy Platform.',
          {
            align: 'center',
          },
        );

      doc
        .moveDown(0.3)
        .text(
          `Receipt ID: ${receipt.id}`,
          {
            align: 'center',
          },
        );

      doc.end();
    });
  }
}
