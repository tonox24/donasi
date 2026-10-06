
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import { QurbanAnimalService } from './qurban-animal.service';

import { CreateQurbanAnimalDto } from './dto/create-qurban-animal.dto';
import { UpdateQurbanAnimalDto } from './dto/update-qurban-animal.dto';
import { QueryQurbanAnimalDto } from './dto/query-qurban-animal.dto';

interface AuthenticatedRequest {
  user?: {
    id?: string;
    sub?: string;
  };
}

@Controller('qurban/animals')
export class QurbanAnimalController {
  constructor(
    private readonly qurbanAnimalService: QurbanAnimalService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateQurbanAnimalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const createdById =
      req.user?.id ?? req.user?.sub;

    return this.qurbanAnimalService.create(
      dto,
      createdById ?? '',
    );
  }

  @Get()
  findAll(
    @Query() query: QueryQurbanAnimalDto,
  ) {
    return this.qurbanAnimalService.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.qurbanAnimalService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQurbanAnimalDto,
  ) {
    return this.qurbanAnimalService.update(id, dto);
  }
}
