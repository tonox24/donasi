import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;
}
