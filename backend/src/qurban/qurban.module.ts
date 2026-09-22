import { Module } from '@nestjs/common';

import { QurbanController } from './qurban.controller';
import { QurbanService } from './qurban.service';

@Module({
  controllers: [
    QurbanController,
  ],

  providers: [
    QurbanService,
  ],

  exports: [
    QurbanService,
  ],
})
export class QurbanModule {}
