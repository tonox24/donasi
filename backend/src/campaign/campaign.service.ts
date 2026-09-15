import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';

import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateCampaignDto,
    userId: string,
  ) {
    const slug = dto.slug.trim().toLowerCase();

    const existing =
      await this.prisma.campaign.findUnique({
        where: {
          slug,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Campaign slug already exists',
      );
    }

    const program =
      await this.prisma.program.findUnique({
        where: {
          id: dto.programId,
        },
      });

    if (!program) {
      throw new NotFoundException(
        'Program not found',
      );
    }

    const category =
      await this.prisma.campaignCategory.findUnique({
        where: {
          id: dto.categoryId,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Campaign category not found',
      );
    }

    if (!category.isActive) {
      throw new ConflictException(
        'Campaign category is inactive',
      );
    }

    if (
      dto.startDate &&
      dto.endDate &&
      new Date(dto.endDate) < new Date(dto.startDate)
    ) {
      throw new ConflictException(
        'End date cannot be earlier than start date',
      );
    }

    const campaign =
      await this.prisma.campaign.create({
        data: {
          title: dto.title.trim(),

          slug,

          shortDescription:
            dto.shortDescription?.trim() || null,

          description:
            dto.description?.trim() || null,

          targetAmount: dto.targetAmount,

          currency:
            dto.currency?.trim().toUpperCase() ||
            'IDR',

          startDate: dto.startDate
            ? new Date(dto.startDate)
            : null,

          endDate: dto.endDate
            ? new Date(dto.endDate)
            : null,

          status: dto.status ?? 'DRAFT',

          programId: dto.programId,

          categoryId: dto.categoryId,

          createdById: userId,

          publishedAt:
            dto.status === 'PUBLISHED'
              ? new Date()
              : null,
        },

        include: {
          program: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'CAMPAIGN_CREATE',
        entity: 'Campaign',
        entityId: campaign.id,
        userId,

        metadata: {
          title: campaign.title,
          slug: campaign.slug,
          programId: campaign.programId,
          categoryId: campaign.categoryId,
        },
      },
    });

    return campaign;
  }

  async findAll() {
    return this.prisma.campaign.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        _count: {
          select: {
            images: true,
            updates: true,
            beneficiaries: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const campaign =
      await this.prisma.campaign.findUnique({
        where: {
          id,
        },

        include: {
          program: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },

          images: {
            orderBy: {
              sortOrder: 'asc',
            },
          },

          updates: {
            orderBy: {
              createdAt: 'desc',
            },
          },

          beneficiaries: {
            include: {
              beneficiary: true,
            },
          },
        },
      });

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

    return campaign;
  }

  async update(
    id: string,
    dto: UpdateCampaignDto,
    userId: string,
  ) {
    const existing =
      await this.prisma.campaign.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

    if (dto.slug !== undefined) {
      const slug =
        dto.slug.trim().toLowerCase();

      const slugOwner =
        await this.prisma.campaign.findFirst({
          where: {
            slug,

            NOT: {
              id,
            },
          },
        });

      if (slugOwner) {
        throw new ConflictException(
          'Campaign slug already exists',
        );
      }
    }

    if (dto.programId !== undefined) {
      const program =
        await this.prisma.program.findUnique({
          where: {
            id: dto.programId,
          },
        });

      if (!program) {
        throw new NotFoundException(
          'Program not found',
        );
      }
    }

    if (dto.categoryId !== undefined) {
      const category =
        await this.prisma.campaignCategory.findUnique({
          where: {
            id: dto.categoryId,
          },
        });

      if (!category) {
        throw new NotFoundException(
          'Campaign category not found',
        );
      }

      if (!category.isActive) {
        throw new ConflictException(
          'Campaign category is inactive',
        );
      }
    }

    const startDate =
      dto.startDate !== undefined
        ? new Date(dto.startDate)
        : existing.startDate;

    const endDate =
      dto.endDate !== undefined
        ? new Date(dto.endDate)
        : existing.endDate;

    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      throw new ConflictException(
        'End date cannot be earlier than start date',
      );
    }

    const newStatus =
      dto.status ?? existing.status;

    let publishedAt =
      existing.publishedAt;

    if (
      newStatus === 'PUBLISHED' &&
      existing.status !== 'PUBLISHED'
    ) {
      publishedAt = new Date();
    }

    if (
      newStatus !== 'PUBLISHED'
    ) {
      publishedAt = null;
    }

    const campaign =
      await this.prisma.campaign.update({
        where: {
          id,
        },

        data: {
          ...(dto.title !== undefined && {
            title: dto.title.trim(),
          }),

          ...(dto.slug !== undefined && {
            slug: dto.slug
              .trim()
              .toLowerCase(),
          }),

          ...(dto.shortDescription !== undefined && {
            shortDescription:
              dto.shortDescription.trim() ||
              null,
          }),

          ...(dto.description !== undefined && {
            description:
              dto.description.trim() ||
              null,
          }),

          ...(dto.targetAmount !== undefined && {
            targetAmount:
              dto.targetAmount,
          }),

          ...(dto.currency !== undefined && {
            currency:
              dto.currency
                .trim()
                .toUpperCase(),
          }),

          ...(dto.startDate !== undefined && {
            startDate,
          }),

          ...(dto.endDate !== undefined && {
            endDate,
          }),

          ...(dto.programId !== undefined && {
            programId:
              dto.programId,
          }),

          ...(dto.categoryId !== undefined && {
            categoryId:
              dto.categoryId,
          }),

          ...(dto.status !== undefined && {
            status:
              dto.status,
          }),

          publishedAt,
        },

        include: {
          program: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'CAMPAIGN_UPDATE',
        entity: 'Campaign',
        entityId: campaign.id,
        userId,

        metadata: {
          changes: dto,
        },
      },
    });

    return campaign;
  }

  async remove(
    id: string,
    userId: string,
  ) {
    const existing =
      await this.prisma.campaign.findUnique({
        where: {
          id,
        },

        include: {
          _count: {
            select: {
              images: true,
              updates: true,
              beneficiaries: true,
            },
          },
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

    if (
      existing._count.images > 0 ||
      existing._count.updates > 0 ||
      existing._count.beneficiaries > 0
    ) {
      throw new ConflictException(
        'Campaign cannot be deleted because it contains related data',
      );
    }

    await this.prisma.campaign.delete({
      where: {
        id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CAMPAIGN_DELETE',
        entity: 'Campaign',
        entityId: id,
        userId,
      },
    });

    return {
      message:
        'Campaign deleted successfully',
    };
  }
}
