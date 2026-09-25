import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import {
  QurbanAnimalType,
  QurbanSavingFrequency,
} from '@prisma/client';

export class CreateQurbanSavingDto {
  @IsUUID()
  donorId!: string;

  @IsEnum(QurbanAnimalType)
  qurbanAnimalType!: QurbanAnimalType;

  @IsNumber()
  @Min(1)
  targetAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  contributionAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bufferPercentage?: number;

  @IsEnum(QurbanSavingFrequency)
  frequency!: QurbanSavingFrequency;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  targetDate!: string;

  @IsOptional()
  @IsString()
  distributionLocation?: string;

  @IsOptional()
  @IsString()
  pekurbanName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
