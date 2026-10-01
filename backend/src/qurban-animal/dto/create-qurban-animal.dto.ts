import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import {
  QurbanAnimalGender,
  QurbanAnimalType,
} from '@prisma/client';

export class CreateQurbanAnimalDto {
  @IsOptional()
  @IsUUID()
  qurbanOrderId?: string;

  @IsEnum(QurbanAnimalType)
  animalType: QurbanAnimalType;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsEnum(QurbanAnimalGender)
  gender?: QurbanAnimalGender;

  @IsOptional()
  @IsNumber()
  @Min(1)
  ageMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @IsString()
  distributionLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
