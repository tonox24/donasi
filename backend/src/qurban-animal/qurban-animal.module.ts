import { Module } from '@nestjs/common';

import { QurbanAnimalController } from './qurban-animal.controller';
import { QurbanAnimalService } from './qurban-animal.service';

@Module({
  controllers: [QurbanAnimalController],
  providers: [QurbanAnimalService],
  exports: [QurbanAnimalService],
})
export class QurbanAnimalModule {}
