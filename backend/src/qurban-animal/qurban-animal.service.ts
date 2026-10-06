
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  QurbanAnimalStatus,
  QurbanAnimalType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma.service';

import { CreateQurbanAnimalDto } from './dto/create-qurban-animal.dto';
import { UpdateQurbanAnimalDto } from './dto/update-qurban-animal.dto';
import { QueryQurbanAnimalDto } from './dto/query-qurban-animal.dto';

@Injectable()
export class QurbanAnimalService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async generateAnimalCode(
    animalType: QurbanAnimalType,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const prefix =
      animalType === QurbanAnimalType.COW
        ? 'COW'
        : animalType === QurbanAnimalType.SHEEP
          ? 'SHE'
          : 'GOA';

    const count = await this.prisma.qurbanAnimal.count({
      where: {
        animalType,
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
      },
    });

    return `QBN-${year}-${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(
    dto: CreateQurbanAnimalDto,
    createdById: string,
  ) {
    if (!createdById) {
      throw new BadRequestException(
        'Authenticated user ID is required',
      );
    }

    const order = await this.prisma.qurbanOrder.findUnique({
      where: {
        id: dto.qurbanOrderId,
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Qurban order not found',
      );
    }

    const animalCode = await this.generateAnimalCode(
      dto.animalType,
    );

    const animal = await this.prisma.qurbanAnimal.create({
      data: {
        animalCode,
        qurbanOrderId: dto.qurbanOrderId,
        animalType: dto.animalType,
        ageMonths: dto.ageMonths,
        weightKg: dto.weightKg,
        sex: dto.sex,
        healthStatus: dto.healthStatus,
        location: dto.location,
        notes: dto.notes,
        createdById,
        status: QurbanAnimalStatus.REGISTERED,
      },
    });

    return {
      success: true,
      message: 'Qurban animal registered successfully',
      data: animal,
    };
  }

  async findAll(query: QueryQurbanAnimalDto) {
    const {
      status,
      animalType,
      location,
      search,
    } = query;

    const animals = await this.prisma.qurbanAnimal.findMany({
      where: {
        status,
        animalType,

        location: location
          ? {
              contains: location,
              mode: 'insensitive',
            }
          : undefined,

        OR: search
          ? [
              {
                animalCode: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                location: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                healthStatus: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: animals,
    };
  }

  async findOne(id: string) {
    const animal = await this.prisma.qurbanAnimal.findUnique({
      where: {
        id,
      },
      include: {
        qurbanOrder: true,
        documentations: true,
      },
    });

    if (!animal) {
      throw new NotFoundException(
        'Qurban animal not found',
      );
    }

    return {
      success: true,
      data: animal,
    };
  }

  async update(
    id: string,
    dto: UpdateQurbanAnimalDto,
  ) {
    const animal = await this.prisma.qurbanAnimal.findUnique({
      where: {
        id,
      },
    });

    if (!animal) {
      throw new NotFoundException(
        'Qurban animal not found',
      );
    }

    const lockedStatuses: QurbanAnimalStatus[] = [
      QurbanAnimalStatus.SLAUGHTERED,
      QurbanAnimalStatus.PROCESSED,
      QurbanAnimalStatus.DISTRIBUTED,
      QurbanAnimalStatus.CANCELLED,
    ];

    if (lockedStatuses.includes(animal.status)) {
      throw new BadRequestException(
        'Animal can no longer be edited at this stage',
      );
    }

    if (dto.qurbanOrderId) {
      const order = await this.prisma.qurbanOrder.findUnique({
        where: {
          id: dto.qurbanOrderId,
        },
      });

      if (!order) {
        throw new NotFoundException(
          'Qurban order not found',
        );
      }
    }

    const data: Prisma.QurbanAnimalUpdateInput = {
      ...(dto.qurbanOrderId !== undefined && {
        qurbanOrder: {
          connect: {
            id: dto.qurbanOrderId,
          },
        },
      }),

      ...(dto.animalType !== undefined && {
        animalType: dto.animalType,
      }),

      ...(dto.ageMonths !== undefined && {
        ageMonths: dto.ageMonths,
      }),

      ...(dto.weightKg !== undefined && {
        weightKg: dto.weightKg,
      }),

      ...(dto.sex !== undefined && {
        sex: dto.sex,
      }),

      ...(dto.healthStatus !== undefined && {
        healthStatus: dto.healthStatus,
      }),

      ...(dto.location !== undefined && {
        location: dto.location,
      }),

      ...(dto.notes !== undefined && {
        notes: dto.notes,
      }),
    };

    const updated = await this.prisma.qurbanAnimal.update({
      where: {
        id,
      },
      data,
    });

    return {
      success: true,
      message: 'Qurban animal updated successfully',
      data: updated,
    };
  }
}
