import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import {
  FinanceLedgerStatus,
  FinanceLedgerType,
} from '@prisma/client';

export class FinanceQueryDto {
  @IsOptional()
  @IsEnum(FinanceLedgerType)
  type?: FinanceLedgerType;

  @IsOptional()
  @IsEnum(FinanceLedgerStatus)
  status?: FinanceLedgerStatus;

  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @IsOptional()
  @IsUUID()
  donationId?: string;

  @IsOptional()
  @IsUUID()
  paymentTransactionId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
