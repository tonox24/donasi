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

import { ProgramService } from './program.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';

@Controller('programs')
export class ProgramController {
  constructor(
    private readonly programService: ProgramService,
  ) {}

  @Get()
  findAll() {
    return this.programService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.programService.findOne(id);
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('program.create')
  @Post()
  create(
    @Body() dto: CreateProgramDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.programService.create(
      dto,
      user.id,
    );
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('program.update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.programService.update(
      id,
      dto,
      user.id,
    );
  }

  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('program.delete')
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.programService.remove(
      id,
      user.id,
    );
  }
}
