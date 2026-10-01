import { PartialType } from '@nestjs/mapped-types';
import { CreateQurbanAnimalDto } from './create-qurban-animal.dto';

export class UpdateQurbanAnimalDto
  extends PartialType(CreateQurbanAnimalDto) {}
