import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  DonorStatus,
  DonorType,
  DonationStatus,
  Prisma,
} import { DonationStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma.service';


import { CreateDonorDto } from './dto/create-donor.dto';
import { UpdateDonorDto } from './dto/update-donor.dto';

@Injectable()
export class DonorService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // GET ALL DONORS
  // =========================================================

  async findAll(params?: {
    search?: string;
    donorType?: DonorType;
    status?: DonorStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(
      Number(params?.page ?? 1),
      1,
    );

    const limit = Math.min(
      Math.max(
        Number(params?.limit ?? 20),
        1,
      ),
      100,
    );

    const search =
      params?.search?.trim() || undefined;

    const where: Prisma.DonorProfileWhereInput = {
      ...(params?.donorType && {
        donorType: params.donorType,
      }),

      ...(params?.status && {
        status: params.status,
      }),

      ...(search && {
        OR: [
          {
            fullName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.donorProfile.findMany({
          where,

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,

          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },

            _count: {
              select: {
                donations: true,
              },
            },
          },
        }),

        this.prisma.donorProfile.count({
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
  // GET ONE DONOR
  // =========================================================

  async findOne(id: string) {
    const donor =
      await this.prisma.donorProfile.findUnique({
        where: {
          id,
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              fullName: true,
              status: true,
            },
          },

          _count: {
            select: {
              donations: true,
            },
          },
        },
      });

    if (!donor) {
      throw new NotFoundException(
        'Donor not found',
      );
    }

    return donor;
  }

  // =========================================================
  // CREATE DONOR
  // =========================================================

  async create(
    dto: CreateDonorDto,
    userId: string,
  ) {
    const fullName =
      dto.fullName.trim();

    if (!fullName) {
      throw new BadRequestException(
        'Full name is required',
      );
    }

    if (dto.userId) {
      const existingUser =
        await this.prisma.user.findUnique({
          where: {
            id: dto.userId,
          },
        });

      if (!existingUser) {
        throw new NotFoundException(
          'User not found',
        );
      }

      const existingDonor =
        await this.prisma.donorProfile.findUnique({
          where: {
            userId: dto.userId,
          },
        });

      if (existingDonor) {
        throw new ConflictException(
          'Donor profile already exists for this user',
        );
      }
    }

    const donor =
      await this.prisma.donorProfile.create({
        data: {
          userId:
            dto.userId ?? null,

          fullName,

          email:
            dto.email?.trim() || null,

          phone:
            dto.phone?.trim() || null,

          address:
            dto.address?.trim() || null,

          city:
            dto.city?.trim() || null,

          country:
            dto.country?.trim() || null,

          donorType:
            dto.donorType ??
            DonorType.INDIVIDUAL,

          status:
            DonorStatus.ACTIVE,

          isAnonymous:
            dto.isAnonymous ?? false,
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'DONOR_CREATE',

        entity: 'DonorProfile',

        entityId: donor.id,

        userId,

        metadata: {
          fullName: donor.fullName,
          donorType: donor.donorType,
          status: donor.status,
        },
      },
    });

    return donor;
  }

  // =========================================================
  // UPDATE DONOR
  // =========================================================

  async update(
    id: string,
    dto: UpdateDonorDto,
    userId: string,
  ) {
    const existing =
      await this.prisma.donorProfile.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Donor not found',
      );
    }

    if (dto.userId !== undefined) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.userId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'User not found',
        );
      }

      const linkedDonor =
        await this.prisma.donorProfile.findFirst({
          where: {
            userId: dto.userId,
            NOT: {
              id,
            },
          },
        });

      if (linkedDonor) {
        throw new ConflictException(
          'User is already linked to another donor profile',
        );
      }
    }

    const donor =
      await this.prisma.donorProfile.update({
        where: {
          id,
        },

        data: {
          ...(dto.userId !== undefined && {
            userId:
              dto.userId || null,
          }),

          ...(dto.fullName !== undefined && {
            fullName:
              dto.fullName.trim(),
          }),

          ...(dto.email !== undefined && {
            email:
              dto.email.trim() || null,
          }),

          ...(dto.phone !== undefined && {
            phone:
              dto.phone.trim() || null,
          }),

          ...(dto.address !== undefined && {
            address:
              dto.address.trim() || null,
          }),

          ...(dto.city !== undefined && {
            city:
              dto.city.trim() || null,
          }),

          ...(dto.country !== undefined && {
            country:
              dto.country.trim() || null,
          }),

          ...(dto.donorType !== undefined && {
            donorType:
              dto.donorType,
          }),

          ...(dto.isAnonymous !== undefined && {
            isAnonymous:
              dto.isAnonymous,
          }),
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      });

    const changes =
      JSON.parse(
        JSON.stringify(dto),
      ) as Prisma.InputJsonObject;

    await this.prisma.auditLog.create({
      data: {
        action: 'DONOR_UPDATE',

        entity: 'DonorProfile',

        entityId: donor.id,

        userId,

        metadata: {
          changes,
        },
      },
    });

    return donor;
  }

  // =========================================================
  // UPDATE DONOR STATUS
  // =========================================================

  async updateStatus(
    id: string,
    status: DonorStatus,
    userId: string,
  ) {
    const existing =
      await this.prisma.donorProfile.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Donor not found',
      );
    }

    if (existing.status === status) {
      return existing;
    }

    const donor =
      await this.prisma.donorProfile.update({
        where: {
          id,
        },

        data: {
          status,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'DONOR_STATUS_CHANGED',

        entity: 'DonorProfile',

        entityId: donor.id,

        userId,

        metadata: {
          from: existing.status,
          to: donor.status,
        },
      },
    });

    return donor;
  }

  // =========================================================
  // GET DONATION HISTORY
  // =========================================================

  async findDonations(id: string) {
    const donor =
      await this.prisma.donorProfile.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
        },
      });

    if (!donor) {
      throw new NotFoundException(
        'Donor not found',
      );
    }

    return this.prisma.donation.findMany({
      where: {
        donorId: id,
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
            status: true,
          },
        },

        receipts: {
          select: {
            id: true,
            receiptNumber: true,
            issuedAt: true,
          },
        },

        payments: {
          select: {
            id: true,
            provider: true,
            paymentMethod: true,
            status: true,
            transactionReference: true,
            paidAt: true,
          },
        },
      },
    });
  }

  // =============================================================
// DONOR SUMMARY
// =============================================================

async getSummary(id: string) {
  const donor = await this.prisma.donorProfile.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      donorType: true,
      status: true,
      createdAt: true,
    },
  });

  if (!donor) {
    throw new NotFoundException('Donor not found');
  }

  const [
    totalDonations,
    paidDonations,
    pendingDonations,
    failedDonations,
    cancelledDonations,
    refundedDonations,
    paidAggregate,
    firstDonation,
    lastDonation,
    campaignCount,
  ] = await this.prisma.$transaction([
    // ---------------------------------------------------------
    // ALL DONATIONS
    // ---------------------------------------------------------
    this.prisma.donation.count({
      where: {
        donorId: id,
      },
    }),

    // ---------------------------------------------------------
    // PAID DONATIONS
    // ---------------------------------------------------------
    this.prisma.donation.count({
      where: {
        donorId: id,
        status: DonationStatus.PAID,
      },
    }),

    // ---------------------------------------------------------
    // PENDING DONATIONS
    // ---------------------------------------------------------
    this.prisma.donation.count({
      where: {
        donorId: id,
        status: DonationStatus.PENDING,
      },
    }),

    // ---------------------------------------------------------
    // FAILED DONATIONS
    // ---------------------------------------------------------
    this.prisma.donation.count({
      where: {
        donorId: id,
        status: DonationStatus.FAILED,
      },
    }),

    // ---------------------------------------------------------
    // CANCELLED DONATIONS
    // ---------------------------------------------------------
    this.prisma.donation.count({
      where: {
        donorId: id,
        status: DonationStatus.CANCELLED,
      },
    }),

    // ---------------------------------------------------------
    // REFUNDED DONATIONS
    // ---------------------------------------------------------
    this.prisma.donation.count({
      where: {
        donorId: id,
        status: DonationStatus.REFUNDED,
      },
    }),

    // ---------------------------------------------------------
    // TOTAL VALUE OF PAID DONATIONS
    // ---------------------------------------------------------
    this.prisma.donation.aggregate({
      where: {
        donorId: id,
        status: DonationStatus.PAID,
      },
      _sum: {
        amount: true,
      },
    }),

    // ---------------------------------------------------------
    // FIRST DONATION
    // All donation history, regardless of payment status
    // ---------------------------------------------------------
    this.prisma.donation.findFirst({
      where: {
        donorId: id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        campaignId: true,
      },
    }),

    // ---------------------------------------------------------
    // LAST DONATION
    // All donation history, regardless of payment status
    // ---------------------------------------------------------
    this.prisma.donation.findFirst({
      where: {
        donorId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        paidAt: true,
        campaignId: true,
      },
    }),

    // ---------------------------------------------------------
    // UNIQUE CAMPAIGNS
    // ---------------------------------------------------------
    this.prisma.donation.findMany({
      where: {
        donorId: id,
      },
      distinct: ['campaignId'],
      select: {
        campaignId: true,
      },
    }),
  ]);

  // -----------------------------------------------------------
  // RETURN DONOR CRM SUMMARY
  // -----------------------------------------------------------

  return {
    donor,

    statistics: {
      // Total donation records created
      totalDonations,

      // Successful donations
      paidDonations,

      // Donations waiting for payment
      pendingDonations,

      // Donations explicitly marked failed
      failedDonations,

      // Cancelled donations
      cancelledDonations,

      // Refunded donations
      refundedDonations,

      // Only PAID donation amount is counted as received funds
      totalDonationAmount:
        paidAggregate._sum.amount?.toString() ?? '0',

      // Number of different campaigns this donor has interacted with
      campaignCount: campaignCount.length,

      // First donation activity
      firstDonation,

      // Latest donation activity
      lastDonation,
    },
  };
}

  // =========================================================
  // DELETE DONOR
  // =========================================================

  async remove(
    id: string,
    userId: string,
  ) {
    const existing =
      await this.prisma.donorProfile.findUnique({
        where: {
          id,
        },

        include: {
          _count: {
            select: {
              donations: true,
            },
          },
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Donor not found',
      );
    }

    if (existing._count.donations > 0) {
      throw new ConflictException(
        'Donor cannot be deleted because donation history exists',
      );
    }

    await this.prisma.donorProfile.delete({
      where: {
        id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'DONOR_DELETE',

        entity: 'DonorProfile',

        entityId: id,

        userId,
      },
    });

    return {
      message:
        'Donor deleted successfully',
    };
  }
}

// Alias keeps summary queries readable
// while using the existing DonationStatus enum.
const DonorDonationStatus = {
  PAID: 'PAID',
} as const;
