import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  FinanceLedgerStatus,
  FinanceLedgerType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma.service';
import { FinanceQueryDto } from './dto/finance-query.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // GET ALL LEDGER
  // =========================================================

  async findAll(params: FinanceQueryDto) {
    const page = Math.max(
      Number(params.page ?? 1),
      1,
    );

    const limit = Math.min(
      Math.max(
        Number(params.limit ?? 20),
        1,
      ),
      100,
    );

    const where: Prisma.FinanceLedgerWhereInput = {
      ...(params.type && {
        type: params.type,
      }),

      ...(params.status && {
        status: params.status,
      }),

      ...(params.campaignId && {
        campaignId: params.campaignId,
      }),

      ...(params.donationId && {
        donationId: params.donationId,
      }),

      ...(params.paymentTransactionId && {
        paymentTransactionId:
          params.paymentTransactionId,
      }),

      ...(params.dateFrom || params.dateTo
        ? {
            transactionDate: {
              ...(params.dateFrom && {
                gte: new Date(params.dateFrom),
              }),

              ...(params.dateTo && {
                lte: new Date(params.dateTo),
              }),
            },
          }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.financeLedger.findMany({
          where,

          orderBy: [
            {
              transactionDate: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],

          skip: (page - 1) * limit,

          take: limit,

          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },

            donation: {
              select: {
                id: true,
                donorName: true,
                donorEmail: true,
                amount: true,
                status: true,
              },
            },

            paymentTransaction: {
              select: {
                id: true,
                transactionReference: true,
                provider: true,
                paymentMethod: true,
                status: true,
                providerTransactionId: true,
              },
            },

            receipt: {
              select: {
                id: true,
                receiptNumber: true,
                issuedAt: true,
              },
            },
          },
        }),

        this.prisma.financeLedger.count({
          where,
        }),
      ]);

    return {
      data,

      meta: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
      },
    };
  }

  // =========================================================
  // GET ONE LEDGER
  // =========================================================

  async findOne(id: string) {
    const ledger =
      await this.prisma.financeLedger.findUnique({
        where: {
          id,
        },

        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
            },
          },

          donation: {
            select: {
              id: true,
              donorId: true,
              donorName: true,
              donorEmail: true,
              donorPhone: true,
              amount: true,
              currency: true,
              status: true,
              paidAt: true,
            },
          },

          paymentTransaction: {
            select: {
              id: true,
              transactionReference: true,
              provider: true,
              paymentMethod: true,
              amount: true,
              currency: true,
              status: true,
              providerTransactionId: true,
              paidAt: true,
            },
          },

          receipt: {
            select: {
              id: true,
              receiptNumber: true,
              issuedAt: true,
              amount: true,
              currency: true,
            },
          },
        },
      });

    if (!ledger) {
      throw new NotFoundException(
        'Finance ledger not found',
      );
    }

    return ledger;
  }

  // =========================================================
  // FINANCE SUMMARY
  // =========================================================

  async getSummary(params: {
    dateFrom?: string;
    dateTo?: string;
    campaignId?: string;
  }) {
    const where: Prisma.FinanceLedgerWhereInput = {
      status: FinanceLedgerStatus.POSTED,

      ...(params.campaignId && {
        campaignId: params.campaignId,
      }),

      ...(params.dateFrom || params.dateTo
        ? {
            transactionDate: {
              ...(params.dateFrom && {
                gte: new Date(params.dateFrom),
              }),

              ...(params.dateTo && {
                lte: new Date(params.dateTo),
              }),
            },
          }
        : {}),
    };

    const [
      income,
      expense,
      refund,
      fee,
      adjustment,
    ] = await Promise.all([
      this.prisma.financeLedger.aggregate({
        where: {
          ...where,
          type: FinanceLedgerType.INCOME,
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.financeLedger.aggregate({
        where: {
          ...where,
          type: FinanceLedgerType.EXPENSE,
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.financeLedger.aggregate({
        where: {
          ...where,
          type: FinanceLedgerType.REFUND,
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.financeLedger.aggregate({
        where: {
          ...where,
          type: FinanceLedgerType.FEE,
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.financeLedger.aggregate({
        where: {
          ...where,
          type: FinanceLedgerType.ADJUSTMENT,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const incomeAmount =
      income._sum.amount ?? 0;

    const expenseAmount =
      expense._sum.amount ?? 0;

    const refundAmount =
      refund._sum.amount ?? 0;

    const feeAmount =
      fee._sum.amount ?? 0;

    const adjustmentAmount =
      adjustment._sum.amount ?? 0;

    const netBalance =
      Number(incomeAmount) -
      Number(expenseAmount) -
      Number(refundAmount) -
      Number(feeAmount) +
      Number(adjustmentAmount);

    return {
      period: {
        dateFrom:
          params.dateFrom ?? null,

        dateTo:
          params.dateTo ?? null,

        campaignId:
          params.campaignId ?? null,
      },

      income: incomeAmount.toString(),

      expense: expenseAmount.toString(),

      refund: refundAmount.toString(),

      fee: feeAmount.toString(),

      adjustment:
        adjustmentAmount.toString(),

      netBalance:
        netBalance.toFixed(2),
    };
  }

  // =========================================================
  // VOID LEDGER
  // =========================================================

  async voidLedger(
    id: string,
    userId: string,
  ) {
    const existing =
      await this.prisma.financeLedger.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Finance ledger not found',
      );
    }

    if (
      existing.status ===
      FinanceLedgerStatus.VOIDED
    ) {
      throw new BadRequestException(
        'Finance ledger is already voided',
      );
    }

    const ledger =
      await this.prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.financeLedger.update({
              where: {
                id,
              },

              data: {
                status:
                  FinanceLedgerStatus.VOIDED,
              },
            });

          await tx.auditLog.create({
            data: {
              action:
                'FINANCE_LEDGER_VOIDED',

              entity:
                'FinanceLedger',

              entityId:
                updated.id,

              userId,

              metadata: {
                reference:
                  updated.reference,

                type:
                  updated.type,

                amount:
                  updated.amount.toString(),

                previousStatus:
                  existing.status,

                newStatus:
                  updated.status,
              },
            },
          });

          return updated;
        },
      );

    return ledger;
  }
}
