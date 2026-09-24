import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateQurbanDistributionBeneficiaryDto {
  @IsUUID()
  beneficiaryId!: string;

  @IsInt()
  @Min(1)
  packageQuantity!: number;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
