import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  QurbanPackageStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma.service';

import { CreateQurbanPackageDto } from './dto/create-qurban-package.dto';
import { UpdateQurbanPackageDto } from './dto/update-qurban-package.dto';

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
}
