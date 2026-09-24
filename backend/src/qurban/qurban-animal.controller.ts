import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { QurbanAnimalStatus } from '@prisma/client';

import { QurbanAnimalService } from './qurban-animal.service';

import { CreateQurbanAnimalDto } from './dto/create-qurban-animal.dto';
import { UpdateQurbanAnimalDto } from './dto/update-qurban-animal.dto';
import { UpdateQurbanAnimalStatusDto } from './dto/update-qurban-animal-status.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('qurban/animals')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class QurbanAnimalController {
  constructor(
    private readonly animalService: QurbanAnimalService,
  ) {}

  // =========================================================
  // GET ALL
  // =========================================================

  @Get()
  @Permissions('qurban.view')
  findAll() {
    return this.animalService.findAll();
  }

  // =========================================================
  // GET ONE
  // =========================================================

  @Get(':id')
  @Permissions('qurban.view')
  findOne(
    @Param('id') id: string,
  ) {
    return this.animalService.findOne(id);
  }

  // =========================================================
  // CREATE
  // =========================================================

  @Post()
  @Permissions('qurban.manage')
  create(
    @Body()
    dto: CreateQurbanAnimalDto,

    @CurrentUser()
    user: { id: string },
  ) {
    return this.animalService.create(
      dto,
      user.id,
    );
  }

  // =========================================================
  // UPDATE
  // =========================================================

  @Patch(':id')
  @Permissions('qurban.manage')
  update(
    @Param('id') id: string,

    @Body()
    dto: UpdateQurbanAnimalDto,

    @CurrentUser()
    user: { id: string },
  ) {
    return this.animalService.update(
      id,
      dto,
      user.id,
    );
  }

  // =========================================================
  // STATUS
  // =========================================================

  @Post(':id/status')
  @Permissions('qurban.manage')
  updateStatus(
    @Param('id') id: string,

    @Body()
    dto: UpdateQurbanAnimalStatusDto,

    @CurrentUser()
    user: { id: string },
  ) {
    return this.animalService.updateStatus(
      id,
      dto.status,
      user.id,
    );
  }

  // =========================================================
  // DELETE
  // =========================================================

  @Delete(':id')
  @Permissions('qurban.manage')
  remove(
    @Param('id') id: string,

    @CurrentUser()
    user: { id: string },
  ) {
    return this.animalService.remove(
      id,
      user.id,
    );
  }
}
