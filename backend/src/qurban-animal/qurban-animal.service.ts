import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import {
  QurbanAnimalStatus,
  QurbanAnimalType,
} from '@prisma/client';

import { CreateQurbanAnimalDto } from './dto/create-qurban-animal.dto';
import { UpdateQurbanAnimalDto } from './dto/update-qurban-animal.dto';
import { QueryQurbanAnimalDto } from './dto/query-qurban-animal.dto';

@Injectable()
export class QurbanAnimalService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // GENERATE ANIMAL CODE
  // ==========================================

  private async generateAnimalCode(
    animalType: QurbanAnimalType,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const prefix =
      animalType === QurbanAnimalType.COW
        ? 'COW'
        : 'GOA';

    const count =
      await this.prisma.qurbanAnimal.count({
        where: {
          animalType,
          registrationDate: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });

    const sequence = String(
      count + 1,
    ).padStart(4, '0');

    return `QBN-${year}-${prefix}-${sequence}`;
  }

  // ==========================================
  // CREATE
  // ==========================================

  async create(
    dto: CreateQurbanAnimalDto,
  ) {
    const animalCode =
      await this.generateAnimalCode(
        dto.animalType,
      );

    const animal =
      await this.prisma.qurbanAnimal.create({
        data: {
          animalCode,

          qurbanOrderId:
            dto.qurbanOrderId,

          animalType:
            dto.animalType,

          breed:
            dto.breed,

          gender:
            dto.gender,

          ageMonths:
            dto.ageMonths,

          weight:
            dto.weight,

          origin:
            dto.origin,

          supplier:
            dto.supplier,

          purchasePrice:
            dto.purchasePrice,

          distributionLocation:
            dto.distributionLocation,

          notes:
            dto.notes,

          status:
            QurbanAnimalStatus.REGISTERED,
        },
      });

    return {
      success: true,
      message:
        'Qurban animal registered successfully',
      data: animal,
    };
  }

  // ==========================================
  // FIND ALL
  // ==========================================

  async findAll(
    query: QueryQurbanAnimalDto,
  ) {
    const {
      status,
      animalType,
      location,
      search,
    } = query;

    const animals =
      await this.prisma.qurbanAnimal.findMany({
        where: {
          status,
          animalType,

          distributionLocation:
            location
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
                  supplier: {
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

  // ==========================================
  // FIND ONE
  // ==========================================

  async findOne(id: string) {
    const animal =
      await this.prisma.qurbanAnimal.findUnique({
        where: {
          id,
        },
        include: {
          qurbanOrder: true,
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

  // ==========================================
  // UPDATE
  // ==========================================

  async update(
    id: string,
    dto: UpdateQurbanAnimalDto,
  ) {
    const animal =
      await this.prisma.qurbanAnimal.findUnique({
        where: {
          id,
        },
      });

    if (!animal) {
      throw new NotFoundException(
        'Qurban animal not found',
      );
    }

    // Jangan izinkan edit data setelah
    // hewan masuk tahap proses akhir.
    const lockedStatuses = [
      QurbanAnimalStatus.SLAUGHTERED,
      QurbanAnimalStatus.PROCESSED,
      QurbanAnimalStatus.DISTRIBUTED,
      QurbanAnimalStatus.COMPLETED,
    ];

    if (
      lockedStatuses.includes(
        animal.status,
      )
    ) {
      throw new BadRequestException(
        'Animal can no longer be edited at this stage',
      );
    }

    const updated =
      await this.prisma.qurbanAnimal.update({
        where: {
          id,
        },

        data: {
          qurbanOrderId:
            dto.qurbanOrderId,

          animalType:
            dto.animalType,

          breed:
            dto.breed,

          gender:
            dto.gender,

          ageMonths:
            dto.ageMonths,

          weight:
            dto.weight,

          origin:
            dto.origin,

          supplier:
            dto.supplier,

          purchasePrice:
            dto.purchasePrice,

          distributionLocation:
            dto.distributionLocation,

          notes:
            dto.notes,
        },
      });

    return {
      success: true,
      message:
        'Qurban animal updated successfully',
      data: updated,
    };
  }
}
