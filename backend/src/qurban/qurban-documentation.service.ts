import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  QurbanAnimalStatus,
  QurbanDocumentationType,
} from '@prisma/client';

import { PrismaService } from '../prisma.service';

import { CreateQurbanDocumentationDto } from './dto/create-qurban-documentation.dto';

@Injectable()
export class QurbanDocumentationService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // CREATE DOCUMENTATION
  // =========================================================

  async create(
    animalId: string,
    dto: CreateQurbanDocumentationDto,
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const animal =
          await tx.qurbanAnimal.findUnique({
            where: {
              id: animalId.trim(),
            },

            include: {
              qurbanOrder: {
                select: {
                  id: true,
                  orderNumber: true,
                },
              },
            },
          });

        if (!animal) {
          throw new NotFoundException(
            'Qurban animal not found',
          );
        }

        if (
          animal.status ===
            QurbanAnimalStatus.CANCELLED
        ) {
          throw new ConflictException(
            'Documentation cannot be added to cancelled animal',
          );
        }

        // -----------------------------------------------------
        // VALIDATE DOCUMENTATION TYPE
        // -----------------------------------------------------

        if (
          dto.type ===
            QurbanDocumentationType.BEFORE_SLAUGHTER
        ) {
          if (
            animal.status !==
              QurbanAnimalStatus.REGISTERED &&
            animal.status !==
              QurbanAnimalStatus.VERIFIED
          ) {
            throw new ConflictException(
              'BEFORE_SLAUGHTER documentation can only be added before slaughter',
            );
          }
        }

        if (
          dto.type ===
            QurbanDocumentationType.SLAUGHTER
        ) {
          if (
            animal.status !==
              QurbanAnimalStatus.SLAUGHTERED &&
            animal.status !==
              QurbanAnimalStatus.PROCESSED &&
            animal.status !==
              QurbanAnimalStatus.DISTRIBUTED
          ) {
            throw new ConflictException(
              'SLAUGHTER documentation requires the animal to be slaughtered',
            );
          }
        }

        if (
          dto.type ===
            QurbanDocumentationType.AFTER_SLAUGHTER
        ) {
          if (
            animal.status !==
              QurbanAnimalStatus.SLAUGHTERED &&
            animal.status !==
              QurbanAnimalStatus.PROCESSED &&
            animal.status !==
              QurbanAnimalStatus.DISTRIBUTED
          ) {
            throw new ConflictException(
              'AFTER_SLAUGHTER documentation requires the animal to be slaughtered',
            );
          }
        }

        if (
          dto.type ===
            QurbanDocumentationType.DISTRIBUTION
        ) {
          if (
            animal.status !==
            QurbanAnimalStatus.DISTRIBUTED
          ) {
            throw new ConflictException(
              'DISTRIBUTION documentation requires the animal to be distributed',
            );
          }
        }

        // -----------------------------------------------------
        // CREATE DOCUMENTATION
        // -----------------------------------------------------

        const documentation =
          await tx.qurbanDocumentation.create({
            data: {
              qurbanOrderId:
                animal.qurbanOrderId,

              qurbanAnimalId:
                animal.id,

              type:
                dto.type,

              fileUrl:
                dto.fileUrl.trim(),

              title:
                dto.title?.trim() || null,

              caption:
                dto.caption?.trim() || null,

              takenAt:
                dto.takenAt
                  ? new Date(dto.takenAt)
                  : null,

              createdById:
                userId,
            },

            include: {
              qurbanAnimal: {
                select: {
                  id: true,
                  animalCode: true,
                  animalType: true,
                  status: true,
                },
              },

              qurbanOrder: {
                select: {
                  id: true,
                  orderNumber: true,
                  pekurbanName: true,
                  donorName: true,
                  qurbanYear: true,
                },
              },

              createdBy: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          });

        // -----------------------------------------------------
        // AUDIT LOG
        // -----------------------------------------------------

        await tx.auditLog.create({
          data: {
            userId,

            action:
              'QURBAN_DOCUMENTATION_CREATED',

            entity:
              'QurbanDocumentation',

            entityId:
              documentation.id,

            metadata: {
              qurbanOrderId:
                animal.qurbanOrderId,

              qurbanAnimalId:
                animal.id,

              animalCode:
                animal.animalCode,

              documentationType:
                dto.type,

              fileUrl:
                dto.fileUrl,

              title:
                dto.title?.trim() ||
                null,
            } as Prisma.InputJsonObject,
          },
        });

        return documentation;
      },
    );
  }

  // =========================================================
  // FIND ALL DOCUMENTATION FOR ANIMAL
  // =========================================================

  async findByAnimal(
    animalId: string,
  ) {
    const animal =
      await this.prisma.qurbanAnimal.findUnique({
        where: {
          id: animalId.trim(),
        },

        select: {
          id: true,
          animalCode: true,
        },
      });

    if (!animal) {
      throw new NotFoundException(
        'Qurban animal not found',
      );
    }

    return this.prisma.qurbanDocumentation.findMany({
      where: {
        qurbanAnimalId: animal.id,
      },

      orderBy: [
        {
          type: 'asc',
        },
        {
          takenAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],

      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  // =========================================================
  // FIND ONE
  // =========================================================

  async findOne(
    id: string,
  ) {
    const documentation =
      await this.prisma.qurbanDocumentation.findUnique({
        where: {
          id: id.trim(),
        },

        include: {
          qurbanAnimal: {
            select: {
              id: true,
              animalCode: true,
              animalType: true,
              status: true,
              location: true,
            },
          },

          qurbanOrder: {
            select: {
              id: true,
              orderNumber: true,
              pekurbanName: true,
              donorName: true,
              qurbanYear: true,
              distributionLocation: true,
            },
          },

          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

    if (!documentation) {
      throw new NotFoundException(
        'Qurban documentation not found',
      );
    }

    return documentation;
  }
}
