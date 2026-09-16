import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';

import { CreateCampaignCategoryDto } from './dto/create-campaign-category.dto';
import { UpdateCampaignCategoryDto } from './dto/update-campaign-category.dto';

@Injectable()
export class CampaignCategoryService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

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

    await this.prisma.auditLog.create({
      data: {
        action: 'CAMPAIGN_CATEGORY_UPDATE',
        entity: 'CampaignCategory',
        entityId: category.id,
        userId,
        metadata: {
          changes: dto,
        },
      },
    });

    return category;
  }

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

    if (existing._count.campaigns > 0) {
      throw new ConflictException(
        'Campaign category cannot be deleted because it contains campaigns',
      );
    }

    await this.prisma.campaignCategory.delete({
      where: {
        id,
      },
    });

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
