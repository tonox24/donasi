import {
  IsEnum,
} from 'class-validator';

import { DonorStatus } from '@prisma/client';

export class UpdateDonorStatusDto {
  @IsEnum(DonorStatus)
  status!: DonorStatus;
}
