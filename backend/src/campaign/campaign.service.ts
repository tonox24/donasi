import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCampaignDto, userId: string) {
    const slug = dto.slug.trim().toLowerCase();

    const existing = await this.prisma.campaign.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Campaign slug already exists');

    const program = await this.prisma.program.findUnique({ where: { id: dto.programId } });
    if (!program) throw new NotFoundException('Program not found');

    const category = await this.prisma.campaignCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Campaign category not found');
    if (!category.isActive) throw new ConflictException('Campaign category is inactive');

    if (dto.startDate && dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new ConflictException('End date cannot be earlier than start date');
    }

    const initialStatus = dto.status ?? CampaignStatus.DRAFT;

    const campaign = await this.prisma.campaign.create({
      data: {
        title: dto.title.trim(),
        slug,
        shortDescription: dto.shortDescription?.trim() || null,
        description: dto.description?.trim() || null,
        targetAmount: dto.targetAmount,
        currency: dto.currency?.trim().toUpperCase() || 'IDR',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: initialStatus,
        programId: dto.programId,
        categoryId: dto.categoryId,
        createdById: userId,
        publishedAt: initialStatus === CampaignStatus.PUBLISHED ? new Date() : null,
      },
      include: {
        program: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
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
          status: campaign.status,
        },
      },
    });

    return campaign;
  }

  async findAll() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        program: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { images: true, updates: true, beneficiaries: true } },
      },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        program: { select: { id: true, name: true, slug: true, status: true } },
        category: { select: { id: true, name: true, slug: true, isActive: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        updates: { orderBy: { createdAt: 'desc' } },
        beneficiaries: { include: { beneficiary: true } },
      },
    });

    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto, userId: string) {
    const existing = await this.prisma.campaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found');

    if (dto.status !== undefined) {
      throw new ConflictException(
        'Campaign status must be changed through the campaign workflow endpoints',
      );
    }

    let normalizedSlug: string | undefined;

    if (dto.slug !== undefined) {
      normalizedSlug = dto.slug.trim().toLowerCase();

      const slugOwner = await this.prisma.campaign.findFirst({
        where: { slug: normalizedSlug, NOT: { id } },
      });

      if (slugOwner) throw new ConflictException('Campaign slug already exists');
    }

    if (dto.programId !== undefined) {
      const program = await this.prisma.program.findUnique({ where: { id: dto.programId } });
      if (!program) throw new NotFoundException('Program not found');
    }

    if (dto.categoryId !== undefined) {
      const category = await this.prisma.campaignCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Campaign category not found');
      if (!category.isActive) throw new ConflictException('Campaign category is inactive');
    }

    const startDate = dto.startDate !== undefined ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate !== undefined ? new Date(dto.endDate) : existing.endDate;

    if (startDate && endDate && endDate < startDate) {
      throw new ConflictException('End date cannot be earlier than start date');
    }

    const updateData: Prisma.CampaignUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title.trim() }),
      ...(normalizedSlug !== undefined && { slug: normalizedSlug }),
      ...(dto.shortDescription !== undefined && {
        shortDescription: dto.shortDescription.trim() || null,
      }),
      ...(dto.description !== undefined && {
        description: dto.description.trim() || null,
      }),
      ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
      ...(dto.currency !== undefined && { currency: dto.currency.trim().toUpperCase() }),
      ...(dto.startDate !== undefined && { startDate }),
      ...(dto.endDate !== undefined && { endDate }),
      ...(dto.programId !== undefined && { program: { connect: { id: dto.programId } } }),
      ...(dto.categoryId !== undefined && { category: { connect: { id: dto.categoryId } } }),
    };

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        program: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    const auditChanges = JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonObject;

    await this.prisma.auditLog.create({
      data: {
        action: 'CAMPAIGN_UPDATE',
        entity: 'Campaign',
        entityId: campaign.id,
        userId,
        metadata: { changes: auditChanges },
      },
    });

    return campaign;
  }

  private async transitionStatus(
    id: string,
    userId: string,
    targetStatus: CampaignStatus,
  ) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const allowedTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      DRAFT: [CampaignStatus.PENDING_REVIEW, CampaignStatus.CANCELLED],
      PENDING_REVIEW: [CampaignStatus.PUBLISHED, CampaignStatus.CANCELLED],
      PUBLISHED: [
        CampaignStatus.PAUSED,
        CampaignStatus.COMPLETED,
        CampaignStatus.CANCELLED,
      ],
      PAUSED: [
        CampaignStatus.PUBLISHED,
        CampaignStatus.COMPLETED,
        CampaignStatus.CANCELLED,
      ],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[campaign.status]?.includes(targetStatus)) {
      throw new ConflictException(
        `Invalid campaign status transition: ${campaign.status} → ${targetStatus}`,
      );
    }

    const data: Prisma.CampaignUpdateInput = { status: targetStatus };

    if (targetStatus === CampaignStatus.PUBLISHED && !campaign.publishedAt) {
      data.publishedAt = new Date();
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedCampaign = await tx.campaign.update({
        where: { id },
        data,
        include: {
          program: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CAMPAIGN_STATUS_CHANGED',
          entity: 'Campaign',
          entityId: campaign.id,
          userId,
          metadata: {
            from: campaign.status,
            to: targetStatus,
            campaignId: campaign.id,
            title: campaign.title,
          },
        },
      });

      return updatedCampaign;
    });
  }

  async submitForReview(id: string, userId: string) {
    return this.transitionStatus(id, userId, CampaignStatus.PENDING_REVIEW);
  }

  async approve(id: string, userId: string) {
    return this.transitionStatus(id, userId, CampaignStatus.PUBLISHED);
  }

  async pause(id: string, userId: string) {
    return this.transitionStatus(id, userId, CampaignStatus.PAUSED);
  }

  async resume(id: string, userId: string) {
    return this.transitionStatus(id, userId, CampaignStatus.PUBLISHED);
  }

  async complete(id: string, userId: string) {
    return this.transitionStatus(id, userId, CampaignStatus.COMPLETED);
  }

  async cancel(id: string, userId: string) {
    return this.transitionStatus(id, userId, CampaignStatus.CANCELLED);
  }

  async findBeneficiaries(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const relations = await this.prisma.campaignBeneficiary.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
      include: { beneficiary: true },
    });

    return relations.map((relation) => relation.beneficiary);
  }

  async assignBeneficiary(campaignId: string, beneficiaryId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    });
    if (!beneficiary) throw new NotFoundException('Beneficiary not found');
    if (!beneficiary.isActive) throw new ConflictException('Beneficiary is inactive');

    const existing = await this.prisma.campaignBeneficiary.findUnique({
      where: { campaignId_beneficiaryId: { campaignId, beneficiaryId } },
    });
    if (existing) {
      throw new ConflictException('Beneficiary is already assigned to this campaign');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.campaignBeneficiary.create({
        data: { campaignId, beneficiaryId },
      });

      await tx.auditLog.create({
        data: {
          action: 'CAMPAIGN_BENEFICIARY_ASSIGN',
          entity: 'CampaignBeneficiary',
          entityId: campaignId,
          userId,
          metadata: { campaignId, beneficiaryId },
        },
      });
    });

    return {
      message: 'Beneficiary assigned to campaign successfully',
      campaignId,
      beneficiaryId,
    };
  }

  async removeBeneficiary(campaignId: string, beneficiaryId: string, userId: string) {
    const relation = await this.prisma.campaignBeneficiary.findUnique({
      where: { campaignId_beneficiaryId: { campaignId, beneficiaryId } },
    });

    if (!relation) {
      throw new NotFoundException('Campaign beneficiary relationship not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.campaignBeneficiary.delete({
        where: { campaignId_beneficiaryId: { campaignId, beneficiaryId } },
      });

      await tx.auditLog.create({
        data: {
          action: 'CAMPAIGN_BENEFICIARY_REMOVE',
          entity: 'CampaignBeneficiary',
          entityId: campaignId,
          userId,
          metadata: { campaignId, beneficiaryId },
        },
      });
    });

    return {
      message: 'Beneficiary removed from campaign successfully',
      campaignId,
      beneficiaryId,
    };
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        _count: {
          select: { images: true, updates: true, beneficiaries: true },
        },
      },
    });

    if (!existing) throw new NotFoundException('Campaign not found');

    if (
      existing._count.images > 0 ||
      existing._count.updates > 0 ||
      existing._count.beneficiaries > 0
    ) {
      throw new ConflictException(
        'Campaign cannot be deleted because it contains related data',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.campaign.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: 'CAMPAIGN_DELETE',
          entity: 'Campaign',
          entityId: id,
          userId,
        },
      });
    });

    return { message: 'Campaign deleted successfully' };
  }
}
