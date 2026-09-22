import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

import {
  QurbanAnimalType,
  QurbanPackageStatus,
} from '@prisma/client';

export class UpdateQurbanPackageDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(QurbanAnimalType)
  animalType?: QurbanAnimalType;

  @IsOptional()
  @IsInt()
  @Min(1)
  shareCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  qurbanYear?: number;

  @IsOptional()
  @IsString()
  distributionLocation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantityAvailable?: number;

  @IsOptional()
  @IsEnum(QurbanPackageStatus)
  status?: QurbanPackageStatus;
}
