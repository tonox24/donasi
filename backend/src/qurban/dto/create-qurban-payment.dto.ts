import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateQurbanPaymentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  provider?: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;
}
