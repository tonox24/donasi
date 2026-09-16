import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma.service';

import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

@Injectable()
export class BeneficiaryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // CREATE BENEFICIARY
  // =========================================================

  async create(
    dto: CreateBeneficiaryDto,
    userId: string,
  ) {
    const beneficiary =
      await this.prisma.beneficiary.create({
        data: {
          name: dto.name.trim(),

          type: dto.type,

          description:
            dto.description?.trim() || null,

          location:
            dto.location?.trim() || null,

          createdById: userId,
        },

        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'BENEFICIARY_CREATE',

        entity: 'Beneficiary',

        entityId: beneficiary.id,

        userId,

        metadata: {
          name: beneficiary.name,
          type: beneficiary.type,
          location: beneficiary.location,
        },
      },
    });

    return beneficiary;
  }

  // =========================================================
  // FIND ALL BENEFICIARIES
  // =========================================================

  async findAll() {
    return this.prisma.beneficiary.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },

        _count: {
          select: {
            campaigns: true,
          },
        },
      },
    });
  }

  // =========================================================
  // FIND ONE BENEFICIARY
  // =========================================================

  async findOne(id: string) {
    const beneficiary =
      await this.prisma.beneficiary.findUnique({
        where: {
          id,
        },

        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },

          campaigns: {
            include: {
              campaign: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  status: true,
                },
              },
            },
          },
        },
      });

    if (!beneficiary) {
      throw new NotFoundException(
        'Beneficiary not found',
      );
    }

    return beneficiary;
  }

  // =========================================================
  // UPDATE BENEFICIARY
  // =========================================================

  async update(
    id: string,
    dto: UpdateBeneficiaryDto,
    userId: string,
  ) {
    const existing =
      await this.prisma.beneficiary.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Beneficiary not found',
      );
    }

    const beneficiary =
      await this.prisma.beneficiary.update({
        where: {
          id,
        },

        data: {
          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),

          ...(dto.type !== undefined && {
            type: dto.type,
          }),

          ...(dto.description !== undefined && {
            description:
              dto.description.trim() || null,
          }),

          ...(dto.location !== undefined && {
            location:
              dto.location.trim() || null,
          }),

          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
        },

        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

    const auditChanges =
      JSON.parse(
        JSON.stringify(dto),
      ) as Prisma.InputJsonObject;

    await this.prisma.auditLog.create({
      data: {
        action: 'BENEFICIARY_UPDATE',

        entity: 'Beneficiary',

        entityId: beneficiary.id,

        userId,

        metadata: {
          changes: auditChanges,
        },
      },
    });

    return beneficiary;
  }

  // =========================================================
  // DELETE BENEFICIARY
  // =========================================================

  async remove(
    id: string,
    userId: string,
  ) {
    const existing =
      await this.prisma.beneficiary.findUnique({
        where: {
          id,
        },

        include: {
          _count: {
            select: {
              campaigns: true,
            },
          },
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Beneficiary not found',
      );
    }

    // Prevent deletion if beneficiary
    // is already linked to campaigns.
    if (existing._count.campaigns > 0) {
      throw new ConflictException(
        'Beneficiary cannot be deleted because it is linked to campaigns',
      );
    }

    await this.prisma.beneficiary.delete({
      where: {
        id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'BENEFICIARY_DELETE',

        entity: 'Beneficiary',

        entityId: id,

        userId,
      },
    });

    return {
      message:
        'Beneficiary deleted successfully',
    };
  }
}
