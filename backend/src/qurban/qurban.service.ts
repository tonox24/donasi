import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import {
  Prisma,
  QurbanPackageStatus,
  QurbanSavingStatus,
  QurbanContributionStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma.service';

import { CreateQurbanPackageDto } from './dto/create-qurban-package.dto';
import { UpdateQurbanPackageDto } from './dto/update-qurban-package.dto';
import { CreateQurbanSavingDto } from './dto/create-qurban-saving.dto';
import { UpdateQurbanSavingDto } from './dto/update-qurban-saving.dto';
import { CreateQurbanContributionDto } from './dto/create-qurban-contribution.dto';
import { CreateQurbanPaymentDto } from './dto/create-qurban-payment.dto';


@Injectable()
export class QurbanService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // FIND ALL PUBLIC PACKAGES
  // =========================================================

  async findAllPackages() {
    return this.prisma.qurbanPackage.findMany({
      where: {
        status: {
          in: [
            QurbanPackageStatus.ACTIVE,
            QurbanPackageStatus.SOLD_OUT,
          ],
        },
      },

      orderBy: [
        {
          qurbanYear: 'desc',
        },
        {
          animalType: 'asc',
        },
        {
          price: 'asc',
        },
      ],

      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },

        _count: {
          select: {
            orders: true,
          },
        },
      },
    });
  }

  // =========================================================
  // FIND ONE PUBLIC PACKAGE
  // =========================================================

  async findOnePackage(id: string) {
    const packageId = id.trim();

    const qurbanPackage =
      await this.prisma.qurbanPackage.findUnique({
        where: {
          id: packageId,
        },

        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },

          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

    if (!qurbanPackage) {
      throw new NotFoundException(
        'Qurban package not found',
      );
    }

    if (
      qurbanPackage.status !==
        QurbanPackageStatus.ACTIVE &&
      qurbanPackage.status !==
        QurbanPackageStatus.SOLD_OUT
    ) {
      throw new NotFoundException(
        'Qurban package is not available',
      );
    }

    return qurbanPackage;
  }

  // =========================================================
  // CREATE PACKAGE
  // =========================================================

  async createPackage(
    dto: CreateQurbanPackageDto,
    userId: string,
  ) {
    const slug = dto.slug
      .trim()
      .toLowerCase();

    const existing =
      await this.prisma.qurbanPackage.findUnique({
        where: {
          slug,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Qurban package slug already exists',
      );
    }

    const qurbanPackage =
      await this.prisma.qurbanPackage.create({
        data: {
          name: dto.name.trim(),

          slug,

          description:
            dto.description?.trim() || null,

          animalType: dto.animalType,

          shareCount:
            dto.shareCount ?? 1,

          price: dto.price,

          currency:
            dto.currency
              ?.trim()
              .toUpperCase() || 'IDR',

          qurbanYear:
            dto.qurbanYear,

          distributionLocation:
            dto.distributionLocation?.trim() ||
            null,

          quantityAvailable:
            dto.quantityAvailable ?? 0,

          quantitySold: 0,

          status:
            QurbanPackageStatus.DRAFT,

          createdById: userId,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action:
          'QURBAN_PACKAGE_CREATE',

        entity:
          'QurbanPackage',

        entityId:
          qurbanPackage.id,

        userId,

        metadata: {
          name:
            qurbanPackage.name,

          slug:
            qurbanPackage.slug,

          animalType:
            qurbanPackage.animalType,

          qurbanYear:
            qurbanPackage.qurbanYear,
        } as Prisma.InputJsonObject,
      },
    });

    return qurbanPackage;
  }

  // =========================================================
  // UPDATE PACKAGE
  // =========================================================

  async updatePackage(
    id: string,
    dto: UpdateQurbanPackageDto,
    userId: string,
  ) {
    const packageId = id.trim();

    const existing =
      await this.prisma.qurbanPackage.findUnique({
        where: {
          id: packageId,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Qurban package not found',
      );
    }

    // -------------------------------------------------------
    // DUPLICATE SLUG CHECK
    // -------------------------------------------------------

    if (dto.slug !== undefined) {
      const slug =
        dto.slug
          .trim()
          .toLowerCase();

      const slugOwner =
        await this.prisma.qurbanPackage.findFirst({
          where: {
            slug,

            NOT: {
              id: packageId,
            },
          },
        });

      if (slugOwner) {
        throw new ConflictException(
          'Qurban package slug already exists',
        );
      }
    }

    // -------------------------------------------------------
    // QUANTITY VALIDATION
    // -------------------------------------------------------

    if (
      dto.quantityAvailable !== undefined &&
      dto.quantityAvailable <
        existing.quantitySold
    ) {
      throw new ConflictException(
        'Quantity available cannot be lower than quantity already sold',
      );
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const qurbanPackage =
      await this.prisma.qurbanPackage.update({
        where: {
          id: packageId,
        },

        data: {
          ...(dto.name !== undefined && {
            name:
              dto.name.trim(),
          }),

          ...(dto.slug !== undefined && {
            slug:
              dto.slug
                .trim()
                .toLowerCase(),
          }),

          ...(dto.description !== undefined && {
            description:
              dto.description.trim() ||
              null,
          }),

          ...(dto.animalType !== undefined && {
            animalType:
              dto.animalType,
          }),

          ...(dto.shareCount !== undefined && {
            shareCount:
              dto.shareCount,
          }),

          ...(dto.price !== undefined && {
            price:
              dto.price,
          }),

          ...(dto.currency !== undefined && {
            currency:
              dto.currency
                .trim()
                .toUpperCase(),
          }),

          ...(dto.qurbanYear !== undefined && {
            qurbanYear:
              dto.qurbanYear,
          }),

          ...(dto.distributionLocation !== undefined && {
            distributionLocation:
              dto.distributionLocation.trim() ||
              null,
          }),

          ...(dto.quantityAvailable !== undefined && {
            quantityAvailable:
              dto.quantityAvailable,
          }),

          ...(dto.status !== undefined && {
            status:
              dto.status,
          }),
        },
      });

    // -------------------------------------------------------
    // AUDIT LOG
    // -------------------------------------------------------

    const auditChanges =
      JSON.parse(
        JSON.stringify(dto),
      ) as Prisma.InputJsonObject;

    await this.prisma.auditLog.create({
      data: {
        action:
          'QURBAN_PACKAGE_UPDATE',

        entity:
          'QurbanPackage',

        entityId:
          qurbanPackage.id,

        userId,

        metadata: {
          changes:
            auditChanges,
        },
      },
    });

    return qurbanPackage;
  }

  // =========================================================
  // DELETE PACKAGE
  // =========================================================

  async deletePackage(
    id: string,
    userId: string,
  ) {
    const packageId = id.trim();

    const existing =
      await this.prisma.qurbanPackage.findUnique({
        where: {
          id: packageId,
        },

        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Qurban package not found',
      );
    }

    if (
      existing._count.orders > 0
    ) {
      throw new ConflictException(
        'Qurban package cannot be deleted because it already has orders',
      );
    }

    await this.prisma.qurbanPackage.delete({
      where: {
        id: packageId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action:
          'QURBAN_PACKAGE_DELETE',

        entity:
          'QurbanPackage',

        entityId:
          packageId,

        userId,
      },
    });

    return {
      message:
        'Qurban package deleted successfully',
    };
  }

  // =========================================================
  // CREATE SAVING PLAN
  // =========================================================

  async createSaving(
    dto: CreateQurbanSavingDto,
    userId: string,
  ) {
    const donor =
      await this.prisma.donorProfile.findUnique({
        where: {
          id: dto.donorId,
        },
      });

    if (!donor) {
      throw new NotFoundException(
        'Donor not found',
      );
    }

    if (donor.status !== 'ACTIVE') {
      throw new ConflictException(
        'Donor is not active',
      );
    }

    const startDate =
      new Date(dto.startDate);

    const targetDate =
      new Date(dto.targetDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(targetDate.getTime())
    ) {
      throw new BadRequestException(
        'Invalid startDate or targetDate',
      );
    }

    if (targetDate <= startDate) {
      throw new BadRequestException(
        'targetDate must be after startDate',
      );
    }

    const targetAmount =
      new Prisma.Decimal(
        dto.targetAmount,
      );

    const contributionAmount =
      dto.contributionAmount !== undefined
        ? new Prisma.Decimal(
            dto.contributionAmount,
          )
        : null;

    if (
      contributionAmount &&
      contributionAmount.greaterThan(
        targetAmount,
      )
    ) {
      throw new BadRequestException(
        'Contribution amount cannot exceed target amount',
      );
    }

    const year =
      targetDate.getFullYear();

    const random =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    const savingNumber =
      `QS-${year}-${Date.now()}-${random}`;

    const saving =
      await this.prisma.qurbanSavingPlan.create({
        data: {
          savingNumber,

          donorId:
            dto.donorId,

          qurbanAnimalType:
            dto.qurbanAnimalType,

          targetAmount,

          currentAmount:
            new Prisma.Decimal(0),

          remainingAmount:
            targetAmount,

          currency:
            dto.currency
              ?.trim()
              .toUpperCase() || 'IDR',

          contributionAmount,

          frequency:
            dto.frequency,

          startDate,

          targetDate,

          status:
            QurbanSavingStatus.ACTIVE,

          distributionLocation:
            dto.distributionLocation?.trim() ||
            null,

          pekurbanName:
            dto.pekurbanName?.trim() ||
            null,

          notes:
            dto.notes?.trim() ||
            null,
        },

        include: {
          donor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action:
          'QURBAN_SAVING_CREATE',

        entity:
          'QurbanSavingPlan',

        entityId:
          saving.id,

        userId,

        metadata: {
          savingNumber:
            saving.savingNumber,

          donorId:
            saving.donorId,

          targetAmount:
            saving.targetAmount.toString(),

          frequency:
            saving.frequency,
        },
      },
    });

    return saving;
  }
  // =========================================================
  // FIND ALL SAVING PLANS
  // =========================================================

  async findAllSavings() {
    return this.prisma.qurbanSavingPlan.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        donor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },

        _count: {
          select: {
            contributions: true,
            orders: true,
          },
        },
      },
    });
  }
  // =========================================================
  // FIND ONE SAVING PLAN
  // =========================================================

  async findOneSaving(id: string) {
    const saving =
      await this.prisma.qurbanSavingPlan.findUnique({
        where: {
          id: id.trim(),
        },

        include: {
          donor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },

          contributions: {
            orderBy: {
              contributionDate: 'desc',
            },
          },

          orders: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
              qurbanYear: true,
              createdAt: true,
            },
          },
        },
      });

    if (!saving) {
      throw new NotFoundException(
        'Qurban saving plan not found',
      );
    }

    return saving;
  }
  // =========================================================
  // UPDATE SAVING PLAN
  // =========================================================

  async updateSaving(
    id: string,
    dto: UpdateQurbanSavingDto,
    userId: string,
  ) {
    const saving =
      await this.prisma.qurbanSavingPlan.findUnique({
        where: {
          id: id.trim(),
        },
      });

    if (!saving) {
      throw new NotFoundException(
        'Qurban saving plan not found',
      );
    }

    if (
  (
    [
      QurbanSavingStatus.COMPLETED,
      QurbanSavingStatus.QURBAN_EXECUTED,
      QurbanSavingStatus.CANCELLED,
      QurbanSavingStatus.REFUNDED,
    ] as QurbanSavingStatus[]
  ).includes(saving.status)
) {
      throw new ConflictException(
        'This saving plan can no longer be modified',
      );
    }

    const targetAmount =
      dto.targetAmount !== undefined
        ? new Prisma.Decimal(
            dto.targetAmount,
          )
        : saving.targetAmount;

    const currentAmount =
      saving.currentAmount;

    if (
      targetAmount.lessThan(
        currentAmount,
      )
    ) {
      throw new ConflictException(
        'Target amount cannot be lower than current amount',
      );
    }

    let startDate =
      saving.startDate;

    let targetDate =
      saving.targetDate;

    if (dto.startDate !== undefined) {
      startDate =
        new Date(dto.startDate);
    }

    if (dto.targetDate !== undefined) {
      targetDate =
        new Date(dto.targetDate);
    }

    if (targetDate <= startDate) {
      throw new BadRequestException(
        'targetDate must be after startDate',
      );
    }

    const remainingAmount =
      targetAmount.minus(
        currentAmount,
      );

    const updated =
      await this.prisma.qurbanSavingPlan.update({
        where: {
          id: saving.id,
        },

        data: {
          ...(dto.qurbanAnimalType !== undefined && {
            qurbanAnimalType:
              dto.qurbanAnimalType,
          }),

          ...(dto.targetAmount !== undefined && {
            targetAmount,
            remainingAmount,
          }),

          ...(dto.contributionAmount !== undefined && {
            contributionAmount:
              new Prisma.Decimal(
                dto.contributionAmount,
              ),
          }),

          ...(dto.frequency !== undefined && {
            frequency:
              dto.frequency,
          }),

          startDate,
          targetDate,

          ...(dto.distributionLocation !== undefined && {
            distributionLocation:
              dto.distributionLocation.trim() ||
              null,
          }),

          ...(dto.pekurbanName !== undefined && {
            pekurbanName:
              dto.pekurbanName.trim() ||
              null,
          }),

          ...(dto.notes !== undefined && {
            notes:
              dto.notes.trim() ||
              null,
          }),

          ...(dto.currency !== undefined && {
            currency:
              dto.currency
                .trim()
                .toUpperCase(),
          }),

          ...(dto.status !== undefined && {
            status:
              dto.status,
          }),
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action:
          'QURBAN_SAVING_UPDATE',

        entity:
          'QurbanSavingPlan',

        entityId:
          updated.id,

        userId,

        metadata: {
          changes:
            JSON.parse(
              JSON.stringify(dto),
            ),
        },
      },
    });

    return updated;
  }
  // =========================================================
  // SAVING PROGRESS
  // =========================================================

  async getSavingProgress(id: string) {
    const saving =
      await this.prisma.qurbanSavingPlan.findUnique({
        where: {
          id: id.trim(),
        },

        select: {
          id: true,
          savingNumber: true,
          targetAmount: true,
          currentAmount: true,
          remainingAmount: true,
          currency: true,
          status: true,
        },
      });

    if (!saving) {
      throw new NotFoundException(
        'Qurban saving plan not found',
      );
    }

    const target =
      Number(saving.targetAmount);

    const current =
      Number(saving.currentAmount);

    const progress =
      target > 0
        ? Math.min(
            (current / target) * 100,
            100,
          )
        : 0;

    return {
      id: saving.id,

      savingNumber:
        saving.savingNumber,

      targetAmount:
        saving.targetAmount.toString(),

      currentAmount:
        saving.currentAmount.toString(),

      remainingAmount:
        saving.remainingAmount.toString(),

      currency:
        saving.currency,

      progressPercentage:
        Number(
          progress.toFixed(2),
        ),

      status:
        saving.status,
    };
  }
  // =========================================================
  // CREATE CONTRIBUTION
  // =========================================================

  async createContribution(
    savingId: string,
    dto: CreateQurbanContributionDto,
    userId: string,
  ) {
    const saving =
      await this.prisma.qurbanSavingPlan.findUnique({
        where: {
          id: savingId.trim(),
        },
      });

    if (!saving) {
      throw new NotFoundException(
        'Qurban saving plan not found',
      );
    }

   if (
  (
    [
      QurbanSavingStatus.COMPLETED,
      QurbanSavingStatus.QURBAN_EXECUTED,
      QurbanSavingStatus.CANCELLED,
      QurbanSavingStatus.REFUNDED,
    ] as QurbanSavingStatus[]
  ).includes(saving.status)
) {
      throw new ConflictException(
        'This saving plan does not accept new contributions',
      );
    }

    const amount =
      new Prisma.Decimal(
        dto.amount,
      );

    if (
      amount.greaterThan(
        saving.remainingAmount,
      )
    ) {
      throw new BadRequestException(
        `Contribution exceeds remaining target of ${saving.remainingAmount.toString()}`,
      );
    }

    const year =
      new Date().getFullYear();

    const random =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    const contributionNumber =
      `QSC-${year}-${Date.now()}-${random}`;

    const contribution =
      await this.prisma.qurbanSavingContribution.create({
        data: {
          contributionNumber,

          savingPlanId:
            saving.id,

          amount,

          currency:
            saving.currency,

          status:
            QurbanContributionStatus.PENDING,

          paymentMethod:
            dto.paymentMethod?.trim() ||
            null,

          notes:
            dto.notes?.trim() ||
            null,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action:
          'QURBAN_SAVING_CONTRIBUTION_CREATE',

        entity:
          'QurbanSavingContribution',

        entityId:
          contribution.id,

        userId,

        metadata: {
          savingPlanId:
            saving.id,

          contributionNumber:
            contribution.contributionNumber,

          amount:
            contribution.amount.toString(),
        },
      },
    });

    return contribution;
  }
  // =========================================================
  // FIND CONTRIBUTIONS
  // =========================================================

  async findContributions(
    savingId: string,
  ) {
    const saving =
      await this.prisma.qurbanSavingPlan.findUnique({
        where: {
          id: savingId.trim(),
        },

        select: {
          id: true,
          savingNumber: true,
        },
      });

    if (!saving) {
      throw new NotFoundException(
        'Qurban saving plan not found',
      );
    }

    return this.prisma.qurbanSavingContribution.findMany({
      where: {
        savingPlanId:
          saving.id,
      },

      orderBy: {
        contributionDate: 'desc',
      },
    });
  }
  // =========================================================
  // MARK CONTRIBUTION PAID
  // =========================================================

  async markContributionPaid(
    savingId: string,
    contributionId: string,
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const contribution =
          await tx.qurbanSavingContribution.findFirst({
            where: {
              id:
                contributionId.trim(),

              savingPlanId:
                savingId.trim(),
            },
          });

        if (!contribution) {
          throw new NotFoundException(
            'Qurban saving contribution not found',
          );
        }

        if (
          contribution.status ===
          QurbanContributionStatus.PAID
        ) {
          throw new ConflictException(
            'Contribution is already paid',
          );
        }

        if (
          contribution.status !==
          QurbanContributionStatus.PENDING
        ) {
          throw new ConflictException(
            `Contribution cannot be paid from status ${contribution.status}`,
          );
        }

        const saving =
          await tx.qurbanSavingPlan.findUnique({
            where: {
              id:
                savingId.trim(),
            },
          });

        if (!saving) {
          throw new NotFoundException(
            'Qurban saving plan not found',
          );
        }

        if (
  (
    [
      QurbanSavingStatus.CANCELLED,
      QurbanSavingStatus.REFUNDED,
      QurbanSavingStatus.QURBAN_EXECUTED,
    ] as QurbanSavingStatus[]
  ).includes(
    saving.status,
  )
) {
          throw new ConflictException(
            'Saving plan cannot receive payment',
          );
        }

        const newCurrentAmount =
          saving.currentAmount.plus(
            contribution.amount,
          );

        if (
          newCurrentAmount.greaterThan(
            saving.targetAmount,
          )
        ) {
          throw new ConflictException(
            'Contribution would exceed saving target',
          );
        }

        const newRemainingAmount =
          saving.targetAmount.minus(
            newCurrentAmount,
          );

        const newStatus =
          newRemainingAmount.isZero()
            ? QurbanSavingStatus.COMPLETED
            : QurbanSavingStatus.ON_TRACK;

        const updatedContribution =
          await tx.qurbanSavingContribution.update({
            where: {
              id:
                contribution.id,
            },

            data: {
              status:
                QurbanContributionStatus.PAID,
            },
          });

        const updatedSaving =
          await tx.qurbanSavingPlan.update({
            where: {
              id:
                saving.id,
            },

            data: {
              currentAmount:
                newCurrentAmount,

              remainingAmount:
                newRemainingAmount,

              status:
                newStatus,
            },
          });

        await tx.auditLog.create({
          data: {
            action:
              'QURBAN_SAVING_CONTRIBUTION_PAID',

            entity:
              'QurbanSavingContribution',

            entityId:
              contribution.id,

            userId,

            metadata: {
              savingPlanId:
                saving.id,

              contributionNumber:
                contribution.contributionNumber,

              amount:
                contribution.amount.toString(),

              currentAmount:
                newCurrentAmount.toString(),

              remainingAmount:
                newRemainingAmount.toString(),

              savingStatus:
                newStatus,
            },
          },
        });

        return {
          contribution:
            updatedContribution,

          saving:
            updatedSaving,
        };
      },
    );
  }
  // =========================================================
  // MARK CONTRIBUTION FAILED
  // =========================================================

  async markContributionFailed(
    savingId: string,
    contributionId: string,
    userId: string,
  ) {
    const contribution =
      await this.prisma.qurbanSavingContribution.findFirst({
        where: {
          id:
            contributionId.trim(),

          savingPlanId:
            savingId.trim(),
        },
      });

    if (!contribution) {
      throw new NotFoundException(
        'Qurban saving contribution not found',
      );
    }

    if (
      contribution.status !==
      QurbanContributionStatus.PENDING
    ) {
      throw new ConflictException(
        `Contribution cannot be failed from status ${contribution.status}`,
      );
    }

    const updated =
      await this.prisma.qurbanSavingContribution.update({
        where: {
          id:
            contribution.id,
        },

        data: {
          status:
            QurbanContributionStatus.FAILED,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action:
          'QURBAN_SAVING_CONTRIBUTION_FAILED',

        entity:
          'QurbanSavingContribution',

        entityId:
          contribution.id,

        userId,

        metadata: {
          savingPlanId:
            savingId,

          contributionNumber:
            contribution.contributionNumber,
        },
      },
    });

    return updated;
  }

  // =========================================================
  // CREATE QURBAN PAYMENT
  // =========================================================

  async createContributionPayment(
    savingId: string,
    contributionId: string,
    dto: CreateQurbanPaymentDto,
    userId: string,
  ) {
    const contribution =
      await this.prisma.qurbanSavingContribution.findFirst({
        where: {
          id: contributionId.trim(),
          savingPlanId: savingId.trim(),
        },
      });

    if (!contribution) {
      throw new NotFoundException(
        'Qurban saving contribution not found',
      );
    }

    if (
      contribution.status !==
      QurbanContributionStatus.PENDING
    ) {
      throw new ConflictException(
        `Payment cannot be created from contribution status ${contribution.status}`,
      );
    }

    const existingPayment =
      await this.prisma.qurbanPaymentTransaction.findFirst({
        where: {
          qurbanSavingContributionId:
            contribution.id,

          status: {
            in: [
              'INITIATED',
              'PENDING',
              'PAID',
            ],
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    if (existingPayment) {
      throw new ConflictException(
        'An active payment already exists for this contribution',
      );
    }

    const provider =
      dto.provider?.trim().toUpperCase() ||
      'MOCK';

    const random =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    const transactionReference =
      `QSC-${Date.now()}-${random}`;

    const payment =
      await this.prisma.qurbanPaymentTransaction.create({
        data: {
          qurbanSavingContributionId:
            contribution.id,

          transactionReference,

          provider,

          paymentMethod:
            dto.paymentMethod
              .trim()
              .toUpperCase(),

          amount:
            contribution.amount,

          currency:
            contribution.currency,

          status:
            'INITIATED',
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action:
          'QURBAN_PAYMENT_CREATED',

        entity:
          'QurbanPaymentTransaction',

        entityId:
          payment.id,

        userId,

        metadata: {
          contributionId:
            contribution.id,

          savingPlanId:
            savingId,

          transactionReference,

          amount:
            contribution.amount.toString(),

          currency:
            contribution.currency,

          provider,

          paymentMethod:
            dto.paymentMethod,
        },
      },
    });

    return payment;
  }
}
