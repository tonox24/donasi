import { Prisma } from '@prisma/client';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class MarkPaymentPaidDto {
  @IsString()
  @IsNotEmpty()
  providerTransactionId!: string;

  @IsOptional()
  rawResponse?: Prisma.InputJsonValue;
}
