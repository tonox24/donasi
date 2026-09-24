import {
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { QurbanDistributionStatus } from '@prisma/client';

export class UpdateQurbanDistributionStatusDto {
  @IsEnum(QurbanDistributionStatus)
  status!: QurbanDistributionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
