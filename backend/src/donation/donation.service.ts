import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, DonationStatus } from '@prisma/client';

import { PrismaService } from '../prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';

@Injectable()
export class DonationService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create Donation
   *
   * Rules:
   * - Campaign must exist
   * - Campaign must be PUBLISHED
   * - Campaign must be within active period
   * - Donation minimum Rp20.000
   * - Donation currency must match campaign currency
   * - Donation starts with PENDING status
   * - Campaign collectedAmount is NOT updated here
   * - collectedAmount will only be updated when payment becomes PAID
   */
  async create(
    dto: CreateDonationDto,
    userId?: string,
  ) {
    const now = new Date();

    /**
     * 1. Validate Campaign
     */
    const campaign = await this.prisma.campaign.findUnique({
      where: {
        id: dto.campaignId,
      },
      select: {
        id: true,
        title: true,
        currency: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

    /**
     * 2. Campaign must be PUBLISHED
     */
    if (campaign.status !== 'PUBLISHED') {
      throw new BadRequestException(
        `Donation is only allowed for PUBLISHED campaigns. Current status: ${campaign.status}`,
      );
    }

    /**
     * 3. Validate campaign start date
     */
    if (
      campaign.startDate &&
      campaign.startDate > now
    ) {
      throw new BadRequestException(
        'Campaign has not started yet',
      );
    }

    /**
     * 4. Validate campaign end date
     */
    if (
      campaign.endDate &&
      campaign.endDate < now
    ) {
      throw new BadRequestException(
        'Campaign has already ended',
      );
    }

    /**
     * 5. Validate minimum donation
     *
     * Minimum: Rp20.000
     */
    const amount = new Prisma.Decimal(
      dto.amount,
    );

    const minimumDonation =
      new Prisma.Decimal(20000);

    if (amount.lessThan(minimumDonation)) {
      throw new BadRequestException(
        'Minimum donation is Rp20.000',
      );
    }

    /**
     * 6. Validate currency
     *
     * Current MVP uses campaign currency.
     */
    const currency =
      campaign.currency || 'IDR';

    /**
     * 7. Find or create DonorProfile
     */
    const donorProfile =
      await this.findOrCreateDonorProfile(
        dto,
        userId,
      );

    /**
     * 8. Create Donation + AuditLog
     *
     * Everything is done inside one transaction.
     */
    const donation =
      await this.prisma.$transaction(
        async (tx) => {
          const createdDonation =
            await tx.donation.create({
              data: {
                donorId:
                  donorProfile?.id ?? null,

                campaignId:
                  campaign.id,

                amount,

                currency,

                donorName:
                  dto.donorName.trim(),

                donorEmail:
                  dto.donorEmail?.trim() || null,

                donorPhone:
                  dto.donorPhone?.trim() || null,

                message:
                  dto.message?.trim() || null,

                isAnonymous:
                  dto.isAnonymous ?? false,

                status:
                  DonationStatus.PENDING,
              },

              include: {
                campaign: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    currency: true,
                    status: true,
                  },
                },

                donorProfile: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    isAnonymous: true,
                  },
                },
              },
            });

          /**
           * Audit Log
           */
          await tx.auditLog.create({
            data: {
              userId: userId ?? null,

              action:
                'DONATION_CREATED',

              entity:
                'Donation',

              entityId:
                createdDonation.id,

              metadata: {
                donationId:
                  createdDonation.id,

                campaignId:
                  campaign.id,

                campaignTitle:
                  campaign.title,

                amount:
                  dto.amount,

                currency,

                status:
                  DonationStatus.PENDING,

                donorProfileId:
                  donorProfile?.id ?? null,
              },
            },
          });

          return createdDonation;
        },
      );

    return donation;
  }

  /**
   * Find existing donor profile or create a new one.
   *
   * Priority:
   * 1. Logged-in user
   * 2. Existing email
   * 3. Existing phone
   * 4. Create new profile
   */
  private async findOrCreateDonorProfile(
    dto: CreateDonationDto,
    userId?: string,
  ) {
    /**
     * Logged-in donor
     */
    if (userId) {
      const existingByUser =
        await this.prisma.donorProfile.findUnique({
          where: {
            userId,
          },
        });

      if (existingByUser) {
        return this.prisma.donorProfile.update({
          where: {
            id: existingByUser.id,
          },

          data: {
            fullName:
              dto.donorName.trim(),

            email:
              dto.donorEmail?.trim() ||
              existingByUser.email,

            phone:
              dto.donorPhone?.trim() ||
              existingByUser.phone,

            isAnonymous:
              dto.isAnonymous ?? false,
          },
        });
      }

      return this.prisma.donorProfile.create({
        data: {
          userId,

          fullName:
            dto.donorName.trim(),

          email:
            dto.donorEmail?.trim() || null,

          phone:
            dto.donorPhone?.trim() || null,

          isAnonymous:
            dto.isAnonymous ?? false,
        },
      });
    }

    /**
     * Guest donor - try email first
     */
    if (dto.donorEmail) {
      const existingByEmail =
        await this.prisma.donorProfile.findFirst({
          where: {
            email: dto.donorEmail.trim(),
          },
        });

      if (existingByEmail) {
        return existingByEmail;
      }
    }

    /**
     * Guest donor - try phone
     */
    if (dto.donorPhone) {
      const existingByPhone =
        await this.prisma.donorProfile.findFirst({
          where: {
            phone: dto.donorPhone.trim(),
          },
        });

      if (existingByPhone) {
        return existingByPhone;
      }
    }

    /**
     * Create new guest donor profile
     */
    return this.prisma.donorProfile.create({
      data: {
        fullName:
          dto.donorName.trim(),

        email:
          dto.donorEmail?.trim() || null,

        phone:
          dto.donorPhone?.trim() || null,

        isAnonymous:
          dto.isAnonymous ?? false,
      },
    });
  }

  /**
   * Find all donations.
   *
   * This will later be protected by
   * donation.view permission.
   */
  async findAll() {
    return this.prisma.donation.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            currency: true,
            status: true,
          },
        },

        donorProfile: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isAnonymous: true,
          },
        },

        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },

        impacts: {
          include: {
            campaignImpact: true,
          },
        },
      },
    });
  }

  /**
   * Find donation by ID.
   */
  async findOne(id: string) {
    const donation =
      await this.prisma.donation.findUnique({
        where: {
          id,
        },

        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              slug: true,
              currency: true,
              status: true,
              targetAmount: true,
              collectedAmount: true,
            },
          },

          donorProfile: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              isAnonymous: true,
            },
          },

          payments: {
            orderBy: {
              createdAt: 'desc',
            },
          },

          impacts: {
            include: {
              campaignImpact: true,
            },
          },
        },
      });

    if (!donation) {
      throw new NotFoundException(
        'Donation not found',
      );
    }

    return donation;
  }

  /**
   * Find donations by campaign.
   */
  async findByCampaign(
    campaignId: string,
  ) {
    return this.prisma.donation.findMany({
      where: {
        campaignId,
      },

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        donorProfile: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isAnonymous: true,
          },
        },

        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },

        impacts: {
          include: {
            campaignImpact: true,
          },
        },
      },
    });
  }

  /**
   * Find donations by donor.
   */
  async findByDonor(
    donorId: string,
  ) {
    return this.prisma.donation.findMany({
      where: {
        donorId,
      },

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            currency: true,
            status: true,
          },
        },

        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },

        impacts: {
          include: {
            campaignImpact: true,
          },
        },
      },
    });
  }
}
