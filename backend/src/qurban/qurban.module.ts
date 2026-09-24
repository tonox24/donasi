import { Module } from '@nestjs/common';

import { QurbanController } from './qurban.controller';
import { QurbanService } from './qurban.service';
import { QurbanAnimalController } from './qurban-animal.controller';
import { QurbanAnimalService } from './qurban-animal.service';

@Module({
  controllers: [
    QurbanController,
    QurbanAnimalController,
  ],

  providers: [
    QurbanService,
    QurbanAnimalService,
  ],

  exports: [
    QurbanService,
    QurbanAnimalService,
  ],
})
export class QurbanModule {}
