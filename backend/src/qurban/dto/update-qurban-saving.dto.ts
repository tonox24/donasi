import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import {
  QurbanAnimalType,
  QurbanSavingFrequency,
  QurbanSavingStatus,
} from '@prisma/client';

export class UpdateQurbanSavingDto {
  @IsOptional()
  @IsEnum(QurbanAnimalType)
  qurbanAnimalType?: QurbanAnimalType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  targetAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  contributionAmount?: number;

  @IsOptional()
  @IsEnum(QurbanSavingFrequency)
  frequency?: QurbanSavingFrequency;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

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

  @IsOptional()
  @IsEnum(QurbanSavingStatus)
  status?: QurbanSavingStatus;
}
