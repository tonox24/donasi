import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as fs from 'fs';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import * as path from 'path';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
private getLogoBuffer(): Buffer {
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

    return fs.readFileSync(logoPath);
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
    const logoBuffer = this.getLogoBuffer();

    const verificationUrl =
      `https://backend-api-production-d0b6.up.railway.app/api/receipts/verify?receiptNumber=${encodeURIComponent(receipt.receiptNumber)}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
    });

    const qrBuffer = Buffer.from(
      qrDataUrl.replace(/^data:image\/png;base64,/, ''),
      'base64',
    );

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 45,
        info: {
          Title: `Donation Receipt ${receipt.receiptNumber}`,
          Author: 'Islamic Relief Indonesia',
          Subject: 'Donation Receipt',
          Creator: 'Islamic Relief Indonesia Digital Philanthropy Platform',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const LEFT = 45;
      const RIGHT = 550;
      const WIDTH = RIGHT - LEFT;
      const BLUE = '#0072BC';
      const DARK = '#1F2937';
      const GRAY = '#6B7280';
      const LIGHT_GRAY = '#E5E7EB';
      const GREEN = '#15803D';

      const formatDate = (date: Date) =>
        new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        }).format(date);

      const formatDateTime = (date: Date) =>
        new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        }).format(date);

      const formatAmount = (amount: Prisma.Decimal | number | string) =>
        new Intl.NumberFormat('id-ID', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(Number(amount));

      const drawLine = (y: number, color = LIGHT_GRAY) => {
        doc.save()
          .strokeColor(color)
          .lineWidth(0.8)
          .moveTo(LEFT, y)
          .lineTo(RIGHT, y)
          .stroke()
          .restore();
      };

      const sectionTitle = (title: string, y: number) => {
        doc.fillColor(BLUE)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(title, LEFT, y, { width: WIDTH });
        return y + 17;
      };

      const row = (
        label: string,
        value: string,
        y: number,
        options?: { bold?: boolean; valueColor?: string },
      ) => {
        doc.fillColor(GRAY)
          .font('Helvetica')
          .fontSize(9)
          .text(label, LEFT, y, { width: 105 });

        doc.fillColor(options?.valueColor ?? DARK)
          .font(options?.bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .text(value, LEFT + 110, y, { width: WIDTH - 110 });

        return Math.max(y + 16, doc.y);
      };

      // =====================================================
      // HEADER
      // =====================================================
      doc.image(logoBuffer, LEFT, 35, { fit: [78, 78] });

      doc.fillColor(BLUE)
        .font('Helvetica-Bold')
        .fontSize(18)
        .text('ISLAMIC RELIEF INDONESIA', 140, 46, {
          width: 300,
          align: 'left',
        });

      doc.fillColor(GRAY)
        .font('Helvetica')
        .fontSize(8)
        .text('BERSAMA UNTUK KEMANUSIAAN', 141, 70, { width: 300 });

      doc.fillColor(BLUE)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('DIGITAL PHILANTHROPY', 410, 49, {
          width: 140,
          align: 'right',
        });

      doc.fillColor(GRAY)
        .font('Helvetica')
        .fontSize(7)
        .text('Official Donation Receipt', 410, 64, {
          width: 140,
          align: 'right',
        });

      drawLine(125, BLUE);

      // =====================================================
      // TITLE
      // =====================================================
      doc.fillColor(DARK)
        .font('Helvetica-Bold')
        .fontSize(21)
        .text('DONATION RECEIPT', LEFT, 145, {
          width: WIDTH,
          align: 'center',
        });

      doc.fillColor(GRAY)
        .font('Helvetica')
        .fontSize(8.5)
        .text('Thank you for your trust and generosity', LEFT, 173, {
          width: WIDTH,
          align: 'center',
        });

      // =====================================================
      // RECEIPT INFORMATION
      // =====================================================
      let y = 205;
      y = sectionTitle('RECEIPT INFORMATION', y);
      y = row('Receipt Number', receipt.receiptNumber, y, { bold: true });
      y = row('Issued Date', formatDate(receipt.issuedAt), y);
      drawLine(y + 3);

      // =====================================================
      // DONOR INFORMATION
      // =====================================================
      y += 18;
      y = sectionTitle('DONOR INFORMATION', y);
      y = row('Name', receipt.donorName, y);

      if (receipt.donorEmail) {
        y = row('Email', receipt.donorEmail, y);
      }

      if (receipt.donation?.donorPhone) {
        y = row('Phone', receipt.donation.donorPhone, y);
      }

      drawLine(y + 3);

      // =====================================================
      // DONATION DETAILS
      // =====================================================
      y += 18;
      y = sectionTitle('DONATION DETAILS', y);
      y = row('Campaign', receipt.campaignTitle, y);
      y = row(
        'Amount',
        `${receipt.currency} ${formatAmount(receipt.amount)}`,
        y,
        { bold: true },
      );
      y = row(
        'Status',
        receipt.donation?.status ?? 'PAID',
        y,
        { bold: true, valueColor: GREEN },
      );
      y = row(
        'Paid Date',
        receipt.donation?.paidAt
          ? formatDateTime(receipt.donation.paidAt)
          : formatDateTime(receipt.issuedAt),
        y,
      );

      if (receipt.donation?.message) {
        y += 5;
        doc.fillColor(DARK)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text('Donor Message', LEFT, y);
        y += 13;
        doc.fillColor(GRAY)
          .font('Helvetica-Oblique')
          .fontSize(8)
          .text(receipt.donation.message, LEFT, y, { width: WIDTH });
        y = doc.y + 7;
      }

      // =====================================================
      // IMPACT
      // =====================================================
      if (receipt.donation?.impacts?.length) {
        drawLine(y + 3);
        y += 18;
        y = sectionTitle('YOUR IMPACT', y);

        for (const impact of receipt.donation.impacts) {
          const impactName = impact.campaignImpact.name;
          const unit = impact.campaignImpact.unit;
          const quantity = Number(impact.quantity);
          const allocated = Number(impact.amountAllocated);

          doc.fillColor(DARK)
            .font('Helvetica-Bold')
            .fontSize(8.5)
            .text(impactName, LEFT, y, { width: WIDTH });
          y += 13;

          doc.fillColor(GRAY)
            .font('Helvetica')
            .fontSize(7.8)
            .text(`Contribution: ${quantity} ${unit}`, LEFT, y);
          y += 12;

          doc.text(
            `Allocated Amount: ${receipt.currency} ${formatAmount(allocated)}`,
            LEFT,
            y,
          );
          y += 12;

          if (impact.campaignImpact.description) {
            doc.text(impact.campaignImpact.description, LEFT, y, {
              width: WIDTH,
            });
            y = doc.y + 4;
          }

          if (impact.description) {
            doc.text(impact.description, LEFT, y, { width: WIDTH });
            y = doc.y + 4;
          }

          y += 6;
        }
      }

      // =====================================================
      // PAYMENT CONFIRMATION
      // =====================================================
      drawLine(y + 3);
      y += 18;
      y = sectionTitle('PAYMENT CONFIRMATION', y);

      doc.fillColor(DARK)
        .font('Helvetica')
        .fontSize(8.5)
        .text(
          'This receipt confirms that the donation stated above has been successfully received.',
          LEFT,
          y,
          { width: WIDTH },
        );
      y = doc.y + 10;

      // =====================================================
      // THANK YOU
      // =====================================================
      doc.fillColor(BLUE)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Thank You for Your Generosity', LEFT, y, {
          width: WIDTH,
          align: 'center',
        });
      y = doc.y + 4;

      doc.fillColor(GRAY)
        .font('Helvetica')
        .fontSize(8)
        .text(
          'Your contribution supports Islamic Relief Indonesia in creating meaningful and sustainable impact for communities in need.',
          LEFT + 25,
          y,
          {
            width: WIDTH - 50,
            align: 'center',
          },
        );
      y = doc.y + 13;

      // =====================================================
      // QR VERIFICATION BOX
      // =====================================================
      const qrBoxHeight = 170;
      const qrBoxY = y;

      doc.save()
        .fillColor('#F8FAFC')
        .roundedRect(LEFT, qrBoxY, WIDTH, qrBoxHeight, 6)
        .fill()
        .restore();

      doc.save()
        .lineWidth(0.8)
        .strokeColor(LIGHT_GRAY)
        .roundedRect(LEFT, qrBoxY, WIDTH, qrBoxHeight, 6)
        .stroke()
        .restore();

      doc.fillColor(BLUE)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('RECEIPT VERIFICATION', LEFT, qrBoxY + 11, {
          width: WIDTH,
          align: 'center',
        });

      doc.fillColor(GRAY)
        .font('Helvetica')
        .fontSize(7.5)
        .text('Scan the QR code to verify this receipt.', LEFT, qrBoxY + 28, {
          width: WIDTH,
          align: 'center',
        });

      const QR_SIZE = 100;
      const QR_X = LEFT + WIDTH / 2 - QR_SIZE / 2;
      const QR_Y = qrBoxY + 46;

      doc.image(qrBuffer, QR_X, QR_Y, {
        width: QR_SIZE,
        height: QR_SIZE,
      });

      doc.fillColor(GRAY)
        .font('Helvetica')
        .fontSize(6)
        .text(verificationUrl, LEFT + 15, qrBoxY + 153, {
          width: WIDTH - 30,
          align: 'center',
          lineBreak: false,
        });

      y = qrBoxY + qrBoxHeight + 13;

      // =====================================================
      // FOOTER
      // =====================================================
      drawLine(y);
      y += 10;

      doc.fillColor(GRAY)
        .font('Helvetica')
        .fontSize(6.8)
        .text(
          'This document was generated electronically by the Islamic Relief Indonesia Digital Philanthropy Platform.',
          LEFT,
          y,
          {
            width: WIDTH,
            align: 'center',
          },
        );
      y = doc.y + 4;

      doc.fillColor(GRAY)
        .font('Helvetica')
        .fontSize(6.8)
        .text(`Receipt ID: ${receipt.id}`, LEFT, y, {
          width: WIDTH,
          align: 'center',
        });
      y = doc.y + 10;

      drawLine(y, BLUE);
      y += 8;

      doc.fillColor(BLUE)
        .font('Helvetica-Bold')
        .fontSize(7)
        .text('www.islamic-relief.or.id', LEFT, y, {
          width: 220,
          align: 'left',
        });

      doc.fillColor(GRAY)
        .font('Helvetica')
        .fontSize(7)
        .text('Islamic Relief Indonesia', 330, y, {
          width: 220,
          align: 'right',
        });

      doc.end();
    });
  }

}
