import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { QurbanDocumentationService } from './qurban-documentation.service';

import { CreateQurbanDocumentationDto } from './dto/create-qurban-documentation.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('qurban')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class QurbanDocumentationController {
  constructor(
    private readonly documentationService: QurbanDocumentationService,
  ) {}

  // =========================================================
  // CREATE DOCUMENTATION FOR ANIMAL
  // =========================================================

  @Post('animals/:animalId/documentations')
  @Permissions('qurban.manage')
  create(
    @Param('animalId') animalId: string,

    @Body()
    dto: CreateQurbanDocumentationDto,

    @CurrentUser()
    user: { id: string },
  ) {
    return this.documentationService.create(
      animalId,
      dto,
      user.id,
    );
  }

  // =========================================================
  // GET DOCUMENTATION BY ANIMAL
  // =========================================================

  @Get('animals/:animalId/documentations')
  @Permissions('qurban.view')
  findByAnimal(
    @Param('animalId') animalId: string,
  ) {
    return this.documentationService.findByAnimal(
      animalId,
    );
  }

  // =========================================================
  // GET DOCUMENTATION DETAIL
  // =========================================================

  @Get('documentations/:id')
  @Permissions('qurban.view')
  findOne(
    @Param('id') id: string,
  ) {
    return this.documentationService.findOne(id);
  }
}
