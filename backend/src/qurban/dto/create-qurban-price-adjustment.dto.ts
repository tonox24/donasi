import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateQurbanPriceAdjustmentDto {
  @IsNumber()
  @Min(1)
  finalAmount!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
