import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../prisma.service';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class ReceiptService {
  constructor(private readonly prisma: PrismaService) {}

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

    const sequence = await tx.receiptSequence.upsert({
      where: { year },
      create: { year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });

    return `INV-YRII/${String(year).slice(-2)}${month}${day}/${year}/${String(
      sequence.lastNumber,
    ).padStart(6, '0')}`;
  }

  async createForPaidDonation(
    donationId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const donation = await tx.donation.findUnique({
      where: { id: donationId },
      include: {
        campaign: {
          select: { id: true, title: true },
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

    const existingReceipt = await tx.receipt.findUnique({
      where: { donationId },
    });

    if (existingReceipt) {
      return existingReceipt;
    }

    const issuedAt = donation.paidAt ?? new Date();
    const receiptNumber = await this.generateReceiptNumber(tx, issuedAt);

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
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
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
              orderBy: { createdAt: 'desc' },
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
      where: { id: donationId },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    return this.prisma.receipt.findMany({
      where: { donationId },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findByReceiptNumber(receiptNumber: string) {
    if (!receiptNumber?.trim()) {
      throw new BadRequestException('Receipt number is required');
    }

    const receipt = await this.prisma.receipt.findUnique({
      where: { receiptNumber: receiptNumber.trim() },
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
      throw new NotFoundException('Receipt not found');
    }

    return receipt;
  }
async verifyReceipt(receiptNumber: string) {
  const receipt = await this.prisma.receipt.findUnique({
    where: {
      receiptNumber,
    },
    include: {
      donation: {
        select: {
          id: true,
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
    amount: receipt.amount.toString(),
    currency: receipt.currency,
    campaignTitle: receipt.campaignTitle,
    status: receipt.donation?.status ?? 'PAID',
    paidAt: receipt.donation?.paidAt ?? null,
  };
}
  /**
   * Generate a professional A4 donation receipt.
   *
   * Required asset:
   *   backend/assets/islamic-relief-logo.png
   *
   * The file must be a real PNG binary, not a text file renamed to .png.
   */
  async generatePdf(id: string): Promise<Buffer> {
    const receipt = await this.findOne(id);

    const verificationUrl =
      `https://backend-api-production-d0b6.up.railway.app/api/receipts/verify` +
      `?receiptNumber=${encodeURIComponent(receipt.receiptNumber)}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 220,
    });

    const qrBuffer = Buffer.from(
      qrDataUrl.replace(/^data:image\/png;base64,/, ''),
      'base64',
    );

    const logoPath = path.join(
      process.cwd(),
      'assets',
      'islamic-relief-logo.png',
    );

    const hasLogo = fs.existsSync(logoPath) && fs.statSync(logoPath).size > 100;

    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `Donation Receipt ${receipt.receiptNumber}`,
        Author: 'Islamic Relief Indonesia',
        Subject: 'Donation Receipt',
      },
    });

    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_W = 595.28;
      const PAGE_H = 841.89;
      const LEFT = 42;
      const RIGHT = PAGE_W - 42;
      const CONTENT_W = RIGHT - LEFT;

      const BLUE = '#0878C9';
      const DARK = '#18324A';
      const GREY = '#607080';
      const LIGHT = '#EEF7FD';
      const GREEN = '#1B9A59';
      const BORDER = '#B7D9F2';

      const money = (amount: Prisma.Decimal | number | string) =>
        new Intl.NumberFormat('id-ID', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(Number(amount));

      const date = (value: Date) =>
        new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        }).format(value);

      const dateTime = (value: Date) =>
        new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        }).format(value);

      const line = (y: number, x1 = LEFT, x2 = RIGHT) => {
        doc
          .save()
          .strokeColor(BORDER)
          .lineWidth(0.8)
          .moveTo(x1, y)
          .lineTo(x2, y)
          .stroke()
          .restore();
      };

      const sectionTitle = (title: string, y: number) => {
        doc
          .fillColor(BLUE)
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .text(title.toUpperCase(), LEFT, y);
      };

      const labelValue = (
        label: string,
        value: string,
        y: number,
        options?: { boldValue?: boolean },
      ) => {
        doc
          .fillColor(DARK)
          .font('Helvetica')
          .fontSize(9.5)
          .text(label, LEFT, y, { width: 125 });

        doc
          .fillColor(DARK)
          .font(options?.boldValue ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(options?.boldValue ? 10.5 : 9.5)
          .text(`:  ${value}`, LEFT + 125, y, {
            width: CONTENT_W - 125,
          });
      };

      /*
       * HEADER
       */
      if (hasLogo) {
        doc.image(logoPath, LEFT, 30, {
          fit: [68, 68],
          align: 'left',
          valign: 'top',
        });
      } else {
        // Safe fallback so the receipt remains usable if the asset is missing.
        doc
          .roundedRect(LEFT, 30, 68, 68, 5)
          .fill(BLUE)
          .fillColor('#FFFFFF')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text('ISLAMIC', LEFT + 7, 54, { width: 54, align: 'center' })
          .text('RELIEF', LEFT + 7, 70, { width: 54, align: 'center' });
      }

      doc
        .fillColor(BLUE)
        .font('Helvetica-Bold')
        .fontSize(21)
        .text('ISLAMIC RELIEF INDONESIA', 125, 36, {
          width: 300,
        });

      doc
        .fillColor(GREY)
        .font('Helvetica')
        .fontSize(10)
        .text('BERSAMA UNTUK KEMANUSIAAN', 125, 62);

      doc
        .strokeColor(BLUE)
        .lineWidth(1)
        .moveTo(438, 35)
        .lineTo(438, 89)
        .stroke();

      doc
        .fillColor(BLUE)
        .font('Helvetica')
        .fontSize(8.5)
        .text('SAVING LIVES', 452, 39)
        .text('PROTECTING PEOPLE', 452, 53)
        .text('BUILDING A BETTER TOMORROW', 452, 67);

      doc
        .fillColor(BLUE)
        .font('Helvetica-Bold')
        .fontSize(24)
        .text('DONATION RECEIPT', LEFT, 112, {
          width: CONTENT_W,
          align: 'center',
        });

      doc
        .fillColor(DARK)
        .font('Helvetica')
        .fontSize(9.5)
        .text('TERIMA KASIH ATAS KEPERCAYAAN ANDA', LEFT, 143, {
          width: CONTENT_W,
          align: 'center',
        });

      line(166);

      /*
       * RECEIPT INFORMATION
       */
      sectionTitle('Receipt Information', 181);
      labelValue('Receipt Number', receipt.receiptNumber, 199);
      labelValue('Issued Date', date(receipt.issuedAt), 216);

      line(239);

      /*
       * DONOR INFORMATION
       */
      sectionTitle('Donor Information', 254);
      labelValue('Name', receipt.donorName, 272);

      let donorY = 289;

      if (receipt.donorEmail) {
        labelValue('Email', receipt.donorEmail, donorY);
        donorY += 17;
      }

      if (receipt.donation?.donorPhone) {
        labelValue('Phone', receipt.donation.donorPhone, donorY);
        donorY += 17;
      }

      line(donorY + 16);

      /*
       * DONATION DETAILS
       */
      const donationTop = donorY + 31;
      sectionTitle('Donation Details', donationTop);

      labelValue(
        'Campaign',
        receipt.campaignTitle,
        donationTop + 19,
      );

      labelValue(
        'Amount',
        `${receipt.currency} ${money(receipt.amount)}`,
        donationTop + 36,
        { boldValue: true },
      );

      labelValue(
        'Status',
        receipt.donation?.status ?? 'PAID',
        donationTop + 53,
        { boldValue: true },
      );

      if (receipt.donation?.paidAt) {
        labelValue(
          'Paid Date',
          dateTime(receipt.donation.paidAt),
          donationTop + 70,
        );
      }

      let afterDetailsY = donationTop + 92;

      if (receipt.donation?.message) {
        doc
          .fillColor(DARK)
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text('Donor Message', LEFT, afterDetailsY);

        doc
          .fillColor(GREY)
          .font('Helvetica')
          .fontSize(9)
          .text(receipt.donation.message, LEFT, afterDetailsY + 15, {
            width: CONTENT_W,
          });

        afterDetailsY += 42;
      }

      /*
       * IMPACT
       */
      const impacts = receipt.donation?.impacts ?? [];

      if (impacts.length > 0) {
        line(afterDetailsY);
        sectionTitle('Your Impact', afterDetailsY + 15);

        let impactY = afterDetailsY + 34;

        for (const impact of impacts.slice(0, 3)) {
          const impactName = impact.campaignImpact.name;
          const unit = impact.campaignImpact.unit;
          const quantity = Number(impact.quantity);
          const allocated = Number(impact.amountAllocated);

          doc
            .fillColor(DARK)
            .font('Helvetica-Bold')
            .fontSize(9)
            .text(impactName, LEFT, impactY, {
              width: 330,
            });

          doc
            .fillColor(DARK)
            .font('Helvetica')
            .fontSize(8.5)
            .text(
              `${quantity} ${unit}  •  Allocated: ${receipt.currency} ${money(
                allocated,
              )}`,
              LEFT,
              impactY + 14,
              { width: CONTENT_W },
            );

          impactY += 34;
        }

        afterDetailsY = impactY + 4;
      }

      /*
       * PAYMENT CONFIRMATION
       */
      line(afterDetailsY);
      sectionTitle('Payment Confirmation', afterDetailsY + 15);

      doc
        .fillColor(DARK)
        .font('Helvetica')
        .fontSize(9.2)
        .text(
          'This receipt confirms that the donation stated above has been successfully received.',
          LEFT,
          afterDetailsY + 34,
          { width: CONTENT_W },
        );

      /*
       * THANK YOU
       */
      doc
        .fillColor(BLUE)
        .font('Helvetica-Bold')
        .fontSize(15)
        .text('Thank You for Your Generosity', LEFT, afterDetailsY + 65, {
          width: CONTENT_W,
          align: 'center',
        });

      doc
        .fillColor(GREY)
        .font('Helvetica')
        .fontSize(9)
        .text(
          'Your contribution supports Islamic Relief Indonesia in creating meaningful and sustainable impact for communities in need.',
          LEFT + 25,
          afterDetailsY + 88,
          {
            width: CONTENT_W - 50,
            align: 'center',
          },
        );

      /*
       * QR VERIFICATION PANEL
       *
       * Important: QR and URL are placed in a fixed-height panel.
       * This prevents the previous overlap with the footer.
       */
      const qrPanelY = afterDetailsY + 120;
      const qrPanelH = 190;

      doc
        .save()
        .roundedRect(LEFT, qrPanelY, CONTENT_W, qrPanelH, 8)
        .fillAndStroke(LIGHT, BORDER)
        .restore();

      sectionTitle('Receipt Verification', qrPanelY + 14);

      doc
        .fillColor(GREY)
        .font('Helvetica')
        .fontSize(8.5)
        .text('Scan the QR code to verify this receipt.', LEFT, qrPanelY + 32, {
          width: CONTENT_W,
          align: 'center',
        });

      const QR_SIZE = 118;
      const QR_X = (PAGE_W - QR_SIZE) / 2;
      const QR_Y = qrPanelY + 50;

      doc.image(qrBuffer, QR_X, QR_Y, {
        width: QR_SIZE,
        height: QR_SIZE,
      });

      doc
        .fillColor(GREY)
        .font('Helvetica')
        .fontSize(6.8)
        .text(verificationUrl, LEFT + 15, qrPanelY + 171, {
          width: CONTENT_W - 30,
          align: 'center',
          lineBreak: false,
        });

      /*
       * FOOTER
       */
      const footerY = 770;

      line(footerY);

      doc
        .fillColor(GREY)
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          'This document was generated electronically by the Islamic Relief Indonesia Digital Philanthropy Platform.',
          LEFT,
          footerY + 13,
          {
            width: CONTENT_W,
            align: 'center',
          },
        );

      doc
        .fillColor(GREY)
        .font('Helvetica')
        .fontSize(7)
        .text(`Receipt ID: ${receipt.id}`, LEFT, footerY + 27, {
          width: CONTENT_W,
          align: 'center',
        });

      line(footerY + 49);

      doc
        .fillColor(BLUE)
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text('www.islamic-relief.or.id', LEFT, footerY + 63);

      doc
        .fillColor(BLUE)
        .font('Helvetica')
        .fontSize(8.5)
        .text('@islamicreliefid', 300, footerY + 63, {
          width: 100,
          align: 'center',
        });

      doc
        .fillColor(BLUE)
        .font('Helvetica-BoldOblique')
        .fontSize(9)
        .text('"Bersama untuk Kemanusiaan"', 420, footerY + 61, {
          width: 133,
          align: 'right',
        });

      doc.end();
    });
  }
}
