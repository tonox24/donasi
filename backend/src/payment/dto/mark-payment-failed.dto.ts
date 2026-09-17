import { IsObject, IsOptional, IsString } from 'class-validator';

export class MarkPaymentFailedDto {
  @IsOptional()
  @IsString()
  providerTransactionId?: string;

  @IsOptional()
  @IsObject()
  rawResponse?: Record<string, unknown>;
}
