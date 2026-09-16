import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsNumber,
} from 'class-validator';

export class CreateDonationDto {
  @IsUUID()
  @IsNotEmpty()
  campaignId!: string;

  @IsNumber()
  @Min(20000)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  donorName!: string;

  @IsOptional()
  @IsEmail()
  donorEmail?: string;

  @IsOptional()
  @IsString()
  donorPhone?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
