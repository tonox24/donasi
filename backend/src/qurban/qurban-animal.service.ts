import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service';

import {
  Prisma,
  QurbanAnimalStatus,
} from '@prisma/client';

import { CreateQurbanAnimalDto } from './dto/create-qurban-animal.dto';
import { UpdateQurbanAnimalDto } from './dto/update-qurban-animal.dto';

@Injectable()
export class QurbanAnimalService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // GENERATE ANIMAL CODE
  // =========================================================

  private async generateAnimalCode(
    tx: Prisma.TransactionClient,
    animalType: string,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const prefix = `QAN-${year}-${animalType}`;

    const lastAnimal =
      await tx.qurbanAnimal.findFirst({
        where: {
          animalCode: {
            startsWith: `${prefix}-`,
          },
        },
        orderBy: {
          animalCode: 'desc',
        },
        select: {
          animalCode: true,
        },
      });

    let sequence = 1;

    if (lastAnimal) {
      const match =
        lastAnimal.animalCode.match(
          /-(\d+)$/,
        );

      if (match) {
        sequence =
          Number(match[1]) + 1;
      }
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  // =========================================================
  // CREATE
  // =========================================================

  async create(
    dto: CreateQurbanAnimalDto,
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const order =
          await tx.qurbanOrder.findUnique({
            where: {
              id: dto.qurbanOrderId,
            },
          });

        if (!order) {
          throw new NotFoundException(
            'Qurban order not found',
          );
        }

        if (
          order.status === 'CANCELLED' ||
          order.status === 'REFUNDED'
        ) {
          throw new ConflictException(
            'Animal cannot be registered for cancelled or refunded order',
          );
        }

        const animalCode =
          await this.generateAnimalCode(
            tx,
            dto.animalType,
          );

        const animal =
          await tx.qurbanAnimal.create({
            data: {
              animalCode,

              qurbanOrderId:
                dto.qurbanOrderId,

              animalType:
                dto.animalType,

              ageMonths:
                dto.ageMonths,

              weightKg:
                dto.weightKg !== undefined
                  ? new Prisma.Decimal(
                      dto.weightKg,
                    )
                  : undefined,

              sex: dto.sex,

              healthStatus:
                dto.healthStatus,

              location:
                dto.location,

              notes: dto.notes,

              status:
                QurbanAnimalStatus.REGISTERED,

              createdById: userId,
            },
          });

        await tx.auditLog.create({
          data: {
            userId,
            action:
              'QURBAN_ANIMAL_CREATED',
            entity: 'QurbanAnimal',
            entityId: animal.id,
            metadata: {
              animalCode:
                animal.animalCode,
              qurbanOrderId:
                animal.qurbanOrderId,
              animalType:
                animal.animalType,
            },
          },
        });

        return animal;
      },
    );
  }

  // =========================================================
  // FIND ALL
  // =========================================================

  async findAll() {
    return this.prisma.qurbanAnimal.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        qurbanOrder: {
          select: {
            id: true,
            orderNumber: true,
            donorName: true,
            pekurbanName: true,
            qurbanYear: true,
            status: true,
          },
        },

        documentations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  // =========================================================
  // FIND ONE
  // =========================================================

  async findOne(id: string) {
    const animal =
      await this.prisma.qurbanAnimal.findUnique({
        where: {
          id: id.trim(),
        },

        include: {
          qurbanOrder: {
            select: {
              id: true,
              orderNumber: true,
              donorName: true,
              donorEmail: true,
              donorPhone: true,
              pekurbanName: true,
              animalType: true,
              qurbanYear: true,
              distributionLocation: true,
              status: true,
            },
          },
        
          documentations: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

    if (!animal) {
      throw new NotFoundException(
        'Qurban animal not found',
      );
    }

    return animal;
  }

  // =========================================================
  // UPDATE
  // =========================================================

  async update(
    id: string,
    dto: UpdateQurbanAnimalDto,
    userId: string,
  ) {
    const animal =
      await this.prisma.qurbanAnimal.findUnique({
        where: {
          id: id.trim(),
        },
      });

    if (!animal) {
      throw new NotFoundException(
        'Qurban animal not found',
      );
    }

    if (
        animal.status === QurbanAnimalStatus.DISTRIBUTED ||
        animal.status === QurbanAnimalStatus.CANCELLED
      ) {
        throw new ConflictException(
          'Distributed or cancelled animal cannot be updated',
        );
      }

    const updated =
      await this.prisma.qurbanAnimal.update({
        where: {
          id: animal.id,
        },

        data: {
          animalType:
            dto.animalType,

          ageMonths:
            dto.ageMonths,

          weightKg:
            dto.weightKg !== undefined
              ? new Prisma.Decimal(
                  dto.weightKg,
                )
              : undefined,

          sex:
            dto.sex,

          healthStatus:
            dto.healthStatus,

          location:
            dto.location,

          notes:
            dto.notes,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action:
          'QURBAN_ANIMAL_UPDATED',
        entity: 'QurbanAnimal',
        entityId: updated.id,
        metadata: {
          animalCode:
            updated.animalCode,
        },
      },
    });

    return updated;
  }

  // =========================================================
  // STATUS WORKFLOW
  // =========================================================

  async updateStatus(
    id: string,
    status: QurbanAnimalStatus,
    userId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const animal =
          await tx.qurbanAnimal.findUnique({
            where: {
              id: id.trim(),
            },
          });

        if (!animal) {
          throw new NotFoundException(
            'Qurban animal not found',
          );
        }

       const allowedTransitions: Record<
            QurbanAnimalStatus,
            QurbanAnimalStatus[]
          > = {
            [QurbanAnimalStatus.REGISTERED]: [
              QurbanAnimalStatus.VERIFIED,
              QurbanAnimalStatus.CANCELLED,
            ],
          
            [QurbanAnimalStatus.VERIFIED]: [
              QurbanAnimalStatus.SLAUGHTERED,
              QurbanAnimalStatus.CANCELLED,
            ],
          
            [QurbanAnimalStatus.SLAUGHTERED]: [
              QurbanAnimalStatus.PROCESSED,
            ],
          
            [QurbanAnimalStatus.PROCESSED]: [
              QurbanAnimalStatus.DISTRIBUTED,
            ],
          
            [QurbanAnimalStatus.DISTRIBUTED]: [],
          
            [QurbanAnimalStatus.CANCELLED]: [],
          };
          
          const allowedNextStatuses: QurbanAnimalStatus[] =
            allowedTransitions[animal.status];
          
          if (!allowedNextStatuses.includes(status)) {
            throw new ConflictException(
              `Invalid animal status transition: ${animal.status} -> ${status}`,
            );
          }

        const now = new Date();

        const data:
          Prisma.QurbanAnimalUpdateInput = {
          status,
        };

        if (
          status ===
          QurbanAnimalStatus.VERIFIED
        ) {
          data.verifiedAt = now;
        }

        if (
          status ===
          QurbanAnimalStatus.SLAUGHTERED
        ) {
          data.slaughteredAt = now;
        }

        if (
          status ===
          QurbanAnimalStatus.PROCESSED
        ) {
          data.processedAt = now;
        }

        if (
          status ===
          QurbanAnimalStatus.DISTRIBUTED
        ) {
          data.distributedAt = now;
        }

        const updated =
          await tx.qurbanAnimal.update({
            where: {
              id: animal.id,
            },

            data,
          });

        await tx.auditLog.create({
          data: {
            userId,

            action:
              'QURBAN_ANIMAL_STATUS_CHANGED',

            entity:
              'QurbanAnimal',

            entityId:
              animal.id,

            metadata: {
              animalCode:
                animal.animalCode,

              from:
                animal.status,

              to:
                status,
            },
          },
        });

        return updated;
      },
    );
  }

  // =========================================================
  // DELETE
  // =========================================================

  async remove(
    id: string,
    userId: string,
  ) {
    const animal =
      await this.prisma.qurbanAnimal.findUnique({
        where: {
          id: id.trim(),
        },

        include: {
          documentations: true,
        },
      });

    if (!animal) {
      throw new NotFoundException(
        'Qurban animal not found',
      );
    }

    if (
      animal.status !==
      QurbanAnimalStatus.REGISTERED
    ) {
      throw new ConflictException(
        'Only registered animals can be deleted',
      );
    }

    if (
      animal.documentations.length > 0
    ) {
      throw new ConflictException(
        'Animal with documentation cannot be deleted',
      );
    }

    await this.prisma.qurbanAnimal.delete({
      where: {
        id: animal.id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action:
          'QURBAN_ANIMAL_DELETED',
        entity: 'QurbanAnimal',
        entityId: animal.id,
        metadata: {
          animalCode:
            animal.animalCode,
        },
      },
    });

    return {
      message:
        'Qurban animal deleted successfully',
    };
  }
}
