import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateQurbanContributionDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
