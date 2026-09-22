import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

import { QurbanAnimalType } from '@prisma/client';

export class CreateQurbanPackageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(QurbanAnimalType)
  animalType!: QurbanAnimalType;

  @IsOptional()
  @IsInt()
  @Min(1)
  shareCount?: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsInt()
  @Min(2000)
  qurbanYear!: number;

  @IsOptional()
  @IsString()
  distributionLocation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantityAvailable?: number;
}
