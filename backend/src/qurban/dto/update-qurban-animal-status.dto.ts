import { IsEnum } from 'class-validator';

import { QurbanAnimalStatus } from '@prisma/client';

export class UpdateQurbanAnimalStatusDto {
  @IsEnum(QurbanAnimalStatus)
  status!: QurbanAnimalStatus;
}
