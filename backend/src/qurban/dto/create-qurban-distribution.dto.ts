import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateQurbanDistributionDto {
  @IsUUID()
  qurbanOrderId!: string;

  @IsString()
  location!: string;

  @IsOptional()
  @IsDateString()
  distributionDate?: string;

  @IsInt()
  @Min(1)
  packageQuantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
