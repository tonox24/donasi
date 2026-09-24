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
  QurbanPriceStatus,
  QurbanDistributionStatus,
  QurbanAnimalStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma.service';

import { CreateQurbanPackageDto } from './dto/create-qurban-package.dto';
import { UpdateQurbanPackageDto } from './dto/update-qurban-package.dto';
import { CreateQurbanSavingDto } from './dto/create-qurban-saving.dto';
import { UpdateQurbanSavingDto } from './dto/update-qurban-saving.dto';
import { CreateQurbanContributionDto } from './dto/create-qurban-contribution.dto';
import { CreateQurbanPaymentDto } from './dto/create-qurban-payment.dto';
import { CreateQurbanPriceAdjustmentDto } from './dto/create-qurban-price-adjustment.dto';
import { CreateQurbanOrderDto } from './dto/create-qurban-order.dto';

import { CreateQurbanDistributionDto } from './dto/create-qurban-distribution.dto';
import { CreateQurbanDistributionBeneficiaryDto } from './dto/create-qurban-distribution-beneficiary.dto';
import { UpdateQurbanDistributionStatusDto } from './dto/update-qurban-distribution-status.dto';

@Injectable()
export class QurbanService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
  
  // =========================================================
  // CREATE QURBAN DISTRIBUTION
  // =========================================================

  async createDistribution(
    dto: CreateQurbanDistributionDto,
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const order =
          await tx.qurbanOrder.findUnique({
            where: {
              id: dto.qurbanOrderId,
            },
            include: {
              animals: true,
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

        if (!order) {
          throw new NotFoundException(
            'Qurban order not found',
          );
        }

        if (order.animals.length === 0) {
          throw new ConflictException(
            'Qurban order does not have any registered animal',
          );
        }

        const hasUnprocessedAnimal =
          order.animals.some(
            (animal) =>
              animal.status !==
                QurbanAnimalStatus.PROCESSED &&
              animal.status !==
                QurbanAnimalStatus.DISTRIBUTED,
          );

        if (hasUnprocessedAnimal) {
          throw new ConflictException(
            'All Qurban animals must be PROCESSED before distribution',
          );
        }

        const existingDistribution =
          await tx.qurbanDistribution.findFirst({
            where: {
              qurbanOrderId: order.id,
              status: {
                not: QurbanDistributionStatus.CANCELLED,
              },
            },
          });

        if (existingDistribution) {
          throw new ConflictException(
            'A distribution already exists for this Qurban order',
          );
        }

        const now = new Date();

        const random =
          Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

        const distributionNumber =
          `QD-${order.qurbanYear}-${Date.now()}-${random}`;

        const distribution =
          await tx.qurbanDistribution.create({
            data: {
              distributionNumber,

              qurbanOrderId:
                order.id,

              location:
                dto.location.trim(),

              distributionDate:
                dto.distributionDate
                  ? new Date(dto.distributionDate)
                  : null,

              packageQuantity:
                dto.packageQuantity,

              beneficiaryCount:
                0,

              status:
                QurbanDistributionStatus.DRAFT,

              notes:
                dto.notes?.trim() ||
                null,

              createdById:
                userId,
            },

            include: {
              qurbanOrder: {
                select: {
                  id: true,
                  orderNumber: true,
                  pekurbanName: true,
                  donorName: true,
                  qurbanYear: true,
                  animalType: true,
                },
              },

              beneficiaries: true,
            },
          });

        await tx.auditLog.create({
          data: {
            action:
              'QURBAN_DISTRIBUTION_CREATE',

            entity:
              'QurbanDistribution',

            entityId:
              distribution.id,

            userId,

            metadata: {
              distributionNumber:
                distribution.distributionNumber,

              qurbanOrderId:
                order.id,

              orderNumber:
                order.orderNumber,

              packageQuantity:
                dto.packageQuantity,

              location:
                dto.location,
            } as Prisma.InputJsonObject,
          },
        });

        return distribution;
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
  
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
// CREATE QURBAN ORDER
// =========================================================

async createOrder(
  dto: CreateQurbanOrderDto,
  userId: string,
) {
  return this.prisma.$transaction(
    async (tx) => {
      // ---------------------------------------------------
      // FIND DONOR
      // ---------------------------------------------------

      const donor =
        await tx.donorProfile.findUnique({
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

      // ---------------------------------------------------
      // FIND PACKAGE
      // ---------------------------------------------------

      const qurbanPackage =
        await tx.qurbanPackage.findUnique({
          where: {
            id: dto.qurbanPackageId,
          },
        });

      if (!qurbanPackage) {
        throw new NotFoundException(
          'Qurban package not found',
        );
      }

      // ---------------------------------------------------
      // PACKAGE STATUS
      // ---------------------------------------------------

      if (
        qurbanPackage.status !==
        QurbanPackageStatus.ACTIVE
      ) {
        throw new ConflictException(
          'Qurban package is not active',
        );
      }

      // ---------------------------------------------------
      // VALIDATE SHARE COUNT
      // ---------------------------------------------------

      if (
        dto.shareCount < 1 ||
        dto.shareCount >
          qurbanPackage.shareCount
      ) {
        throw new BadRequestException(
          `Share count must be between 1 and ${qurbanPackage.shareCount}`,
        );
      }

      // ---------------------------------------------------
      // VALIDATE QUANTITY
      // ---------------------------------------------------

      if (dto.quantity < 1) {
        throw new BadRequestException(
          'Quantity must be at least 1',
        );
      }

      const available =
        qurbanPackage.quantityAvailable -
        qurbanPackage.quantitySold;

      if (dto.quantity > available) {
        throw new ConflictException(
          'Insufficient qurban package availability',
        );
      }

      // ---------------------------------------------------
      // SAVING PLAN OPTIONAL
      // ---------------------------------------------------

      if (dto.savingPlanId) {
        const saving =
          await tx.qurbanSavingPlan.findUnique({
            where: {
              id: dto.savingPlanId,
            },
          });

        if (!saving) {
          throw new NotFoundException(
            'Qurban saving plan not found',
          );
        }

        if (
          saving.donorId !==
          dto.donorId
        ) {
          throw new ConflictException(
            'Saving plan does not belong to this donor',
          );
        }
      }

      // ---------------------------------------------------
      // PRICE CALCULATION
      // ---------------------------------------------------

      const unitPrice =
        new Prisma.Decimal(
          qurbanPackage.price,
        );

      const quantity =
        new Prisma.Decimal(
          dto.quantity,
        );

      const shareCount =
        new Prisma.Decimal(
          dto.shareCount,
        );

      /*
       * Example:
       *
       * Package price = Rp4,000,000
       * Share = 1
       * Quantity = 1
       *
       * Total = Rp4,000,000
       *
       * If 2 shares:
       *
       * Total = Rp4,000,000 x 2
       *       = Rp8,000,000
       */

      const totalAmount =
        unitPrice
          .times(quantity)
          .times(shareCount);

      // ---------------------------------------------------
      // GENERATE ORDER NUMBER
      // ---------------------------------------------------

      const year =
        qurbanPackage.qurbanYear;

      const random =
        Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();

      const orderNumber =
        `QO-${year}-${Date.now()}-${random}`;

      // ---------------------------------------------------
      // CREATE ORDER
      // ---------------------------------------------------

      const order =
        await tx.qurbanOrder.create({
          data: {
            orderNumber,

            donorId:
              donor.id,

            qurbanPackageId:
              qurbanPackage.id,

            savingPlanId:
              dto.savingPlanId ??
              null,

            animalType:
              qurbanPackage.animalType,

            quantity:
              dto.quantity,

            shareCount:
              dto.shareCount,

            unitPrice,

            totalAmount,

            currency:
              dto.currency
                ?.trim()
                .toUpperCase() ||
              qurbanPackage.currency ||
              'IDR',

            qurbanYear:
              qurbanPackage.qurbanYear,

            pekurbanName:
              dto.pekurbanName.trim(),

            donorName:
              dto.donorName?.trim() ||
              donor.fullName,

            donorEmail:
              dto.donorEmail?.trim() ||
              donor.email ||
              null,

            donorPhone:
              dto.donorPhone?.trim() ||
              donor.phone ||
              null,

            distributionLocation:
              dto.distributionLocation?.trim() ||
              qurbanPackage.distributionLocation ||
              null,

            status:
              'PENDING_PAYMENT',

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

            qurbanPackage: {
              select: {
                id: true,
                name: true,
                slug: true,
                animalType: true,
                shareCount: true,
                price: true,
                currency: true,
                qurbanYear: true,
                distributionLocation: true,
              },
            },
          },
        });

      // ---------------------------------------------------
      // AUDIT LOG
      // ---------------------------------------------------

      await tx.auditLog.create({
        data: {
          action:
            'QURBAN_ORDER_CREATED',

          entity:
            'QurbanOrder',

          entityId:
            order.id,

          userId,

          metadata: {
            orderNumber:
              order.orderNumber,

            donorId:
              order.donorId,

            qurbanPackageId:
              order.qurbanPackageId,

            savingPlanId:
              order.savingPlanId,

            animalType:
              order.animalType,

            quantity:
              order.quantity,

            shareCount:
              order.shareCount,

            unitPrice:
              order.unitPrice.toString(),

            totalAmount:
              order.totalAmount.toString(),

            currency:
              order.currency,

            qurbanYear:
              order.qurbanYear,
          } as Prisma.InputJsonObject,
        },
      });

      return order;
    },
  );
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

          estimatedAmount:
            targetAmount,

          recommendedTargetAmount:
            targetAmount,

          finalAmount:
            null,

          currentAmount:
            new Prisma.Decimal(0),

          remainingAmount:
            targetAmount,

          shortfallAmount:
            targetAmount,

          excessAmount:
            new Prisma.Decimal(0),

          bufferPercentage:
            null,

          priceStatus:
            QurbanPriceStatus.ESTIMATED,

          priceFinalizedAt:
            null,

          priceLockedAt:
            null,

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

          estimatedAmount:
            saving.estimatedAmount.toString(),

          recommendedTargetAmount:
            saving.recommendedTargetAmount?.toString() ??
            null,

          priceStatus:
            saving.priceStatus,

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

          priceAdjustments: {
            orderBy: {
              effectiveDate: 'desc',
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

    if (
      dto.targetAmount !== undefined &&
      (saving.currentAmount.greaterThan(0) ||
        saving.finalAmount !== null ||
        saving.priceStatus === QurbanPriceStatus.LOCKED)
    ) {
      throw new ConflictException(
        'Target amount cannot be changed after contributions or price finalization',
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
            estimatedAmount:
              saving.finalAmount === null
                ? targetAmount
                : saving.estimatedAmount,
            recommendedTargetAmount:
              saving.finalAmount === null
                ? targetAmount
                : saving.recommendedTargetAmount,
            remainingAmount,
            shortfallAmount: remainingAmount,
            excessAmount: new Prisma.Decimal(0),
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
  // LOCK FINAL QURBAN PRICE
  // =========================================================
  //
  // Locks the current final Qurban price so it can no longer
  // be changed through price adjustment.
  //
  // Important:
  // - Existing contributions remain unchanged.
  // - Locking the price does NOT create a financial transaction.
  // - Contributions already created can still be paid.
  // - Once LOCKED, price adjustment is prohibited.
  // =========================================================

  async lockPrice(
    savingId: string,
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const cleanSavingId =
          savingId.trim();

        const saving =
          await tx.qurbanSavingPlan.findUnique({
            where: {
              id: cleanSavingId,
            },
        });

        if (!saving) {
          throw new NotFoundException(
            'Qurban saving plan not found',
          );
        }

        // -----------------------------------------------------
        // TERMINAL VALIDATION
        // -----------------------------------------------------

        if (
          (
            [
              QurbanSavingStatus.CANCELLED,
              QurbanSavingStatus.REFUNDED,
            ] as QurbanSavingStatus[]
          ).includes(saving.status)
        ) {
          throw new ConflictException(
            'Price cannot be locked for this saving plan',
          );
        }

        // -----------------------------------------------------
        // ALREADY LOCKED
        // -----------------------------------------------------

        if (
          saving.priceStatus ===
          QurbanPriceStatus.LOCKED
        ) {
          throw new ConflictException(
            'Qurban price is already locked',
          );
        }

        // -----------------------------------------------------
        // FINAL PRICE REQUIRED
        // -----------------------------------------------------

        if (!saving.finalAmount) {
          throw new ConflictException(
            'Final Qurban price must be established before it can be locked',
          );
        }

        if (
          saving.finalAmount.lessThanOrEqualTo(0)
        ) {
          throw new BadRequestException(
            'Final Qurban price must be greater than zero',
          );
        }

        // -----------------------------------------------------
        // LOCK TIMESTAMP
        // -----------------------------------------------------

        const lockedAt =
          new Date();

        // -----------------------------------------------------
        // UPDATE SAVING
        // -----------------------------------------------------

        const updatedSaving =
          await tx.qurbanSavingPlan.update({
            where: {
              id: saving.id,
            },

            data: {
              priceStatus:
                QurbanPriceStatus.LOCKED,

              priceLockedAt:
                lockedAt,
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

        // -----------------------------------------------------
        // AUDIT LOG
        // -----------------------------------------------------

        await tx.auditLog.create({
          data: {
            action:
              'QURBAN_SAVING_PRICE_LOCKED',

            entity:
              'QurbanSavingPlan',

            entityId:
              saving.id,

            userId,

            metadata: {
              savingNumber:
                saving.savingNumber,

              finalAmount:
                saving.finalAmount.toString(),

              currentAmount:
                saving.currentAmount.toString(),

              remainingAmount:
                saving.remainingAmount.toString(),

              shortfallAmount:
                saving.shortfallAmount.toString(),

              excessAmount:
                saving.excessAmount.toString(),

              previousPriceStatus:
                saving.priceStatus,

              newPriceStatus:
                QurbanPriceStatus.LOCKED,

              priceLockedAt:
                lockedAt.toISOString(),
            } as Prisma.InputJsonObject,
          },
        });

        return {
          message:
            'Qurban price locked successfully',

          saving:
            updatedSaving,

          settlement: {
            finalPrice:
              saving.finalAmount.toString(),

            currentAmount:
              saving.currentAmount.toString(),

            remainingAmount:
              saving.remainingAmount.toString(),

            shortfallAmount:
              saving.shortfallAmount.toString(),

            excessAmount:
              saving.excessAmount.toString(),

            priceStatus:
              QurbanPriceStatus.LOCKED,

            priceLockedAt:
              lockedAt.toISOString(),
          },
        };
      },
    );
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
          estimatedAmount: true,
          recommendedTargetAmount: true,
          finalAmount: true,
          currentAmount: true,
          remainingAmount: true,
          shortfallAmount: true,
          excessAmount: true,
          bufferPercentage: true,
          priceStatus: true,
          priceFinalizedAt: true,
          priceLockedAt: true,
          currency: true,
          status: true,
        },
      });

    if (!saving) {
      throw new NotFoundException(
        'Qurban saving plan not found',
      );
    }

    const effectiveTarget =
      saving.finalAmount ??
      saving.targetAmount;

    const target =
      Number(effectiveTarget);

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

      estimatedAmount:
        saving.estimatedAmount.toString(),

      recommendedTargetAmount:
        saving.recommendedTargetAmount?.toString() ??
        null,

      finalAmount:
        saving.finalAmount?.toString() ??
        null,

      effectiveTargetAmount:
        effectiveTarget.toString(),

      currentAmount:
        saving.currentAmount.toString(),

      remainingAmount:
        saving.remainingAmount.toString(),

      shortfallAmount:
        saving.shortfallAmount.toString(),

      excessAmount:
        saving.excessAmount.toString(),

      bufferPercentage:
        saving.bufferPercentage?.toString() ??
        null,

      priceStatus:
        saving.priceStatus,

      priceFinalizedAt:
        saving.priceFinalizedAt,

      priceLockedAt:
        saving.priceLockedAt,

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

    const effectiveTarget =
      saving.finalAmount ??
      saving.targetAmount;

    const remainingAmount =
      effectiveTarget.minus(
        saving.currentAmount,
      );

    if (remainingAmount.lessThanOrEqualTo(0)) {
      throw new ConflictException(
        'Saving plan has already reached its effective target',
      );
    }

    if (
      amount.greaterThan(
        remainingAmount,
      )
    ) {
      throw new BadRequestException(
        `Contribution exceeds remaining target of ${remainingAmount.toString()}`,
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
      const cleanSavingId = savingId.trim();
      const cleanContributionId = contributionId.trim();

      // -----------------------------------------------------
      // GET CONTRIBUTION
      // -----------------------------------------------------

      const contribution =
        await tx.qurbanSavingContribution.findFirst({
          where: {
            id: cleanContributionId,
            savingPlanId: cleanSavingId,
          },
        });

      if (!contribution) {
        throw new NotFoundException(
          'Qurban saving contribution not found',
        );
      }

      // -----------------------------------------------------
      // CONTRIBUTION STATUS VALIDATION
      // -----------------------------------------------------

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

      // -----------------------------------------------------
      // GET SAVING PLAN
      // -----------------------------------------------------

      const saving =
        await tx.qurbanSavingPlan.findUnique({
          where: {
            id: cleanSavingId,
          },
        });

      if (!saving) {
        throw new NotFoundException(
          'Qurban saving plan not found',
        );
      }

      // -----------------------------------------------------
      // SAVING STATUS VALIDATION
      // -----------------------------------------------------

      if (
        (
          [
            QurbanSavingStatus.CANCELLED,
            QurbanSavingStatus.REFUNDED,
            QurbanSavingStatus.QURBAN_EXECUTED,
          ] as QurbanSavingStatus[]
        ).includes(saving.status)
      ) {
        throw new ConflictException(
          'Saving plan cannot receive payment',
        );
      }

      // -----------------------------------------------------
      // FIND ACTIVE PAYMENT
      // -----------------------------------------------------

      const payment =
        await tx.qurbanPaymentTransaction.findFirst({
          where: {
            qurbanSavingContributionId:
              contribution.id,

            status: {
              in: [
                'INITIATED',
                'PENDING',
              ],
            },
          },

          orderBy: {
            createdAt: 'desc',
          },
        });

      if (!payment) {
        throw new ConflictException(
          'No active payment transaction found for this contribution',
        );
      }

      // -----------------------------------------------------
      // CALCULATE NEW SAVING BALANCE
      // -----------------------------------------------------

      const effectiveTarget =
        saving.finalAmount ??
        saving.targetAmount;

      const newCurrentAmount =
        saving.currentAmount.plus(
          contribution.amount,
        );

      /*
       * A contribution may have been created before a final
       * price adjustment. If the final price subsequently
       * decreases, the payment can legitimately make the
       * saving exceed the final target. We record that amount
       * as excess instead of rejecting the historical payment.
       */
      const newRemainingAmount =
        effectiveTarget.greaterThan(
          newCurrentAmount,
        )
          ? effectiveTarget.minus(
              newCurrentAmount,
            )
          : new Prisma.Decimal(0);

      const newShortfallAmount =
        newRemainingAmount;

      const newExcessAmount =
        newCurrentAmount.greaterThan(
          effectiveTarget,
        )
          ? newCurrentAmount.minus(
              effectiveTarget,
            )
          : new Prisma.Decimal(0);

      const newStatus =
        newRemainingAmount.isZero()
          ? QurbanSavingStatus.COMPLETED
          : QurbanSavingStatus.ON_TRACK;

      const paidAt = new Date();

      // -----------------------------------------------------
      // UPDATE PAYMENT → PAID
      // -----------------------------------------------------

      const updatedPayment =
        await tx.qurbanPaymentTransaction.update({
          where: {
            id: payment.id,
          },

          data: {
            status: 'PAID',

            paidAt,

            providerTransactionId:
              payment.providerTransactionId ??
              payment.transactionReference,

            rawResponse: {
              status: 'PAID',
              provider: payment.provider,
              source: 'QURBAN_RECONCILIATION',
              reconciledBy: userId,
              reconciledAt:
                paidAt.toISOString(),
            },
          },
        });

      // -----------------------------------------------------
      // UPDATE CONTRIBUTION → PAID
      // -----------------------------------------------------

      const updatedContribution =
        await tx.qurbanSavingContribution.update({
          where: {
            id: contribution.id,
          },

          data: {
            status:
              QurbanContributionStatus.PAID,

            paymentReference:
              updatedPayment.transactionReference,

            providerTransactionId:
              updatedPayment.providerTransactionId,
          },
        });

      // -----------------------------------------------------
      // UPDATE SAVING PLAN
      // -----------------------------------------------------

      const updatedSaving =
        await tx.qurbanSavingPlan.update({
          where: {
            id: saving.id,
          },

          data: {
            currentAmount:
              newCurrentAmount,

            remainingAmount:
              newRemainingAmount,

            shortfallAmount:
              newShortfallAmount,

            excessAmount:
              newExcessAmount,

            status:
              newStatus,
          },
        });

      // -----------------------------------------------------
      // FINANCE LEDGER
      // -----------------------------------------------------

      const ledgerReference =
        `QURBAN-CONTRIBUTION-${contribution.id}`;

      const ledger =
        await tx.financeLedger.upsert({
          where: {
            reference: ledgerReference,
          },

          create: {
            transactionDate: paidAt,

            type: 'INCOME',

            status: 'POSTED',

            reference:
              ledgerReference,

            qurbanPaymentTransactionId:
              updatedPayment.id,

            description:
              `Tabungan Qurban contribution ${contribution.contributionNumber}`,

            amount:
              contribution.amount,

            currency:
              contribution.currency,

            metadata: {
              source:
                'QURBAN_SAVING',

              savingPlanId:
                saving.id,

              savingNumber:
                saving.savingNumber,

              contributionId:
                contribution.id,

              contributionNumber:
                contribution.contributionNumber,

              paymentTransactionId:
                updatedPayment.id,

              transactionReference:
                updatedPayment.transactionReference,

              provider:
                updatedPayment.provider,

              paymentMethod:
                updatedPayment.paymentMethod,
            },

            createdById:
              userId,
          },

          update: {},
        });

      // -----------------------------------------------------
      // AUDIT LOG
      // -----------------------------------------------------

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

            savingNumber:
              saving.savingNumber,

            contributionNumber:
              contribution.contributionNumber,

            paymentTransactionId:
              updatedPayment.id,

            transactionReference:
              updatedPayment.transactionReference,

            amount:
              contribution.amount.toString(),

            currentAmount:
              newCurrentAmount.toString(),

            effectiveTargetAmount:
              effectiveTarget.toString(),

            remainingAmount:
              newRemainingAmount.toString(),

            shortfallAmount:
              newShortfallAmount.toString(),

            excessAmount:
              newExcessAmount.toString(),

            savingStatus:
              newStatus,

            financeLedgerId:
              ledger.id,

            financeLedgerReference:
              ledger.reference,
          },
        },
      });

      // -----------------------------------------------------
      // RESPONSE
      // -----------------------------------------------------

      return {
        contribution:
          updatedContribution,

        payment:
          updatedPayment,

        saving:
          updatedSaving,

        financeLedger:
          ledger,
      };
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
  // =========================================================
  // CREATE QURBAN PRICE ADJUSTMENT
  // =========================================================

  async createPriceAdjustment(
    savingId: string,
    dto: CreateQurbanPriceAdjustmentDto,
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const cleanSavingId =
          savingId.trim();

        const saving =
          await tx.qurbanSavingPlan.findUnique({
            where: {
              id: cleanSavingId,
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
            'Price cannot be adjusted for this saving plan',
          );
        }

        if (
          saving.priceStatus ===
          QurbanPriceStatus.LOCKED
        ) {
          throw new ConflictException(
            'Qurban price is already locked',
          );
        }

        const newAmount =
          new Prisma.Decimal(
            dto.finalAmount,
          );

        if (
          newAmount.lessThanOrEqualTo(0)
        ) {
          throw new BadRequestException(
            'Final amount must be greater than zero',
          );
        }

        const oldAmount =
          saving.finalAmount ??
          (saving.estimatedAmount.greaterThan(0)
            ? saving.estimatedAmount
            : saving.targetAmount);

        if (
          saving.finalAmount !== null &&
          newAmount.equals(
            saving.finalAmount,
          )
        ) {
          throw new ConflictException(
            'Final Qurban price is unchanged',
          );
        }

        const difference =
          newAmount.minus(oldAmount);

        const percentage =
          oldAmount.greaterThan(0)
            ? difference
                .dividedBy(oldAmount)
                .times(100)
            : null;

        const currentAmount =
          saving.currentAmount;

        const shortfallAmount =
          newAmount.greaterThan(
            currentAmount,
          )
            ? newAmount.minus(
                currentAmount,
              )
            : new Prisma.Decimal(0);

        const excessAmount =
          currentAmount.greaterThan(
            newAmount,
          )
            ? currentAmount.minus(
                newAmount,
              )
            : new Prisma.Decimal(0);

        const remainingAmount =
          shortfallAmount;

        /*
         * First finalization:
         * - same as estimated price => FINALIZED
         * - different from estimated price => ADJUSTED
         *
         * Subsequent price changes are always ADJUSTED.
         */
        const priceStatus =
          saving.finalAmount === null &&
          newAmount.equals(
            saving.estimatedAmount,
          )
            ? QurbanPriceStatus.FINALIZED
            : QurbanPriceStatus.ADJUSTED;

        const effectiveDate =
          dto.effectiveDate
            ? new Date(dto.effectiveDate)
            : new Date();

        if (
          Number.isNaN(
            effectiveDate.getTime(),
          )
        ) {
          throw new BadRequestException(
            'Invalid effectiveDate',
          );
        }

        const priceAdjustment =
          await tx.qurbanPriceAdjustment.create({
            data: {
              savingPlanId:
                saving.id,

              oldAmount,

              newAmount,

              difference,

              percentage,

              reason:
                dto.reason?.trim() ||
                null,

              effectiveDate,

              approvedById:
                userId,
            },
          });

        const updatedSaving =
          await tx.qurbanSavingPlan.update({
            where: {
              id: saving.id,
            },

            data: {
              finalAmount:
                newAmount,

              remainingAmount:
                remainingAmount,

              shortfallAmount:
                shortfallAmount,

              excessAmount:
                excessAmount,

              priceStatus,

              priceFinalizedAt:
                new Date(),
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

        await tx.auditLog.create({
          data: {
            action:
              'QURBAN_SAVING_PRICE_ADJUSTED',

            entity:
              'QurbanSavingPlan',

            entityId:
              saving.id,

            userId,

            metadata: {
              savingNumber:
                saving.savingNumber,

              oldAmount:
                oldAmount.toString(),

              newAmount:
                newAmount.toString(),

              difference:
                difference.toString(),

              percentage:
                percentage?.toString() ??
                null,

              currentAmount:
                currentAmount.toString(),

              remainingAmount:
                remainingAmount.toString(),

              shortfallAmount:
                shortfallAmount.toString(),

              excessAmount:
                excessAmount.toString(),

              priceStatus,

              priceAdjustmentId:
                priceAdjustment.id,

              effectiveDate:
                effectiveDate.toISOString(),

              reason:
                dto.reason?.trim() ||
                null,
            } as Prisma.InputJsonObject,
          },
        });

        return {
          message:
            'Qurban price adjusted successfully',

          priceAdjustment,

          saving:
            updatedSaving,

          settlement: {
            previousPrice:
              oldAmount.toString(),

            finalPrice:
              newAmount.toString(),

            difference:
              difference.toString(),

            percentage:
              percentage?.toString() ??
              null,

            currentAmount:
              currentAmount.toString(),

            remainingAmount:
              remainingAmount.toString(),

            shortfallAmount:
              shortfallAmount.toString(),

            excessAmount:
              excessAmount.toString(),

            priceStatus,
          },
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
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
  
  // =========================================================
  // FIND ALL DISTRIBUTIONS
  // =========================================================

  async findAllDistributions() {
    return this.prisma.qurbanDistribution.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        qurbanOrder: {
          select: {
            id: true,
            orderNumber: true,
            pekurbanName: true,
            donorName: true,
            qurbanYear: true,
            animalType: true,
          },
        },

        beneficiaries: {
          include: {
            beneficiary: {
              select: {
                id: true,
                name: true,
                type: true,
                location: true,
              },
            },
          },
        },

        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }
  // =========================================================
  // FIND ONE DISTRIBUTION
  // =========================================================

  async findOneDistribution(
    id: string,
  ) {
    const distribution =
      await this.prisma.qurbanDistribution.findUnique({
        where: {
          id: id.trim(),
        },

        include: {
          qurbanOrder: {
            include: {
              donor: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                },
              },

              animals: {
                select: {
                  id: true,
                  animalCode: true,
                  animalType: true,
                  ageMonths: true,
                  weightKg: true,
                  sex: true,
                  healthStatus: true,
                  location: true,
                  status: true,
                  verifiedAt: true,
                  slaughteredAt: true,
                  processedAt: true,
                  distributedAt: true,
                },
              },
            },
          },

          beneficiaries: {
            include: {
              beneficiary: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  location: true,
                  description: true,
                },
              },
            },

            orderBy: {
              createdAt: 'asc',
            },
          },

          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

    if (!distribution) {
      throw new NotFoundException(
        'Qurban distribution not found',
      );
    }

    return distribution;
  }
  // =========================================================
  // ADD DISTRIBUTION BENEFICIARY
  // =========================================================

  async addDistributionBeneficiary(
    distributionId: string,
    dto: CreateQurbanDistributionBeneficiaryDto,
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const distribution =
          await tx.qurbanDistribution.findUnique({
            where: {
              id: distributionId.trim(),
            },
          });

        if (!distribution) {
          throw new NotFoundException(
            'Qurban distribution not found',
          );
        }

        if (
          distribution.status ===
            QurbanDistributionStatus.DISTRIBUTED ||
          distribution.status ===
            QurbanDistributionStatus.CANCELLED
        ) {
          throw new ConflictException(
            'Beneficiary cannot be added to this distribution',
          );
        }

        const beneficiary =
          await tx.beneficiary.findUnique({
            where: {
              id: dto.beneficiaryId,
            },
          });

        if (!beneficiary) {
          throw new NotFoundException(
            'Beneficiary not found',
          );
        }

        if (!beneficiary.isActive) {
          throw new ConflictException(
            'Beneficiary is not active',
          );
        }

        const existing =
          await tx.qurbanDistributionBeneficiary.findUnique({
            where: {
              distributionId_beneficiaryId: {
                distributionId:
                  distribution.id,

                beneficiaryId:
                  beneficiary.id,
              },
            },
          });

        if (existing) {
          throw new ConflictException(
            'Beneficiary is already assigned to this distribution',
          );
        }

        const currentPackageQuantity =
          await tx.qurbanDistributionBeneficiary.aggregate({
            where: {
              distributionId:
                distribution.id,
            },

            _sum: {
              packageQuantity: true,
            },
          });

        const assignedPackages =
          currentPackageQuantity._sum.packageQuantity ??
          0;

        const newTotal =
          assignedPackages +
          dto.packageQuantity;

        if (
          newTotal >
          distribution.packageQuantity
        ) {
          throw new ConflictException(
            `Package quantity exceeds distribution capacity. Available: ${
              distribution.packageQuantity -
              assignedPackages
            }`,
          );
        }

        const item =
          await tx.qurbanDistributionBeneficiary.create({
            data: {
              distributionId:
                distribution.id,

              beneficiaryId:
                beneficiary.id,

              packageQuantity:
                dto.packageQuantity,

              receivedAt:
                dto.receivedAt
                  ? new Date(dto.receivedAt)
                  : null,

              notes:
                dto.notes?.trim() ||
                null,
            },

            include: {
              beneficiary: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  location: true,
                },
              },
            },
          });

        const beneficiaryCount =
          await tx.qurbanDistributionBeneficiary.count({
            where: {
              distributionId:
                distribution.id,
            },
          });

        await tx.qurbanDistribution.update({
          where: {
            id: distribution.id,
          },

          data: {
            beneficiaryCount,
          },
        });

        await tx.auditLog.create({
          data: {
            action:
              'QURBAN_DISTRIBUTION_BENEFICIARY_ADD',

            entity:
              'QurbanDistribution',

            entityId:
              distribution.id,

            userId,

            metadata: {
              beneficiaryId:
                beneficiary.id,

              beneficiaryName:
                beneficiary.name,

              packageQuantity:
                dto.packageQuantity,

              distributionNumber:
                distribution.distributionNumber,
            } as Prisma.InputJsonObject,
          },
        });

        return item;
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
  // =========================================================
  // UPDATE DISTRIBUTION STATUS
  // =========================================================

  async updateDistributionStatus(
    distributionId: string,
    dto: UpdateQurbanDistributionStatusDto,
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const distribution =
          await tx.qurbanDistribution.findUnique({
            where: {
              id: distributionId.trim(),
            },

            include: {
              beneficiaries: true,

              qurbanOrder: {
                include: {
                  animals: true,
                },
              },
            },
          });

        if (!distribution) {
          throw new NotFoundException(
            'Qurban distribution not found',
          );
        }

        const currentStatus =
          distribution.status;

        const newStatus =
          dto.status;

        if (
          currentStatus ===
            QurbanDistributionStatus.DISTRIBUTED &&
          newStatus !==
            QurbanDistributionStatus.DISTRIBUTED
        ) {
          throw new ConflictException(
            'Distributed status cannot be changed',
          );
        }

        if (
          currentStatus ===
            QurbanDistributionStatus.CANCELLED
        ) {
          throw new ConflictException(
            'Cancelled distribution cannot be changed',
          );
        }

        if (
          newStatus ===
          QurbanDistributionStatus.READY
        ) {
          if (
            distribution.packageQuantity <=
            0
          ) {
            throw new ConflictException(
              'Distribution package quantity must be greater than zero',
            );
          }

          if (
            distribution.beneficiaries.length ===
            0
          ) {
            throw new ConflictException(
              'At least one beneficiary is required before distribution is READY',
            );
          }

          const assignedPackages =
            distribution.beneficiaries.reduce(
              (total, item) =>
                total +
                item.packageQuantity,
              0,
            );

          if (
            assignedPackages !==
            distribution.packageQuantity
          ) {
            throw new ConflictException(
              `Beneficiary package quantity must equal distribution package quantity. Assigned: ${assignedPackages}, Required: ${distribution.packageQuantity}`,
            );
          }
        }

        if (
          newStatus ===
          QurbanDistributionStatus.DISTRIBUTED
        ) {
          if (
            distribution.beneficiaries.length ===
            0
          ) {
            throw new ConflictException(
              'At least one beneficiary is required before marking distribution as DISTRIBUTED',
            );
          }

          const assignedPackages =
            distribution.beneficiaries.reduce(
              (total, item) =>
                total +
                item.packageQuantity,
              0,
            );

          if (
            assignedPackages !==
            distribution.packageQuantity
          ) {
            throw new ConflictException(
              `All distribution packages must be assigned. Assigned: ${assignedPackages}, Required: ${distribution.packageQuantity}`,
            );
          }

          const notProcessed =
            distribution.qurbanOrder.animals.some(
              (animal) =>
                animal.status !==
                QurbanAnimalStatus.PROCESSED,
            );

          if (notProcessed) {
            throw new ConflictException(
              'All animals must be PROCESSED before distribution',
            );
          }
        }

        const now =
          new Date();

        const updated =
          await tx.qurbanDistribution.update({
            where: {
              id:
                distribution.id,
            },

            data: {
              status:
                newStatus,

              ...(dto.notes !== undefined && {
                notes:
                  dto.notes.trim() ||
                  null,
              }),
            },

            include: {
              beneficiaries: {
                include: {
                  beneficiary: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      location: true,
                    },
                  },
                },
              },

              qurbanOrder: {
                include: {
                  animals: true,
                },
              },
            },
          });

        if (
          newStatus ===
          QurbanDistributionStatus.DISTRIBUTED
        ) {
          await tx.qurbanAnimal.updateMany({
            where: {
              qurbanOrderId:
                distribution.qurbanOrderId,

              status:
                QurbanAnimalStatus.PROCESSED,
            },

            data: {
              status:
                QurbanAnimalStatus.DISTRIBUTED,

              distributedAt:
                now,
            },
          });

          await tx.qurbanOrder.update({
            where: {
              id:
                distribution.qurbanOrderId,
            },

            data: {
              status:
                'COMPLETED',

              completedAt:
                now,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action:
              'QURBAN_DISTRIBUTION_STATUS_CHANGED',

            entity:
              'QurbanDistribution',

            entityId:
              distribution.id,

            userId,

            metadata: {
              distributionNumber:
                distribution.distributionNumber,

              from:
                currentStatus,

              to:
                newStatus,

              qurbanOrderId:
                distribution.qurbanOrderId,

              qurbanOrderNumber:
                distribution.qurbanOrder.orderNumber,
            } as Prisma.InputJsonObject,
          },
        });

        return {
          message:
            'Qurban distribution status updated successfully',

          distribution:
            updated,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
