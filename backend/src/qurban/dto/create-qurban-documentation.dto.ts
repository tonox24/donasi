import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

import { QurbanDocumentationType } from '@prisma/client';

export class CreateQurbanDocumentationDto {
  @IsEnum(QurbanDocumentationType)
  type!: QurbanDocumentationType;

  @IsUrl()
  @IsNotEmpty()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsDateString()
  takenAt?: string;
}
