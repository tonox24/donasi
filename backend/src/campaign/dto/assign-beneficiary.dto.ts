import { IsUUID } from 'class-validator';

export class AssignBeneficiaryDto {
  @IsUUID()
  beneficiaryId!: string;
}
