import { Module } from '@nestjs/common';

import { QurbanController } from './qurban.controller';
import { QurbanService } from './qurban.service';

import { QurbanAnimalController } from './qurban-animal.controller';
import { QurbanAnimalService } from './qurban-animal.service';

import { QurbanDocumentationController } from './qurban-documentation.controller';
import { QurbanDocumentationService } from './qurban-documentation.service';

@Module({
  controllers: [
    QurbanController,
    QurbanAnimalController,
    QurbanDocumentationController,
  ],

  providers: [
    QurbanService,
    QurbanAnimalService,
    QurbanDocumentationService,
  ],

  exports: [
    QurbanService,
    QurbanAnimalService,
    QurbanDocumentationService,
  ],
})
export class QurbanModule {}
