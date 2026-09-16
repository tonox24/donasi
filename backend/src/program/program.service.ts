import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';

import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

@Injectable()
export class ProgramService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // CREATE
  // =========================================================
  async create(
    dto: CreateProgramDto,
    userId: string,
  ) {
    const slug = dto.slug.trim().toLowerCase();

    const existing =
      await this.prisma.program.findUnique({
        where: {
          slug,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Program slug already exists',
      );
    }

    const program =
      await this.prisma.program.create({
        data: {
          name: dto.name.trim(),
          slug,
          description:
            dto.description?.trim() || null,
          createdById: userId,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'PROGRAM_CREATE',
        entity: 'Program',
        entityId: program.id,
        userId,
        metadata: {
          name: program.name,
          slug: program.slug,
        },
      },
    });

    return program;
  }

  // =========================================================
  // FIND ALL
  // =========================================================
  async findAll() {
    return this.prisma.program.findMany({
      orderBy: {
        createdAt: 'desc',
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

  // =========================================================
  // FIND ONE
  // =========================================================
  async findOne(id: string) {
  const programId = String(id).trim();

  console.log(
    '[PROGRAM FIND ONE] Requested ID:',
    JSON.stringify(programId),
  );

  const program =
    await this.prisma.program.findUnique({
      where: {
        id: programId,
      },
      include: {
        campaigns: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            targetAmount: true,
            collectedAmount: true,
            currency: true,
          },
        },
      },
    });

  console.log(
    '[PROGRAM FIND ONE] Result:',
    program
      ? {
          id: program.id,
          name: program.name,
          slug: program.slug,
        }
      : null,
  );

  if (!program) {
    throw new NotFoundException(
      'Program not found',
    );
  }

  return program;
}

  // =========================================================
  // UPDATE
  // =========================================================
  async update(
    id: string,
    dto: UpdateProgramDto,
    userId: string,
  ) {
    const programId = id.trim();

    const existing =
      await this.prisma.program.findFirst({
        where: {
          id: programId,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Program not found',
      );
    }

    // Check duplicate slug
    if (dto.slug !== undefined) {
      const slug =
        dto.slug.trim().toLowerCase();

      const slugOwner =
        await this.prisma.program.findFirst({
          where: {
            slug,
            NOT: {
              id: programId,
            },
          },
        });

      if (slugOwner) {
        throw new ConflictException(
          'Program slug already exists',
        );
      }
    }

    const program =
      await this.prisma.program.update({
        where: {
          id: programId,
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

          ...(dto.status !== undefined && {
            status: dto.status,
          }),
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'PROGRAM_UPDATE',
        entity: 'Program',
        entityId: program.id,
        userId,
        metadata: {
          changes: {
            ...(dto.name !== undefined && {
              name: dto.name,
            }),
            ...(dto.slug !== undefined && {
              slug: dto.slug,
            }),
            ...(dto.description !== undefined && {
              description: dto.description,
            }),
            ...(dto.status !== undefined && {
              status: dto.status,
            }),
          },
        },
      },
    });

    return program;
  }

  // =========================================================
  // DELETE
  // =========================================================
  async remove(
    id: string,
    userId: string,
  ) {
    const programId = id.trim();

    const existing =
      await this.prisma.program.findFirst({
        where: {
          id: programId,
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
        'Program not found',
      );
    }

    if (existing._count.campaigns > 0) {
      throw new ConflictException(
        'Program cannot be deleted because it has campaigns',
      );
    }

    await this.prisma.program.delete({
      where: {
        id: programId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'PROGRAM_DELETE',
        entity: 'Program',
        entityId: programId,
        userId,
      },
    });

    return {
      message:
        'Program deleted successfully',
    };
  }
}
