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
  rawResponse?: Record<string, unknown>;
}
