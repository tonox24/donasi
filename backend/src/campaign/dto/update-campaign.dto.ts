import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

import { CampaignStatus } from '@prisma/client';

export class UpdateCampaignDto {
  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  slug?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  targetAmount?: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
