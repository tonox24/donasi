import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { QurbanAnimalType } from '@prisma/client';

export class CreateQurbanAnimalDto {
  @IsUUID()
  qurbanOrderId!: string;

  @IsEnum(QurbanAnimalType)
  animalType!: QurbanAnimalType;

  @IsOptional()
  @IsInt()
  @Min(1)
  ageMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsString()
  healthStatus?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
