import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  QurbanAnimalStatus,
  QurbanAnimalType,
} from '@prisma/client';

export class QueryQurbanAnimalDto {
  @IsOptional()
  @IsEnum(QurbanAnimalStatus)
  status?: QurbanAnimalStatus;

  @IsOptional()
  @IsEnum(QurbanAnimalType)
  animalType?: QurbanAnimalType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
