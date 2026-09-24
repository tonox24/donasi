import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateQurbanOrderDto {
  @IsUUID()
  @IsNotEmpty()
  donorId!: string;

  @IsUUID()
  @IsNotEmpty()
  qurbanPackageId!: string;

  @IsOptional()
  @IsUUID()
  savingPlanId?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  shareCount!: number;

  @IsString()
  @IsNotEmpty()
  pekurbanName!: string;

  @IsOptional()
  @IsString()
  donorName?: string;

  @IsOptional()
  @IsEmail()
  donorEmail?: string;

  @IsOptional()
  @IsString()
  donorPhone?: string;

  @IsOptional()
  @IsString()
  distributionLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
