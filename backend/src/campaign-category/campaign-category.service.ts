import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma.service';

import { CreateCampaignCategoryDto } from './dto/create-campaign-category.dto';
import { UpdateCampaignCategoryDto } from './dto/update-campaign-category.dto';

@Injectable()
export class CampaignCategoryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // CREATE
  // ============================================================

  async create(
    dto: CreateCampaignCategoryDto,
    userId: string,
  ) {
    const slug = dto.slug.trim().toLowerCase();

    const existing =
      await this.prisma.campaignCategory.findUnique({
        where: {
          slug,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Campaign category slug already exists',
      );
    }

    const category =
      await this.prisma.campaignCategory.create({
        data: {
          name: dto.name.trim(),
          slug,
          description:
            dto.description?.trim() || null,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'CAMPAIGN_CATEGORY_CREATE',
        entity: 'CampaignCategory',
        entityId: category.id,
        userId,
        metadata: {
          name: category.name,
          slug: category.slug,
        },
      },
    });

    return category;
  }

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll() {
    return this.prisma.campaignCategory.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
    });
  }

  // ============================================================
  // FIND ONE
  // ============================================================

  async findOne(id: string) {
    const category =
      await this.prisma.campaignCategory.findUnique({
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

    if (!category) {
      throw new NotFoundException(
        'Campaign category not found',
      );
    }

    return category;
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(
    id: string,
    dto: UpdateCampaignCategoryDto,
    userId: string,
  ) {
    const existing =
      await this.prisma.campaignCategory.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Campaign category not found',
      );
    }

    // ----------------------------------------------------------
    // Check duplicate slug
    // ----------------------------------------------------------

    if (dto.slug !== undefined) {
      const slug =
        dto.slug.trim().toLowerCase();

      const slugOwner =
        await this.prisma.campaignCategory.findFirst({
          where: {
            slug,
            NOT: {
              id,
            },
          },
        });

      if (slugOwner) {
        throw new ConflictException(
          'Campaign category slug already exists',
        );
      }
    }

    // ----------------------------------------------------------
    // Update category
    // ----------------------------------------------------------

    const category =
      await this.prisma.campaignCategory.update({
        where: {
          id,
        },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),

          ...(dto.slug !== undefined && {
            slug: dto.slug
              .trim()
              .toLowerCase(),
          }),

          ...(dto.description !== undefined && {
            description:
              dto.description.trim() || null,
          }),

          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
        },
      });

    // ----------------------------------------------------------
    // Convert DTO to Prisma JSON-safe object
    // ----------------------------------------------------------

    const auditChanges =
      JSON.parse(
        JSON.stringify(dto),
      ) as Prisma.InputJsonObject;

    const auditMetadata: Prisma.InputJsonObject = {
      changes: auditChanges,
    };

    // ----------------------------------------------------------
    // Audit log
    // ----------------------------------------------------------

    await this.prisma.auditLog.create({
      data: {
        action: 'CAMPAIGN_CATEGORY_UPDATE',
        entity: 'CampaignCategory',
        entityId: category.id,
        userId,
        metadata: auditMetadata,
      },
    });

    return category;
  }

  // ============================================================
  // DELETE
  // ============================================================

  async remove(
    id: string,
    userId: string,
  ) {
    const existing =
      await this.prisma.campaignCategory.findUnique({
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
        'Campaign category not found',
      );
    }

    // ----------------------------------------------------------
    // Prevent deletion when category is used by campaigns
    // ----------------------------------------------------------

    if (existing._count.campaigns > 0) {
      throw new ConflictException(
        'Campaign category cannot be deleted because it contains campaigns',
      );
    }

    // ----------------------------------------------------------
    // Delete
    // ----------------------------------------------------------

    await this.prisma.campaignCategory.delete({
      where: {
        id,
      },
    });

    // ----------------------------------------------------------
    // Audit log
    // ----------------------------------------------------------

    await this.prisma.auditLog.create({
      data: {
        action: 'CAMPAIGN_CATEGORY_DELETE',
        entity: 'CampaignCategory',
        entityId: id,
        userId,
      },
    });

    return {
      message:
        'Campaign category deleted successfully',
    };
  }
}
