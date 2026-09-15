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

  async create(
    dto: CreateProgramDto,
    userId: string,
  ) {
    const existing =
      await this.prisma.program.findUnique({
        where: {
          slug: dto.slug,
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
          slug: dto.slug.trim().toLowerCase(),
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

  async findOne(id: string) {
    const program =
      await this.prisma.program.findUnique({
        where: {
          id,
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

    if (!program) {
      throw new NotFoundException(
        'Program not found',
      );
    }

    return program;
  }

  async update(
    id: string,
    dto: UpdateProgramDto,
    userId: string,
  ) {
    const existing =
      await this.prisma.program.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Program not found',
      );
    }

    if (dto.slug) {
      const slugOwner =
        await this.prisma.program.findFirst({
          where: {
            slug: dto.slug.trim().toLowerCase(),
            NOT: {
              id,
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
          id,
        },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),
          ...(dto.slug !== undefined && {
            slug: dto.slug.trim().toLowerCase(),
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
          changes: dto,
        },
      },
    });

    return program;
  }

  async remove(
    id: string,
    userId: string,
  ) {
    const existing =
      await this.prisma.program.findUnique({
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
        id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'PROGRAM_DELETE',
        entity: 'Program',
        entityId: id,
        userId,
      },
    });

    return {
      message: 'Program deleted successfully',
    };
  }
}
