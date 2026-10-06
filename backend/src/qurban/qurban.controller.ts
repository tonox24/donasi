```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { QurbanService } from './qurban.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

import { QurbanDocumentationService } from './qurban-documentation.service';
import { CreateQurbanDocumentationDto } from './dto/create-qurban-documentation.dto';

@Controller('qurban')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QurbanController {
  constructor(
    private readonly qurbanService: QurbanService,
    private readonly documentationService: QurbanDocumentationService,
  ) {}

  // =========================================================
  // QURBAN ORDER REPORT
  // GET /api/qurban/orders/:orderId/report
  // =========================================================

  @Get('orders/:orderId/report')
  @Permissions('qurban.view')
  getOrderReport(
    @Param('orderId') orderId: string,
  ) {
    return this.qurbanService.getOrderReport(orderId);
  }

  // =========================================================
  // QURBAN DISTRIBUTION REPORT
  // GET /api/qurban/distributions/:id/report
  // =========================================================

  @Get('distributions/:id/report')
  @Permissions('qurban.view')
  getDistributionReport(
    @Param('id') id: string,
  ) {
    return this.qurbanService.getDistributionReport(id);
  }

  // =========================================================
  // CREATE ANIMAL DOCUMENTATION
  // POST /api/qurban/animals/:animalId/documentations
  // =========================================================

  @Post('animals/:animalId/documentations')
  @Permissions('qurban.manage')
  createAnimalDocumentation(
    @Param('animalId') animalId: string,
    @Body() dto: CreateQurbanDocumentationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.documentationService.create(
      animalId,
      dto,
      user.id,
    );
  }

  // =========================================================
  // GET DOCUMENTATION BY ANIMAL
  // GET /api/qurban/animals/:animalId/documentations
  // =========================================================

  @Get('animals/:animalId/documentations')
  @Permissions('qurban.view')
  getAnimalDocumentations(
    @Param('animalId') animalId: string,
  ) {
    return this.documentationService.findByAnimal(animalId);
  }

  // =========================================================
  // GET DOCUMENTATION DETAIL
  // GET /api/qurban/documentations/:id
  // =========================================================

  @Get('documentations/:id')
  @Permissions('qurban.view')
  getDocumentationDetail(
    @Param('id') id: string,
  ) {
    return this.documentationService.findOne(id);
  }
}
```
